import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/purchases")({
  component: () => <AuthGuard><AppLayout><PurchasesPage /></AppLayout></AuthGuard>,
});

interface Purchase {
  id: string; bill_no: string; purchase_date: string; supplier_id: string | null;
  total: number; paid: number; due: number; payment_mode: string;
}
interface Supplier { id: string; name: string }
interface Product { id: string; name: string; metal: string; purity: string | null; stock_qty: number }

function PurchasesPage() {
  const [items, setItems] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const [{ data: pu }, { data: sup }, { data: pr }] = await Promise.all([
      supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("suppliers").select("id,name").order("name"),
      supabase.from("products").select("id,name,metal,purity,stock_qty").order("name"),
    ]);
    setItems((pu ?? []) as Purchase[]);
    setSuppliers((sup ?? []) as Supplier[]);
    setProducts((pr ?? []) as Product[]);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Purchases</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />New purchase</Button></DialogTrigger>
          <NewPurchaseDialog suppliers={suppliers} products={products} onDone={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Bill #</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
            <TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Due</TableHead><TableHead>Mode</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.bill_no}</TableCell>
                <TableCell>{p.purchase_date}</TableCell>
                <TableCell>{suppliers.find((s) => s.id === p.supplier_id)?.name ?? "—"}</TableCell>
                <TableCell className="font-medium">{formatNPR(p.total)}</TableCell>
                <TableCell>{formatNPR(p.paid)}</TableCell>
                <TableCell className={Number(p.due) > 0 ? "text-destructive font-medium" : ""}>{formatNPR(p.due)}</TableCell>
                <TableCell className="capitalize">{p.payment_mode}</TableCell>
              </TableRow>
            ))}
            {!items.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchases yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

interface PLine {
  product_id: string | null;
  description: string;
  metal: "gold" | "silver" | "other";
  purity: string;
  qty: number;
  weight_gram: number;
  rate_per_gram: number;
  making_charge: number;
}

function NewPurchaseDialog({ suppliers, products, onDone }: { suppliers: Supplier[]; products: Product[]; onDone: () => void }) {
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [vatRate, setVatRate] = useState(13);
  const [paid, setPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [lines, setLines] = useState<PLine[]>([blank()]);
  const [busy, setBusy] = useState(false);

  function blank(): PLine { return { product_id: null, description: "", metal: "gold", purity: "22K", qty: 1, weight_gram: 0, rate_per_gram: 0, making_charge: 0 }; }

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.qty * (l.weight_gram * l.rate_per_gram + l.making_charge), 0);
    const vat = subtotal * (vatRate / 100);
    const total = subtotal + vat;
    return { subtotal, vat, total, due: Math.max(0, total - paid) };
  }, [lines, vatRate, paid]);

  async function submit() {
    if (!supplierId) return toast.error("Select a supplier");
    if (lines.some((l) => !l.description)) return toast.error("Fill descriptions");
    setBusy(true);
    try {
      const { data: pur, error } = await supabase.from("purchases").insert({
        supplier_id: supplierId, purchase_date: date,
        subtotal: totals.subtotal, vat_rate: vatRate, vat_amount: totals.vat,
        total: totals.total, paid, due: totals.due, payment_mode: paymentMode,
      }).select("*").single();
      if (error) throw error;

      const { error: e2 } = await supabase.from("purchase_items").insert(
        lines.map((l) => ({
          purchase_id: pur.id, product_id: l.product_id, description: l.description,
          metal: l.metal, purity: l.purity || null, qty: l.qty,
          weight_gram: l.weight_gram, rate_per_gram: l.rate_per_gram,
          making_charge: l.making_charge,
          amount: l.qty * (l.weight_gram * l.rate_per_gram + l.making_charge),
        }))
      );
      if (e2) throw e2;

      // increase stock
      for (const l of lines) {
        if (!l.product_id) continue;
        const prod = products.find((p) => p.id === l.product_id);
        if (!prod) continue;
        await supabase.from("products").update({ stock_qty: prod.stock_qty + l.qty }).eq("id", l.product_id);
        await supabase.from("stock_movements").insert({
          product_id: l.product_id, type: "in", qty: l.qty, weight_gram: l.weight_gram * l.qty,
          ref_table: "purchases", ref_id: pur.id, note: `Purchase ${pur.bill_no}`,
        });
      }
      // supplier credit ledger (reverse: we owe supplier)
      await supabase.from("credits").insert({
        party_type: "supplier", party_id: supplierId, entry_date: date,
        ref_table: "purchases", ref_id: pur.id,
        debit: paid, credit: totals.total, note: `Purchase ${pur.bill_no}`,
      });
      // cashbook out
      if (paid > 0) {
        await supabase.from("cashbook").insert({
          entry_date: date, direction: "out", category: "purchase", amount: paid,
          party_type: "supplier", party_id: supplierId, ref_table: "purchases", ref_id: pur.id,
          payment_mode: paymentMode, note: `Purchase ${pur.bill_no}`,
        });
      }
      toast.success(`Saved ${pur.bill_no}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  function update(i: number, patch: Partial<PLine>) {
    setLines((ls) => ls.map((l, k) => k === i ? { ...l, ...patch } : l));
  }

  return (
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New purchase</DialogTitle></DialogHeader>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Supplier *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label>Payment mode</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Product</TableHead><TableHead>Description</TableHead><TableHead>Metal</TableHead>
            <TableHead>Purity</TableHead><TableHead>Qty</TableHead><TableHead>Wt(g)</TableHead>
            <TableHead>Rate/g</TableHead><TableHead>Making</TableHead><TableHead>Amount</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lines.map((l, i) => {
              const amt = l.qty * (l.weight_gram * l.rate_per_gram + l.making_charge);
              return (
                <TableRow key={i}>
                  <TableCell className="min-w-[150px]">
                    <Select value={l.product_id ?? "_"} onValueChange={(v) => {
                      if (v === "_") update(i, { product_id: null });
                      else {
                        const p = products.find((x) => x.id === v);
                        if (p) update(i, { product_id: p.id, description: p.name, metal: p.metal as PLine["metal"], purity: p.purity ?? "" });
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Custom</SelectItem>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></TableCell>
                  <TableCell>
                    <Select value={l.metal} onValueChange={(v) => update(i, { metal: v as PLine["metal"] })}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input className="w-20" value={l.purity} onChange={(e) => update(i, { purity: e.target.value })} /></TableCell>
                  <TableCell><Input className="w-16" type="number" value={l.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input className="w-24" type="number" step="0.001" value={l.weight_gram} onChange={(e) => update(i, { weight_gram: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input className="w-28" type="number" step="0.01" value={l.rate_per_gram} onChange={(e) => update(i, { rate_per_gram: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input className="w-24" type="number" step="0.01" value={l.making_charge} onChange={(e) => update(i, { making_charge: Number(e.target.value) })} /></TableCell>
                  <TableCell className="font-medium">{formatNPR(amt)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}><Trash2 className="size-4" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blank()])}><Plus className="size-4 mr-1" />Add line</Button>

      <div className="grid md:grid-cols-2 gap-3 mt-2">
        <div />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatNPR(totals.subtotal)}</span></div>
          <div className="flex items-center gap-2"><Label className="w-32">VAT %</Label><Input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} /></div>
          <div className="flex justify-between"><span>VAT amount</span><span>{formatNPR(totals.vat)}</span></div>
          <div className="flex justify-between font-bold text-base"><span>TOTAL</span><span>{formatNPR(totals.total)}</span></div>
          <div className="flex items-center gap-2"><Label className="w-32">Paid</Label><Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></div>
          <div className="flex justify-between font-bold"><span>Due</span><span>{formatNPR(totals.due)}</span></div>
        </div>
      </div>

      <DialogFooter><Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}
