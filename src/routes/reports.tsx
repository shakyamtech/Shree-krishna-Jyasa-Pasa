import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/reports")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <ReportsPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Sale {
  sale_date: string;
  total: number;
  subtotal: number;
  making_total: number;
  vat_amount: number;
  discount: number;
  due: number;
}
interface SaleItem {
  product_id: string | null;
  qty: number;
  weight_gram: number;
  rate_per_gram: number;
  making_charge: number;
  amount: number;
}
interface PurchaseItem {
  qty: number;
  weight_gram: number;
  rate_per_gram: number;
  making_charge: number;
}
interface Cash {
  entry_date: string;
  direction: "in" | "out";
  category: string;
  amount: number;
}
interface Product {
  id: string;
  name: string;
  cost_price: number;
  stock_qty: number;
}

function ReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [cash, setCash] = useState<Cash[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerDue, setCustomerDue] = useState(0);
  const [supplierDue, setSupplierDue] = useState(0);

  function monthStart() {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }

  async function load() {
    const [s, si, pi, c, p, cust, sup, ce] = await Promise.all([
      supabase
        .from("sales")
        .select("sale_date,total,subtotal,making_total,vat_amount,discount,due")
        .gte("sale_date", from)
        .lte("sale_date", to),
      supabase
        .from("sale_items")
        .select(
          "product_id,qty,weight_gram,rate_per_gram,making_charge,amount,sales!inner(sale_date)",
        )
        .gte("sales.sale_date", from)
        .lte("sales.sale_date", to),
      supabase
        .from("purchase_items")
        .select("qty,weight_gram,rate_per_gram,making_charge,purchases!inner(purchase_date)")
        .gte("purchases.purchase_date", from)
        .lte("purchases.purchase_date", to),
      supabase
        .from("cashbook")
        .select("entry_date,direction,category,amount")
        .gte("entry_date", from)
        .lte("entry_date", to),
      supabase.from("products").select("id,name,cost_price,stock_qty"),
      supabase.from("customers").select("opening_balance"),
      supabase.from("suppliers").select("opening_balance"),
      supabase.from("credits").select("party_type,debit,credit"),
    ]);
    setSales((s.data ?? []) as Sale[]);
    setSaleItems((si.data ?? []) as unknown as SaleItem[]);
    setPurchaseItems((pi.data ?? []) as unknown as PurchaseItem[]);
    setCash((c.data ?? []) as Cash[]);
    setProducts((p.data ?? []) as Product[]);
    let cd = (cust.data ?? []).reduce((s, r) => s + Number(r.opening_balance ?? 0), 0);
    let sd = (sup.data ?? []).reduce((s, r) => s + Number(r.opening_balance ?? 0), 0);
    for (const e of ce.data ?? []) {
      const d = Number(e.debit) - Number(e.credit);
      if (e.party_type === "customer") cd += d;
      else sd -= d;
    }
    setCustomerDue(cd);
    setSupplierDue(sd);
  }
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [from, to]);

  const pl = useMemo(() => {
    const revenue = sales.reduce((s, r) => s + Number(r.total), 0);
    const discount = sales.reduce((s, r) => s + Number(r.discount), 0);
    const vatCollected = sales.reduce((s, r) => s + Number(r.vat_amount), 0);
    const cogs = saleItems.reduce((s, it) => {
      const p = products.find((x) => x.id === it.product_id);
      return s + (p ? Number(p.cost_price) * Number(it.qty) : 0);
    }, 0);
    const expenses = cash
      .filter(
        (x) => x.direction === "out" && !["purchase", "supplier-payment"].includes(x.category),
      )
      .reduce((s, r) => s + Number(r.amount), 0);
    const grossProfit = revenue - vatCollected - cogs;
    const netProfit = grossProfit - expenses;
    return { revenue, discount, vatCollected, cogs, expenses, grossProfit, netProfit };
  }, [sales, saleItems, products, cash]);

  const stockValue = useMemo(
    () => products.reduce((s, p) => s + Number(p.cost_price) * Number(p.stock_qty), 0),
    [products],
  );
  const cashBalance = useMemo(
    () =>
      cash.reduce((s, e) => s + (e.direction === "in" ? Number(e.amount) : -Number(e.amount)), 0),
    [cash],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="sales">Sales summary</TabsTrigger>
        </TabsList>
        <TabsContent value="pl">
          <Card>
            <CardHeader>
              <CardTitle>
                Profit & Loss ({from} → {to})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <Row label="Sales revenue (incl. VAT)" value={formatNPR(pl.revenue)} />
                  <Row label="Less: VAT collected" value={"- " + formatNPR(pl.vatCollected)} />
                  <Row label="Net revenue" value={formatNPR(pl.revenue - pl.vatCollected)} bold />
                  <Row label="Cost of goods sold (estimated)" value={"- " + formatNPR(pl.cogs)} />
                  <Row label="Gross profit" value={formatNPR(pl.grossProfit)} bold />
                  <Row label="Operating expenses" value={"- " + formatNPR(pl.expenses)} />
                  <Row
                    label="NET PROFIT"
                    value={formatNPR(pl.netProfit)}
                    bold
                    cls={pl.netProfit >= 0 ? "text-green-600" : "text-destructive"}
                  />
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                COGS uses each product's cost price × quantity sold.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bs">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet (as of {to})</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Assets</h3>
              <Table>
                <TableBody>
                  <Row label="Cash & bank (period net)" value={formatNPR(cashBalance)} />
                  <Row label="Stock on hand (at cost)" value={formatNPR(stockValue)} />
                  <Row
                    label="Customer dues (receivable)"
                    value={formatNPR(Math.max(0, customerDue))}
                  />
                  <Row
                    label="Total assets"
                    value={formatNPR(cashBalance + stockValue + Math.max(0, customerDue))}
                    bold
                  />
                </TableBody>
              </Table>
              <h3 className="font-semibold mt-6 mb-2">Liabilities</h3>
              <Table>
                <TableBody>
                  <Row
                    label="Supplier dues (payable)"
                    value={formatNPR(Math.max(0, supplierDue))}
                  />
                  <Row label="Total liabilities" value={formatNPR(Math.max(0, supplierDue))} bold />
                </TableBody>
              </Table>
              <Row
                label="Net worth (Assets − Liabilities)"
                value={formatNPR(
                  cashBalance + stockValue + Math.max(0, customerDue) - Math.max(0, supplierDue),
                )}
                bold
                cls="text-primary"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    sales.reduce<Record<string, { count: number; total: number }>>((acc, s) => {
                      const k = s.sale_date;
                      acc[k] ??= { count: 0, total: 0 };
                      acc[k].count += 1;
                      acc[k].total += Number(s.total);
                      return acc;
                    }, {}),
                  )
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([d, v]) => (
                      <TableRow key={d}>
                        <TableCell>{d}</TableCell>
                        <TableCell>{v.count}</TableCell>
                        <TableCell>{formatNPR(v.total)}</TableCell>
                      </TableRow>
                    ))}
                  {!sales.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                        No sales
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  cls,
}: {
  label: string;
  value: string;
  bold?: boolean;
  cls?: string;
}) {
  return (
    <TableRow>
      <TableCell className={bold ? "font-bold" : ""}>{label}</TableCell>
      <TableCell className={"text-right " + (bold ? "font-bold " : "") + (cls ?? "")}>
        {value}
      </TableCell>
    </TableRow>
  );
}
