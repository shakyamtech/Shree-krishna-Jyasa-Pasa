import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers")({
  component: () => <AuthGuard><AppLayout><PartiesPage table="customers" title="Customers" /></AppLayout></AuthGuard>,
});

interface Party {
  id: string; name: string; phone: string | null; address: string | null;
  pan: string | null; opening_balance: number; notes: string | null;
}

interface CreditEntry {
  id: string; party_type: string; party_id: string; entry_date: string;
  debit: number; credit: number; note: string | null; ref_table: string | null;
}

export function PartiesPage({ table, title }: { table: "customers" | "suppliers"; title: string }) {
  const [items, setItems] = useState<Party[]>([]);
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  async function load() {
    const partyType = table.replace(/s$/, "");
    const [{ data: pData }, { data: cData }] = await Promise.all([
      supabase.from(table).select("*").order("name"),
      supabase.from("credits").select("*").eq("party_type", partyType),
    ]);
    setItems((pData ?? []) as Party[]);
    setCredits((cData ?? []) as CreditEntry[]);
  }
  useEffect(() => { load(); }, [table]);

  function getBalance(party: Party) {
    const sum = credits
      .filter((x) => x.party_id === party.id)
      .reduce((s, x) => s + Number(x.debit) - Number(x.credit), 0);
    return Number(party.opening_balance ?? 0) + sum;
  }

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  const filtered = items.filter((i) =>
    (i.name + " " + (i.phone ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="size-4 mr-2" />New</Button></DialogTrigger>
          <PartyForm table={table} editing={editing} onDone={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </div>
      <Card><CardContent className="p-4"><Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} /></CardContent></Card>
      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="whitespace-nowrap">Name</TableHead><TableHead className="whitespace-nowrap">Phone</TableHead><TableHead className="whitespace-nowrap">PAN</TableHead>
            <TableHead className="whitespace-nowrap">Address</TableHead><TableHead className="whitespace-nowrap">Opening</TableHead><TableHead className="whitespace-nowrap">Balance</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const bal = getBalance(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.phone ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.pan ?? "—"}</TableCell>
                  <TableCell className="max-w-[150px] md:max-w-xs truncate">{p.address ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatNPR(p.opening_balance)}</TableCell>
                  <TableCell className={cn("whitespace-nowrap font-semibold", bal > 0 ? "text-destructive" : (bal < 0 ? "text-green-600" : ""))}>
                    {formatNPR(Math.abs(bal))} {bal > 0 ? (table === "customers" ? "Dr" : "Cr") : (bal < 0 ? (table === "customers" ? "Cr" : "Dr") : "")}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/ledger/' + p.id })} title="Ledger & History"><History className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function PartyForm({ table, editing, onDone }: { table: "customers" | "suppliers"; editing: Party | null; onDone: () => void }) {
  const [f, setF] = useState({
    name: editing?.name ?? "", phone: editing?.phone ?? "", address: editing?.address ?? "",
    pan: editing?.pan ?? "", opening_balance: editing?.opening_balance ?? 0, notes: editing?.notes ?? "",
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = editing
      ? await supabase.from(table).update(f).eq("id", editing.id)
      : await supabase.from(table).insert(f);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); onDone();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit" : "New"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid gap-3">
        <div><Label>Name *</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>PAN</Label><Input value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value })} /></div>
        </div>
        <div><Label>Address</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><Label>Opening balance (Rs)</Label><Input type="number" step="0.01" value={f.opening_balance} onChange={(e) => setF({ ...f, opening_balance: Number(e.target.value) })} /></div>
        <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
