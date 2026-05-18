import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, RefreshCw, TrendingUp, Package, Receipt, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Price {
  metal: string;
  price_per_gram: number;
  price_per_tola: number;
  fetched_at: string;
  source?: string;
}

function Dashboard() {
  const { t, lang } = useI18n();
  const [prices, setPrices] = useState<Price[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ products: 0, customers: 0, salesToday: 0, totalToday: 0 });
  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("app_theme") || "default" : "default",
  );

  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem("app_theme") || "default");
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  async function loadPrices() {
    const { data } = await supabase
      .from("metal_prices")
      .select("metal, price_per_gram, price_per_tola, fetched_at, source")
      .order("fetched_at", { ascending: false })
      .limit(10);
    const seen = new Set<string>();
    const latest: Price[] = [];
    for (const p of data ?? []) {
      if (!seen.has(p.metal)) {
        seen.add(p.metal);
        latest.push(p as Price);
      }
    }
    setPrices(latest);
  }
  async function refreshPrices() {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-metal-prices");
      if (error) throw error;
      toast.success("Prices updated");
      await loadPrices();
    } catch (e) {
      toast.error("Failed to fetch prices: " + (e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }
  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10);
    const [{ count: pc }, { count: cc }, { data: sd }] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("sales").select("total").eq("sale_date", today),
    ]);
    setStats({
      products: pc ?? 0,
      customers: cc ?? 0,
      salesToday: sd?.length ?? 0,
      totalToday: (sd ?? []).reduce((s, r) => s + Number(r.total), 0),
    });
  }
  useEffect(() => {
    loadPrices();
    loadStats();
    // Auto-refresh once on mount if prices stale (>1h)
    supabase
      .from("metal_prices")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const stale = !data || Date.now() - new Date(data.fetched_at).getTime() > 3600_000;
        if (stale) refreshPrices();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t.dashboard}</h1>
        <Button onClick={refreshPrices} disabled={refreshing} variant="outline">
          <RefreshCw className={"size-4 mr-2 " + (refreshing ? "animate-spin" : "")} />
          {t.refresh_prices}
        </Button>
      </div>

      {/* Live prices */}
      <div className="grid gap-4 md:grid-cols-2">
        {["gold", "silver"].map((m) => {
          const p = prices.find((x) => x.metal === m);
          const isGold = m === "gold";
          return (
            <Card
              key={m}
              className={cn(
                "transition-all",
                theme === "gold"
                  ? "gold-gradient-bg border-none rounded-tl-none rounded-tr-3xl rounded-bl-3xl rounded-br-3xl shadow-lg shadow-amber-500/20"
                  : "border-amber-500/30 dark:border-amber-500/20 shadow-sm",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Coins
                    className={cn(
                      "size-5",
                      theme === "gold" ? "text-black/60" : "text-amber-500",
                    )}
                  />
                  <span className={theme === "gold" ? "text-black" : ""}>
                    {isGold ? "Gold (10 Grams)" : "Gold (1 Tola)"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {p ? (
                  <div className="space-y-1">
                    <div
                      className={cn(
                        "text-2xl font-bold",
                        theme === "gold" ? "text-black" : "text-foreground",
                      )}
                    >
                      {formatNPR(p.price_per_tola)}{" "}
                      <span
                        className={cn(
                          "text-sm font-normal",
                          theme === "gold" ? "text-black/60" : "text-muted-foreground",
                        )}
                      >
                        {isGold ? "/ 10 gram (24K Fine)" : "/ tola (24K Fine)"}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        theme === "gold" ? "text-black/60" : "text-muted-foreground",
                      )}
                    >
                      {formatNPR(p.price_per_gram)} / gram
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div
                        className={cn(
                          "rounded border p-2",
                          theme === "gold"
                            ? "bg-black/5 border-black/10"
                            : "bg-amber-50/20 dark:bg-amber-950/10",
                        )}
                      >
                        <div
                          className={theme === "gold" ? "text-black/50" : "text-muted-foreground"}
                        >
                          22K {isGold ? "/ 10g" : "/ tola"}
                        </div>
                        <div
                          className={cn(
                            "font-semibold",
                            theme === "gold" ? "text-black" : "text-foreground",
                          )}
                        >
                          {formatNPR(p.price_per_tola * 0.9167)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "rounded border p-2",
                          theme === "gold"
                            ? "bg-black/5 border-black/10"
                            : "bg-amber-50/20 dark:bg-amber-950/10",
                        )}
                      >
                        <div
                          className={theme === "gold" ? "text-black/50" : "text-muted-foreground"}
                        >
                          18K {isGold ? "/ 10g" : "/ tola"}
                        </div>
                        <div
                          className={cn(
                            "font-semibold",
                            theme === "gold" ? "text-black" : "text-foreground",
                          )}
                        >
                          {formatNPR(p.price_per_tola * 0.75)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-xs pt-1",
                        theme === "gold" ? "text-black/40" : "text-muted-foreground",
                      )}
                    >
                      Updated {new Date(p.fetched_at).toLocaleString()} | Source: {p.source === "fenegosida.org" ? "FENEGOSIDA" : "International"}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No price yet — click Refresh</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Silver Price Section */}
      {(() => {
        const sp = prices.find((x) => x.metal === "silver" && x.price_per_tola < 10000);
        const perTola = sp ? sp.price_per_tola : 5060.0; // Updated fallback for 18/05/2026
        const perGram = sp ? sp.price_per_gram : 433.8;  // Updated fallback for 18/05/2026
        const lastUpdated = sp
          ? new Date(sp.fetched_at).toLocaleString()
          : new Date().toLocaleDateString();

        return (
          <Card
            className={cn(
              "transition-all",
              theme === "gold"
                ? "silver-gradient-bg border-none rounded-tl-none rounded-tr-3xl rounded-bl-3xl rounded-br-3xl shadow-lg shadow-slate-400/20"
                : "border-slate-400/30 dark:border-slate-500/20 shadow-sm",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 capitalize">
                <Coins
                  className={cn(
                    "size-5",
                    theme === "gold" ? "text-slate-600" : "text-slate-500 dark:text-slate-400",
                  )}
                />
                <span className={theme === "gold" ? "text-black" : ""}>
                  Silver Rate {sp ? `(${sp.metal})` : "(Fine Pure)"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 items-center">
                <div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      theme === "gold" ? "text-black" : "text-foreground",
                    )}
                  >
                    {formatNPR(perTola)}{" "}
                    <span
                      className={cn(
                        "text-sm font-normal",
                        theme === "gold" ? "text-black/60" : "text-muted-foreground",
                      )}
                    >
                      / tola
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-sm mt-0.5",
                      theme === "gold" ? "text-black/60" : "text-muted-foreground",
                    )}
                  >
                    {formatNPR(perGram)} / gram
                  </div>
                  <div
                    className={cn(
                      "text-xs pt-2",
                      theme === "gold" ? "text-black/40" : "text-muted-foreground",
                    )}
                  >
                    Updated {lastUpdated} | Source: {sp?.source === "fenegosida.org" ? "FENEGOSIDA" : "International"}
                  </div>
                </div>
                <div
                  className={cn(
                    "flex flex-wrap gap-3 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 text-xs",
                    theme === "gold" ? "border-black/10" : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex-1 min-w-[100px] rounded border p-2",
                      theme === "gold"
                        ? "bg-black/5 border-black/10"
                        : "bg-slate-50/5 dark:bg-slate-950/10",
                    )}
                  >
                    <div
                      className={theme === "gold" ? "text-black/50" : "text-muted-foreground"}
                    >
                      Per 10 Grams
                    </div>
                    <div
                      className={cn(
                        "font-semibold text-sm mt-0.5",
                        theme === "gold" ? "text-black" : "text-foreground",
                      )}
                    >
                      {formatNPR(perGram * 10)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex-1 min-w-[100px] rounded border p-2",
                      theme === "gold"
                        ? "bg-black/5 border-black/10"
                        : "bg-slate-50/5 dark:bg-slate-950/10",
                    )}
                  >
                    <div
                      className={theme === "gold" ? "text-black/50" : "text-muted-foreground"}
                    >
                      Purity Standard
                    </div>
                    <div
                      className={cn(
                        "font-semibold text-sm mt-0.5",
                        theme === "gold" ? "text-black" : "text-foreground",
                      )}
                    >
                      999 Fine
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Package} label={t.products_count} value={String(stats.products)} />
        <StatCard icon={Users} label={t.customers_count} value={String(stats.customers)} />
        <StatCard icon={Receipt} label={t.sales_today} value={String(stats.salesToday)} />
        <StatCard icon={TrendingUp} label={t.total_today} value={formatNPR(stats.totalToday)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <a href="/sales" className="rounded-md border p-4 hover:bg-accent transition">
            New sale & bill
          </a>
          <a href="/products" className="rounded-md border p-4 hover:bg-accent transition">
            Add product / stock
          </a>
          <a href="/cashbook" className="rounded-md border p-4 hover:bg-accent transition">
            Record cash entry
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
