import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: () => <AuthGuard><AppLayout><SettingsPage /></AppLayout></AuthGuard>,
});

interface Shop {
  id: string; shop_name: string; address: string | null; phone: string | null;
  email: string | null; pan_vat: string | null; vat_rate: number; currency: string;
  invoice_prefix: string; bill_footer: string | null; logo_url: string | null;
}

function SettingsPage() {
  const { role } = useAuth();
  const isStaff = role === "staff";
  const [s, setS] = useState<Shop | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedTheme, setSavedTheme] = useState("default");

  useEffect(() => {
    setSavedTheme(localStorage.getItem("app_theme") || "default");
    supabase.from("shop_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setS(data as Shop);
    });
  }, []);

  async function save() {
    if (!s || isStaff) return;
    setBusy(true);
    const { error } = await supabase.from("shop_settings").update({
      shop_name: s.shop_name, address: s.address, phone: s.phone, email: s.email,
      pan_vat: s.pan_vat, vat_rate: s.vat_rate, currency: s.currency,
      invoice_prefix: s.invoice_prefix, bill_footer: s.bill_footer, logo_url: s.logo_url,
    }).eq("id", s.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setTimeout(() => window.location.reload(), 500);
  }

  const handleThemeChange = (t: string) => {
    setSavedTheme(t);
    localStorage.setItem("app_theme", t);
    const root = document.documentElement;
    root.classList.remove("theme-sapphire", "theme-gold");
    if (t !== "default") {
      root.classList.add(`theme-${t}`);
    }
    window.dispatchEvent(new Event("storage"));
    setTimeout(() => window.location.reload(), 50);
  };

  if (!s) return <div className="text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Shop Settings</h1>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Side: Business details (Takes 2 grid columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Business details</span>
                {isStaff && (
                  <span className="text-xs font-normal px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded border border-amber-500/20">
                    Read-only (Owner Access Required)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Shop name</Label><Input value={s.shop_name} disabled={isStaff} onChange={(e) => setS({ ...s, shop_name: e.target.value })} /></div>
              <div className="md:col-span-2 space-y-1">
                <Label>Logo image (Upload local file or paste URL)</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isStaff}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setS({ ...s, logo_url: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full sm:w-auto cursor-pointer text-sm"
                  />
                  <Input
                    value={s.logo_url ?? ""}
                    disabled={isStaff}
                    onChange={(e) => setS({ ...s, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png or base64"
                    className="flex-1"
                  />
                </div>
                {s.logo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Preview:</span>
                    <img src={s.logo_url} alt="Logo preview" className="h-10 w-auto object-contain rounded border p-1 bg-background" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2"><Label>Address</Label><Textarea value={s.address ?? ""} disabled={isStaff} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={s.phone ?? ""} disabled={isStaff} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={s.email ?? ""} disabled={isStaff} onChange={(e) => setS({ ...s, email: e.target.value })} /></div>
              <div><Label>PAN / VAT no.</Label><Input value={s.pan_vat ?? ""} disabled={isStaff} onChange={(e) => setS({ ...s, pan_vat: e.target.value })} /></div>
              <div><Label>VAT rate (%)</Label><Input type="number" step="0.01" value={s.vat_rate} disabled={isStaff} onChange={(e) => setS({ ...s, vat_rate: Number(e.target.value) })} /></div>
              <div><Label>Currency</Label><Input value={s.currency} disabled={isStaff} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
              <div><Label>Invoice prefix</Label><Input value={s.invoice_prefix} disabled={isStaff} onChange={(e) => setS({ ...s, invoice_prefix: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Bill footer text</Label><Textarea value={s.bill_footer ?? ""} disabled={isStaff} onChange={(e) => setS({ ...s, bill_footer: e.target.value })} placeholder="Thank you for shopping with us!" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Appearance & Theme (Takes 1 grid column) */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Theme</CardTitle>
              <p className="text-xs text-muted-foreground">Select your premium brand interface profile</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                type="button"
                onClick={() => handleThemeChange("default")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden w-full cursor-pointer",
                  savedTheme === "default" ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5" : "hover:bg-accent"
                )}
              >
                <div className="size-10 rounded-md bg-[#fbf8f3] border flex items-center justify-center shrink-0">
                  <span className="size-3.5 rounded-full bg-amber-500 shadow-xs"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Amber Base</div>
                  <div className="text-[10px] text-muted-foreground truncate">Warm classic workflow</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("gold")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden w-full cursor-pointer",
                  savedTheme === "gold" ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-400/5" : "hover:bg-accent"
                )}
              >
                <div className="size-10 rounded-md bg-[#120000] border border-white/10 flex items-center justify-center shrink-0">
                  <span className="size-3.5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-950 shadow-xs"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Gold Shimmer</div>
                  <div className="text-[10px] text-muted-foreground truncate">Obsidian premium luxury</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("sapphire")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden w-full cursor-pointer",
                  savedTheme === "sapphire" ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5" : "hover:bg-accent"
                )}
              >
                <div className="size-10 rounded-md bg-[#f2f6fc] border flex items-center justify-center shrink-0">
                  <span className="size-3.5 rounded-full bg-blue-600 shadow-xs"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Aesthetic Blue</div>
                  <div className="text-[10px] text-muted-foreground truncate">Crisp light & deep indigo</div>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Action Footer: Always positioned cleanly at the absolute end of the view */}
      {!isStaff && (
        <div className="pt-2 pb-6">
          <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
