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

export const Route = createFileRoute("/settings")({
  component: () => <AuthGuard><AppLayout><SettingsPage /></AppLayout></AuthGuard>,
});

interface Shop {
  id: string; shop_name: string; address: string | null; phone: string | null;
  email: string | null; pan_vat: string | null; vat_rate: number; currency: string;
  invoice_prefix: string; bill_footer: string | null; logo_url: string | null;
}

function SettingsPage() {
  const [s, setS] = useState<Shop | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("shop_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setS(data as Shop);
    });
  }, []);

  async function save() {
    if (!s) return;
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

  if (!s) return <div className="text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Shop Settings</h1>
      <Card>
        <CardHeader><CardTitle>Business details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Shop name</Label><Input value={s.shop_name} onChange={(e) => setS({ ...s, shop_name: e.target.value })} /></div>
          <div className="md:col-span-2 space-y-1">
            <Label>Logo image (Upload local file or paste URL)</Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                type="file"
                accept="image/*"
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
          <div className="md:col-span-2"><Label>Address</Label><Textarea value={s.address ?? ""} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={s.phone ?? ""} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={s.email ?? ""} onChange={(e) => setS({ ...s, email: e.target.value })} /></div>
          <div><Label>PAN / VAT no.</Label><Input value={s.pan_vat ?? ""} onChange={(e) => setS({ ...s, pan_vat: e.target.value })} /></div>
          <div><Label>VAT rate (%)</Label><Input type="number" step="0.01" value={s.vat_rate} onChange={(e) => setS({ ...s, vat_rate: Number(e.target.value) })} /></div>
          <div><Label>Currency</Label><Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
          <div><Label>Invoice prefix</Label><Input value={s.invoice_prefix} onChange={(e) => setS({ ...s, invoice_prefix: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Bill footer text</Label><Textarea value={s.bill_footer ?? ""} onChange={(e) => setS({ ...s, bill_footer: e.target.value })} placeholder="Thank you for shopping with us!" /></div>
        </CardContent>
      </Card>
      <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}
