import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR, todayISO } from "@/lib/format";
import { downloadBill, printBill, type BillData } from "@/lib/pdf";

export const Route = createFileRoute("/sales")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <SalesPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Sale {
  id: string;
  invoice_no: string;
  sale_date: string;
  customer_id: string | null;
  total: number;
  paid: number;
  due: number;
  payment_mode: string;
}
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  pan: string | null;
}
interface Product {
  id: string;
  name: string;
  sku: string | null;
  metal: string;
  purity: string | null;
  weight_gram: number;
  making_charge: number;
  stock_qty: number;
  jarti_percent: number;
}

function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("customers").select("id,name,phone,address,pan").order("name"),
      supabase
        .from("products")
        .select("id,name,sku,metal,purity,weight_gram,making_charge,stock_qty")
        .order("name"),
    ]);
    setSales((s ?? []) as Sale[]);
    setCustomers((c ?? []) as Customer[]);
    setProducts((p ?? []) as Product[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function deleteSale(saleId: string) {
    if (
      !confirm(
        "Are you sure you want to permanently delete this invoice? This action cannot be undone.",
      )
    )
      return;
    try {
      const { data: items } = await supabase
        .from("sale_items")
        .select("product_id, qty")
        .eq("sale_id", saleId);
      if (items) {
        for (const item of items) {
          if (!item.product_id) continue;
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) {
            await supabase
              .from("products")
              .update({ stock_qty: prod.stock_qty + item.qty })
              .eq("id", item.product_id);
          }
        }
      }
      await supabase.from("stock_movements").delete().eq("ref_table", "sales").eq("ref_id", saleId);
      await supabase.from("cashbook").delete().eq("ref_table", "sales").eq("ref_id", saleId);
      await supabase.from("credits").delete().eq("ref_table", "sales").eq("ref_id", saleId);
      await supabase.from("sale_items").delete().eq("sale_id", saleId);
      const { error } = await supabase.from("sales").delete().eq("id", saleId);

      if (error) throw error;
      toast.success("Bill deleted.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An unexpected error occurred");
    }
  }

  async function reprint(saleId: string) {
    const [{ data: sale }, { data: items }, { data: shop }] = await Promise.all([
      supabase.from("sales").select("*").eq("id", saleId).maybeSingle(),
      supabase.from("sale_items").select("*").eq("sale_id", saleId),
      supabase.from("shop_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (!sale || !shop) return toast.error("Missing data");
    const customer = sale.customer_id
      ? (customers.find((c) => c.id === sale.customer_id) ?? null)
      : null;
    const data: BillData = {
      invoice_no: sale.invoice_no,
      sale_date: sale.sale_date,
      shop,
      customer,
      items: (items ?? []) as BillData["items"],
      subtotal: Number(sale.subtotal),
      making_total: Number(sale.making_total),
      discount: Number(sale.discount),
      vat_rate: Number(sale.vat_rate),
      vat_amount: Number(sale.vat_amount),
      total: Number(sale.total),
      paid: Number(sale.paid),
      due: Number(sale.due),
      payment_mode: sale.payment_mode,
      notes: sale.notes,
    };
    downloadBill(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Sales / Billing</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              New sale
            </Button>
          </DialogTrigger>
          {open && (
            <NewSaleDialog
              customers={customers}
              products={products}
              onDone={() => {
                setOpen(false);
                load();
              }}
            />
          )}
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.invoice_no}</TableCell>
                  <TableCell>{s.sale_date}</TableCell>
                  <TableCell>
                    {customers.find((c) => c.id === s.customer_id)?.name ?? "Walk-in"}
                  </TableCell>
                  <TableCell className="font-medium">{formatNPR(s.total)}</TableCell>
                  <TableCell>{formatNPR(s.paid)}</TableCell>
                  <TableCell className={Number(s.due) > 0 ? "text-destructive font-medium" : ""}>
                    {formatNPR(s.due)}
                  </TableCell>
                  <TableCell className="capitalize">{s.payment_mode}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => reprint(s.id)}>
                        <Download className="size-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!sales.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No sales yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface LineItem {
  product_id: string | null;
  description: string;
  metal: "gold" | "silver" | "other";
  purity: string;
  qty: number;
  weight_gram: number;
  rate_per_gram: number;
  making_charge: number;
  jarti_percent: number;
}

function NewSaleDialog({
  customers,
  products,
  onDone,
}: {
  customers: Customer[];
  products: Product[];
  onDone: () => void;
}) {
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [date, setDate] = useState(todayISO());
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(0);
  const [shopHasVat, setShopHasVat] = useState(false);
  const [paid, setPaid] = useState(0);
  const [isPaidEdited, setIsPaidEdited] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([blankLine()]);
  const [busy, setBusy] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({
    gold: 22235.03,
    silver: 489.5,
  });
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  async function createCustomerInline() {
    if (!newCustName.trim()) return toast.error("Enter customer name");
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || null,
          address: newCustAddress.trim() || null,
        })
        .select("id,name,phone,address,pan")
        .single();
      if (error) throw error;
      setLocalCustomers((prev) => [...prev, data]);
      setCustomerId(data.id);
      setNewCustOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      toast.success("Customer added & selected!");
    } catch (e) {
      toast.error("Failed to add customer: " + (e as Error).message);
    }
  }

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select("vat_rate")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const v = Number(data?.vat_rate || 0);
        setVatRate(v);
        setShopHasVat(v > 0);
      });

    supabase
      .from("metal_prices")
      .select("metal, price_per_gram")
      .order("fetched_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const map: Record<string, number> = { gold: 22235.03, silver: 489.5 };
        const gp = data?.find((x) => x.metal === "gold");
        if (gp?.price_per_gram) map.gold = Number(gp.price_per_gram);

        const sp = data?.find((x) => x.metal !== "gold" && x.metal !== "silver");
        if (sp?.price_per_gram) map.silver = Number(sp.price_per_gram);
        setLiveRates(map);
      });
  }, []);

  function blankLine(): LineItem {
    return {
      product_id: null,
      description: "",
      metal: "gold",
      purity: "22K",
      qty: 1,
      weight_gram: 0,
      rate_per_gram: 0,
      making_charge: 0,
      jarti_percent: 0,
    };
  }
  function pickProduct(idx: number, pid: string) {
    if (pid === "_") {
      setLines((ls) => ls.map((l, i) => (i === idx ? blankLine() : l)));
      return;
    }
    const p = products.find((x) => x.id === pid);
    if (!p) return;

    const isGold = p.metal === "gold";
    const baseRate = isGold ? liveRates.gold : liveRates.silver;
    let finalRate = baseRate;

    if (isGold) {
      const pur = (p.purity || "").toUpperCase();
      if (pur.includes("22K")) finalRate = baseRate * 0.9167;
      else if (pur.includes("21K")) finalRate = baseRate * 0.875;
      else if (pur.includes("18K")) finalRate = baseRate * 0.75;
    }

    setLines((ls) =>
      ls.map((l, i) =>
        i === idx
          ? {
              ...l,
              product_id: p.id,
              description: p.name + (p.sku ? ` (${p.sku})` : ""),
              metal: p.metal as LineItem["metal"],
              purity: p.purity ?? "",
              weight_gram: Number(p.weight_gram),
              making_charge: Number(p.making_charge),
              jarti_percent: Number(p.jarti_percent || 0),
              rate_per_gram: Math.round(finalRate * 100) / 100,
            }
          : l,
      ),
    );
  }
  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => {
      const jartiWeight = l.weight_gram * (l.jarti_percent / 100);
      return s + l.qty * (l.weight_gram + jartiWeight) * l.rate_per_gram;
    }, 0);
    const making = lines.reduce((s, l) => s + l.qty * l.making_charge, 0);
    const taxable = Math.max(0, subtotal + making - discount);
    const vat = taxable * (vatRate / 100);
    const total = taxable + vat;
    return { subtotal, making, vat, total, due: Math.max(0, total - paid) };
  }, [lines, discount, vatRate, paid]);

  useEffect(() => {
    if (!isPaidEdited && paymentMode !== "credit") {
      setPaid(totals.total);
    }
  }, [totals.total, paymentMode, isPaidEdited]);

  async function submit() {
    if (!lines.length || lines.some((l) => !l.description))
      return toast.error("Fill all line items");

    // 1. Check stock for each item
    for (const l of lines) {
      if (!l.product_id) continue;
      const prod = products.find((p) => p.id === l.product_id);
      if (prod && prod.stock_qty < l.qty) {
        toast.error(`Out of stock: ${prod.name} (Available: ${prod.stock_qty})`);
        return;
      }
    }

    setBusy(true);
    try {
      const itemsPayload = lines.map((l) => {
        const jartiWeight = l.weight_gram * (l.jarti_percent / 100);
        return {
          product_id: l.product_id,
          description: l.description,
          metal: l.metal,
          purity: l.purity || null,
          qty: l.qty,
          weight_gram: l.weight_gram,
          rate_per_gram: l.rate_per_gram,
          making_charge: l.making_charge,
          jarti_percent: l.jarti_percent,
          amount: l.qty * ((l.weight_gram + jartiWeight) * l.rate_per_gram + l.making_charge),
        };
      });

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          customer_id: customerId === "walk-in" ? null : customerId,
          sale_date: date,
          subtotal: totals.subtotal,
          making_total: totals.making,
          discount,
          vat_rate: vatRate,
          vat_amount: totals.vat,
          total: totals.total,
          paid,
          due: totals.due,
          payment_mode: paymentMode,
          notes,
        })
        .select("*")
        .single();
      if (error) throw error;

      const { error: e2 } = await supabase
        .from("sale_items")
        .insert(itemsPayload.map((it) => ({ ...it, sale_id: sale.id })));
      if (e2) throw e2;

      // Reduce stock & log movements
      for (const l of lines) {
        if (!l.product_id) continue;
        const prod = products.find((p) => p.id === l.product_id);
        if (!prod) continue;
        await supabase
          .from("products")
          .update({ stock_qty: Math.max(0, prod.stock_qty - l.qty) })
          .eq("id", l.product_id);
        await supabase.from("stock_movements").insert({
          product_id: l.product_id,
          type: "out",
          qty: l.qty,
          weight_gram: l.weight_gram * l.qty,
          ref_table: "sales",
          ref_id: sale.id,
          note: `Sale ${sale.invoice_no}`,
        });
      }
      // Credit ledger
      if (customerId !== "walk-in") {
        await supabase.from("credits").insert({
          party_type: "customer",
          party_id: customerId,
          entry_date: date,
          ref_table: "sales",
          ref_id: sale.id,
          debit: totals.total,
          credit: paid,
          note: `Sale ${sale.invoice_no}`,
        });
      }
      // Cashbook
      if (paid > 0) {
        await supabase.from("cashbook").insert({
          entry_date: date,
          direction: "in",
          category: "sale",
          amount: paid,
          party_type: customerId === "walk-in" ? null : "customer",
          party_id: customerId === "walk-in" ? null : customerId,
          ref_table: "sales",
          ref_id: sale.id,
          payment_mode: paymentMode,
          note: `Sale ${sale.invoice_no}`,
        });
      }

      // Build & download PDF
      const { data: shop } = await supabase
        .from("shop_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      const customer =
        customerId === "walk-in" ? null : (localCustomers.find((c) => c.id === customerId) ?? null);
      if (shop) {
        downloadBill({
          invoice_no: sale.invoice_no,
          sale_date: date,
          shop,
          customer,
          items: itemsPayload.map((it) => ({
            description: it.description,
            metal: it.metal,
            purity: it.purity,
            qty: it.qty,
            weight_gram: it.weight_gram,
            rate_per_gram: it.rate_per_gram,
            making_charge: it.making_charge,
            jarti_percent: it.jarti_percent,
            amount: it.amount,
          })),
          subtotal: totals.subtotal,
          making_total: totals.making,
          discount,
          vat_rate: vatRate,
          vat_amount: totals.vat,
          total: totals.total,
          paid,
          due: totals.due,
          payment_mode: paymentMode,
          notes,
        });
      }

      toast.success(`Sale recorded: ${sale.invoice_no}`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-7xl w-[96vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New sale</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="flex items-center justify-between pb-1">
            <Label>Customer</Label>
            <Dialog open={newCustOpen} onOpenChange={setNewCustOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs font-medium text-amber-600 dark:text-amber-500"
                >
                  + Add new
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Quick add customer</DialogTitle>
                  <DialogDescription>
                    Register a new customer instantly during checkout
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      placeholder="Customer name"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      placeholder="Phone number"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      placeholder="City / location"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                    />
                  </div>
                  <Button className="w-full mt-2" onClick={createCustomerInline}>
                    Save & select
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in customer</SelectItem>
              {localCustomers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Payment mode</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="esewa">eSewa</SelectItem>
              <SelectItem value="khalti">Khalti</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[160px] h-9 px-2">Product</TableHead>
              <TableHead className="min-w-[220px] h-9 px-2">Description</TableHead>
              <TableHead className="w-[100px] h-9 px-2">Metal</TableHead>
              <TableHead className="w-[80px] h-9 px-2">Purity</TableHead>
              <TableHead className="w-[70px] h-9 px-2">Qty</TableHead>
              <TableHead className="w-[100px] h-9 px-2">Wt(g)</TableHead>
              <TableHead className="w-[70px] h-9 px-2">Jarti%</TableHead>
              <TableHead className="w-[120px] h-9 px-2">Rate/g</TableHead>
              <TableHead className="w-[110px] h-9 px-2">Making</TableHead>
              <TableHead className="w-[110px] h-9 px-2 text-right">Amount</TableHead>
              <TableHead className="w-9 h-9 px-1"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => {
              const amt = l.qty * (l.weight_gram * l.rate_per_gram + l.making_charge);
              return (
                <TableRow key={i}>
                  <TableCell className="p-1.5">
                    <Select value={l.product_id ?? "_"} onValueChange={(v) => pickProduct(i, v)}>
                      <SelectTrigger className="w-full h-8 px-2 text-xs">
                        <SelectValue placeholder="Pick" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Custom</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs font-medium"
                      placeholder="Item description"
                      value={l.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Select
                      value={l.metal}
                      onValueChange={(v) => updateLine(i, { metal: v as LineItem["metal"] })}
                    >
                      <SelectTrigger className="w-full h-8 px-2 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs text-center"
                      value={l.purity}
                      onChange={(e) => updateLine(i, { purity: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs text-center"
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs text-right font-mono"
                      type="number"
                      step="0.001"
                      value={l.weight_gram}
                      onChange={(e) => updateLine(i, { weight_gram: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs text-right font-mono"
                      type="number"
                      step="0.01"
                      value={l.jarti_percent}
                      onChange={(e) => updateLine(i, { jarti_percent: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs text-right font-mono"
                      type="number"
                      step="0.01"
                      value={l.rate_per_gram}
                      onChange={(e) => updateLine(i, { rate_per_gram: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <Input
                      className="w-full h-8 px-2 text-xs text-right font-mono"
                      type="number"
                      step="0.01"
                      value={l.making_charge}
                      onChange={(e) => updateLine(i, { making_charge: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-semibold text-xs font-mono align-middle">
                    {formatNPR(amt)}
                  </TableCell>
                  <TableCell className="p-1 px-0 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-1"
        onClick={() => setLines((ls) => [...ls, blankLine()])}
      >
        <Plus className="size-4 mr-1" />
        Add line
      </Button>

      <div className="grid gap-3 md:grid-cols-2 mt-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Notes</Label>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-[10px] font-medium text-amber-600 dark:text-amber-500"
              onClick={() => {
                const validLines = lines.filter((l) => l.description.trim());
                if (!validLines.length) {
                  toast.error("Add item descriptions first");
                  return;
                }
                const totalWeight = validLines.reduce((s, l) => s + l.qty * l.weight_gram, 0);
                const itemsDesc = validLines
                  .map((l) => `${l.qty}x ${l.description} (${l.purity}, ${l.weight_gram}g)`)
                  .join(", ");
                const text = `Sale items: ${itemsDesc}. Total metal weight: ${Math.round(totalWeight * 1000) / 1000}g. Payment mode: ${paymentMode.toUpperCase()}.`;
                setNotes(text);
                toast.success("Notes generated!");
              }}
            >
              ✨ Auto-generate
            </Button>
          </div>
          <Textarea
            className="h-28"
            placeholder="Special invoice notes or auto-generated description..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="space-y-2 text-sm">
          <Row label="Subtotal (metal)" value={formatNPR(totals.subtotal)} />
          <Row label="Making" value={formatNPR(totals.making)} />
          <div className="flex items-center gap-2">
            <Label className="w-32">Discount</Label>
            <Input
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          {shopHasVat && (
            <>
              <div className="flex items-center gap-2">
                <Label className="w-32">VAT %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                />
              </div>
              <Row label="VAT amount" value={formatNPR(totals.vat)} />
            </>
          )}
          <Row label="TOTAL" value={formatNPR(totals.total)} bold />
          <div className="flex items-center gap-2">
            <Label className="w-32">Paid</Label>
            <Input
              type="number"
              step="0.01"
              value={paid}
              onChange={(e) => {
                setPaid(Number(e.target.value));
                setIsPaidEdited(true);
              }}
            />
          </div>
          {totals.due > 0 && <Row label="Due" value={formatNPR(totals.due)} bold />}
        </div>
      </div>

      <DialogFooter className="mt-4 pt-4 border-t border-border/60">
        <Button
          onClick={submit}
          disabled={busy}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileText className="size-4 mr-2" />
          {busy ? "Saving…" : "Save & download PDF"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((ls) =>
      ls.map((l, k) => {
        if (k !== i) return l;
        const next = { ...l, ...patch };
        if (patch.metal !== undefined || patch.purity !== undefined) {
          const isGold = next.metal === "gold";
          const base = isGold ? liveRates.gold : liveRates.silver;
          let r = base;
          if (isGold) {
            const pur = (next.purity || "").toUpperCase();
            if (pur.includes("22K")) r = base * 0.9167;
            else if (pur.includes("21K")) r = base * 0.875;
            else if (pur.includes("18K")) r = base * 0.75;
          }
          next.rate_per_gram = Math.round(r * 100) / 100;
        }
        return next;
      }),
    );
  }
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex justify-between " + (bold ? "font-bold text-base" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
