import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR, formatGram } from "@/lib/format";

export const Route = createFileRoute("/products")({
  component: () => <AuthGuard><AppLayout><ProductsPage /></AppLayout></AuthGuard>,
});

interface Product {
  id: string; sku: string | null; name: string; metal: string; purity: string | null;
  weight_gram: number; making_charge: number; stock_qty: number; min_stock: number;
  cost_price: number; category_id: string | null;
}
interface Category { id: string; name: string; metal: string }

function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setItems((p ?? []) as Product[]);
    setCats((c ?? []) as Category[]);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  const filtered = items.filter((i) => {
    if (selectedCat !== "all" && i.category_id !== selectedCat) return false;
    const catName = cats.find((c) => c.id === i.category_id)?.name ?? "";
    return [i.name, i.sku, i.purity, catName].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Products & Stock</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="size-4 mr-2" />New product</Button>
          </DialogTrigger>
          <ProductForm cats={cats} editing={editing} onDone={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </div>

      <Card><CardContent className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Search by name, SKU, category, purity…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-56">
          <Select value={selectedCat} onValueChange={setSelectedCat}>
            <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Metal</TableHead>
              <TableHead>Purity</TableHead><TableHead>Weight</TableHead><TableHead>Stock</TableHead>
              <TableHead>Making</TableHead><TableHead>Cost</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.sku ?? "—"}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant={p.metal === "gold" ? "default" : "secondary"} className="capitalize">{p.metal}</Badge></TableCell>
                <TableCell>{p.purity ?? "—"}</TableCell>
                <TableCell>{formatGram(p.weight_gram)}</TableCell>
                <TableCell>
                  <span className={p.stock_qty <= p.min_stock ? "text-destructive font-medium" : ""}>
                    {p.stock_qty}
                  </span>
                </TableCell>
                <TableCell>{formatNPR(p.making_charge)}</TableCell>
                <TableCell>{formatNPR(p.cost_price)}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No products</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function ProductForm({ cats, editing, onDone }: { cats: Category[]; editing: Product | null; onDone: () => void }) {
  const [f, setF] = useState({
    sku: editing?.sku ?? "",
    name: editing?.name ?? "",
    category_id: editing?.category_id ?? "",
    metal: (editing?.metal ?? "gold") as "gold" | "silver" | "other",
    purity: editing?.purity ?? "22K",
    weight_gram: editing?.weight_gram ?? 0,
    making_charge: editing?.making_charge ?? 0,
    stock_qty: editing?.stock_qty ?? 1,
    min_stock: editing?.min_stock ?? 1,
    cost_price: editing?.cost_price ?? 0,
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...f, category_id: f.category_id || null, sku: f.sku || null };
    const res = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Added");
    onDone();
  }
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>SKU <span className="text-[10px] font-normal text-muted-foreground">(Stock Keeping Unit / ID)</span></Label>
          <Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} placeholder="e.g. RNG-GLD-001" />
        </div>
        <div><Label>Name *</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div>
          <Label>Category</Label>
          <Select value={f.category_id} onValueChange={(v) => setF({ ...f, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Metal</Label>
          <Select value={f.metal} onValueChange={(v) => setF({ ...f, metal: v as "gold" | "silver" | "other" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Purity</Label><Input value={f.purity} onChange={(e) => setF({ ...f, purity: e.target.value })} placeholder="24K / 22K / 999" /></div>
        <div><Label>Weight (gram)</Label><Input type="number" step="0.001" value={f.weight_gram} onChange={(e) => setF({ ...f, weight_gram: Number(e.target.value) })} /></div>
        <div><Label>Making charge (Rs)</Label><Input type="number" step="0.01" value={f.making_charge} onChange={(e) => setF({ ...f, making_charge: Number(e.target.value) })} /></div>
        <div><Label>Cost price (Rs)</Label><Input type="number" step="0.01" value={f.cost_price} onChange={(e) => setF({ ...f, cost_price: Number(e.target.value) })} /></div>
        <div><Label>Stock qty</Label><Input type="number" value={f.stock_qty} onChange={(e) => setF({ ...f, stock_qty: Number(e.target.value) })} /></div>
        <div><Label>Min stock alert</Label><Input type="number" value={f.min_stock} onChange={(e) => setF({ ...f, min_stock: Number(e.target.value) })} /></div>
        <DialogFooter className="md:col-span-2"><Button type="submit">{editing ? "Update" : "Add"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
