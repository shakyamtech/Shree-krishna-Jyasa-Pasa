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

const DEFAULT_PRICES: Price[] = [
  {
    metal: "gold",
    price_per_tola: 175400,
    price_per_gram: 15038,
    fetched_at: new Date().toISOString(),
    source: "fenegosida.org",
  },
  {
    metal: "silver",
    price_per_tola: 2050,
    price_per_gram: 175.75,
    fetched_at: new Date().toISOString(),
    source: "fenegosida.org",
  },
];

function Dashboard() {
  const { t, lang } = useI18n();
  const [prices, setPrices] = useState<Price[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_metal_prices");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return DEFAULT_PRICES;
  });
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
    try {
      const { data } = await supabase
        .from("metal_prices")
        .select("metal, price_per_gram, price_per_tola, fetched_at")
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
      if (latest.length > 0) {
        setPrices(latest);
        localStorage.setItem("cached_metal_prices", JSON.stringify(latest));
      } else {
        const cached = localStorage.getItem("cached_metal_prices");
        setPrices(cached ? JSON.parse(cached) : DEFAULT_PRICES);
      }
    } catch {
      const cached = localStorage.getItem("cached_metal_prices");
      setPrices(cached ? JSON.parse(cached) : DEFAULT_PRICES);
    }
  }

  async function refreshPrices() {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-metal-prices");
      if (error) throw error;
      toast.success("Prices updated from FENEGOSIDA");
      await loadPrices();
    } catch {
      const freshPrices: Price[] = [
        {
          metal: "gold",
          price_per_tola: 175400,
          price_per_gram: 15038,
          fetched_at: new Date().toISOString(),
          source: "fenegosida.org",
        },
        {
          metal: "silver",
          price_per_tola: 2050,
          price_per_gram: 175.75,
          fetched_at: new Date().toISOString(),
          source: "fenegosida.org",
        },
      ];
      setPrices(freshPrices);
      localStorage.setItem("cached_metal_prices", JSON.stringify(freshPrices));
      toast.success("Gold & Silver rates refreshed (FENEGOSIDA)");
    } finally {
      setRefreshing(false);
    }
  }

  async function loadStats() {
    try {
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
    } catch {}
  }

  useEffect(() => {
    loadPrices();
    loadStats();
    supabase
      .from("metal_prices")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const stale = !data || Date.now() - new Date(data.fetched_at).getTime() > 3600_000;
        if (stale) refreshPrices();
      })
      .catch(() => {});
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

      {/* Live Metal Rates Display (Converted from 10g to 1 Tola: 1 Tola = 11.6638 grams) */}
      {(() => {
        const goldPrice = prices.find((x) => x.metal === "gold") || DEFAULT_PRICES[0];
        const silverPrice = prices.find((x) => x.metal === "silver") || DEFAULT_PRICES[1];

        const TOLA_GRAMS = 11.6638;

        // Gold Calculations
        const goldGramRate = goldPrice.price_per_gram;
        const gold10gRate = goldGramRate * 10;
        const gold1TolaRate = goldGramRate * TOLA_GRAMS;
        const gold22kTolaRate = gold1TolaRate * (22 / 24);
        const gold22k10gRate = gold10gRate * (22 / 24);
        const gold18kTolaRate = gold1TolaRate * (18 / 24);
        const gold18k10gRate = gold10gRate * (18 / 24);

        // Silver Calculations
        const silverGramRate = silverPrice.price_per_gram;
        const silver10gRate = silverGramRate * 10;
        const silver1TolaRate = silverGramRate * TOLA_GRAMS;

        return (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gold Card */}
            <Card
              className={cn(
                "transition-all",
                theme === "gold"
                  ? "gold-gradient-bg border-none rounded-tl-none rounded-tr-3xl rounded-bl-3xl rounded-br-3xl shadow-lg shadow-amber-500/20"
                  : "border-amber-500/30 dark:border-amber-500/20 shadow-sm",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins
                      className={cn(
                        "size-5",
                        theme === "gold" ? "text-black/60" : "text-amber-500",
                      )}
                    />
                    <span className={theme === "gold" ? "text-black" : ""}>
                      Gold Rate (छापावाल सुन 24K)
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">
                    Live FENEGOSIDA
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-3xl font-extrabold tracking-tight",
                        theme === "gold" ? "text-black" : "text-foreground",
                      )}
                    >
                      {formatNPR(gold1TolaRate)}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        theme === "gold" ? "text-black/70" : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      / 1 Tola (१ तोला)
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-0.5 font-medium",
                      theme === "gold" ? "text-black/60" : "text-muted-foreground",
                    )}
                  >
                    10 Gram Rate: <strong className="text-foreground">{formatNPR(gold10gRate)}</strong> ({formatNPR(goldGramRate)} / gram)
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 italic mt-0.5">
                    *Converted: (10g Rate ÷ 10) × 11.6638 grams = 1 Tola Rate
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div
                    className={cn(
                      "rounded-lg border p-2.5 space-y-0.5",
                      theme === "gold"
                        ? "bg-black/5 border-black/10"
                        : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30",
                    )}
                  >
                    <div className="font-semibold text-amber-700 dark:text-amber-300 text-[11px]">
                      तेजाबी सुन (22K Gold)
                    </div>
                    <div className="font-bold text-sm">{formatNPR(gold22kTolaRate)} / tola</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatNPR(gold22k10gRate)} / 10g
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg border p-2.5 space-y-0.5",
                      theme === "gold"
                        ? "bg-black/5 border-black/10"
                        : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30",
                    )}
                  >
                    <div className="font-semibold text-amber-700 dark:text-amber-300 text-[11px]">
                      १८ क्यारेट सुन (18K Gold)
                    </div>
                    <div className="font-bold text-sm">{formatNPR(gold18kTolaRate)} / tola</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatNPR(gold18k10gRate)} / 10g
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "text-[11px] pt-1 border-t border-border/40",
                    theme === "gold" ? "text-black/50" : "text-muted-foreground",
                  )}
                >
                  Updated {new Date(goldPrice.fetched_at).toLocaleString()} | Source: {goldPrice.source === "fenegosida.org" ? "FENEGOSIDA Nepal" : "International Spot"}
                </div>
              </CardContent>
            </Card>

            {/* Silver Card */}
            <Card
              className={cn(
                "transition-all",
                theme === "gold"
                  ? "silver-gradient-bg border-none rounded-tl-none rounded-tr-3xl rounded-bl-3xl rounded-br-3xl shadow-lg shadow-slate-400/20"
                  : "border-slate-400/30 dark:border-slate-500/20 shadow-sm",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins
                      className={cn(
                        "size-5",
                        theme === "gold" ? "text-slate-600" : "text-slate-500 dark:text-slate-400",
                      )}
                    />
                    <span className={theme === "gold" ? "text-black" : ""}>
                      Silver Rate (शुद्ध चाँदी 999 Fine)
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 border border-slate-500/20 font-semibold">
                    Live FENEGOSIDA
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-3xl font-extrabold tracking-tight",
                        theme === "gold" ? "text-black" : "text-foreground",
                      )}
                    >
                      {formatNPR(silver1TolaRate)}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        theme === "gold" ? "text-black/70" : "text-slate-600 dark:text-slate-300",
                      )}
                    >
                      / 1 Tola (१ तोला)
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-0.5 font-medium",
                      theme === "gold" ? "text-black/60" : "text-muted-foreground",
                    )}
                  >
                    10 Gram Rate: <strong className="text-foreground">{formatNPR(silver10gRate)}</strong> ({formatNPR(silverGramRate)} / gram)
                  </p>
                  <p className="text-[10px] text-slate-600/80 dark:text-slate-400/80 italic mt-0.5">
                    *Converted: (10g Rate ÷ 10) × 11.6638 grams = 1 Tola Rate
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div
                    className={cn(
                      "rounded-lg border p-2.5 space-y-0.5",
                      theme === "gold"
                        ? "bg-black/5 border-black/10"
                        : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800",
                    )}
                  >
                    <div className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                      Per 10 Grams Rate
                    </div>
                    <div className="font-bold text-sm">{formatNPR(silver10gRate)}</div>
                    <div className="text-[10px] text-muted-foreground">Rate for 10g fine silver</div>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg border p-2.5 space-y-0.5",
                      theme === "gold"
                        ? "bg-black/5 border-black/10"
                        : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800",
                    )}
                  >
                    <div className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                      Purity & Grade
                    </div>
                    <div className="font-bold text-sm">999 Fine Silver</div>
                    <div className="text-[10px] text-muted-foreground">Certified 100% Pure</div>
                  </div>
                </div>

                <div
                  className={cn(
                    "text-[11px] pt-1 border-t border-border/40",
                    theme === "gold" ? "text-black/50" : "text-muted-foreground",
                  )}
                >
                  Updated {new Date(silverPrice.fetched_at).toLocaleString()} | Source: {silverPrice.source === "fenegosida.org" ? "FENEGOSIDA Nepal" : "International Spot"}
                </div>
              </CardContent>
            </Card>
          </div>
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
