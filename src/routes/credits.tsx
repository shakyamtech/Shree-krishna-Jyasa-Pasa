import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/credits")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <CreditsPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Party {
  id: string;
  name: string;
  opening_balance: number;
  phone: string | null;
}
interface Entry {
  id: string;
  party_type: "customer" | "supplier";
  party_id: string;
  entry_date: string;
  debit: number;
  credit: number;
  note: string | null;
  ref_table: string | null;
}

function CreditsPage() {
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const [{ data: c }, { data: s }, { data: e }] = await Promise.all([
      supabase.from("customers").select("id,name,phone,opening_balance").order("name"),
      supabase.from("suppliers").select("id,name,phone,opening_balance").order("name"),
      supabase.from("credits").select("*"),
    ]);
    setCustomers((c ?? []) as Party[]);
    setSuppliers((s ?? []) as Party[]);
    setEntries((e ?? []) as Entry[]);
  }
  useEffect(() => {
    load();
  }, []);

  function balanceFor(type: "customer" | "supplier", party: Party): number {
    const sum = entries
      .filter((x) => x.party_type === type && x.party_id === party.id)
      .reduce((s, x) => s + Number(x.debit) - Number(x.credit), 0);
    // For customers: positive = they owe us. For suppliers: positive = we owe them (because we treat credit as supplier's bill)
    return Number(party.opening_balance ?? 0) + sum;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Credits / Dues</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Receive / Pay
            </Button>
          </DialogTrigger>
          <PaymentForm
            customers={customers}
            suppliers={suppliers}
            onDone={() => {
              setOpen(false);
              load();
            }}
          />
        </Dialog>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <PartyList type="customer" parties={customers} balanceFor={balanceFor} />
        </TabsContent>
        <TabsContent value="suppliers">
          <PartyList type="supplier" parties={suppliers} balanceFor={balanceFor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PartyList({
  type,
  parties,
  balanceFor,
}: {
  type: "customer" | "supplier";
  parties: Party[];
  balanceFor: (t: "customer" | "supplier", p: Party) => number;
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>{type === "customer" ? "Customer owes us" : "We owe supplier"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties.map((p) => {
              const bal = balanceFor(type, p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone ?? "—"}</TableCell>
                  <TableCell
                    className={bal > 0 ? "text-destructive font-medium" : "text-green-600"}
                  >
                    {formatNPR(bal)}
                  </TableCell>
                </TableRow>
              );
            })}
            {!parties.length && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  None
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentForm({
  customers,
  suppliers,
  onDone,
}: {
  customers: Party[];
  suppliers: Party[];
  onDone: () => void;
}) {
  const [f, setF] = useState({
    party_type: "customer" as "customer" | "supplier",
    party_id: "",
    entry_date: todayISO(),
    amount: 0,
    payment_mode: "cash",
    note: "",
  });
  const list = f.party_type === "customer" ? customers : suppliers;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.party_id) return toast.error("Select a party");
    if (f.amount <= 0) return toast.error("Amount must be > 0");
    // Customer payment received: credit = amount (reduces what they owe)
    // Supplier payment made: debit = amount (reduces what we owe)
    const debit = f.party_type === "supplier" ? f.amount : 0;
    const credit = f.party_type === "customer" ? f.amount : 0;
    const { error } = await supabase.from("credits").insert({
      party_type: f.party_type,
      party_id: f.party_id,
      entry_date: f.entry_date,
      debit,
      credit,
      note: f.note || (f.party_type === "customer" ? "Payment received" : "Payment made"),
    });
    if (error) return toast.error(error.message);
    await supabase.from("cashbook").insert({
      entry_date: f.entry_date,
      direction: f.party_type === "customer" ? "in" : "out",
      category: f.party_type === "customer" ? "customer-payment" : "supplier-payment",
      amount: f.amount,
      party_type: f.party_type,
      party_id: f.party_id,
      payment_mode: f.payment_mode,
      note: f.note,
    });
    toast.success("Saved");
    onDone();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Receive / Pay</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select
              value={f.party_type}
              onValueChange={(v) =>
                setF({ ...f, party_type: v as "customer" | "supplier", party_id: "" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Receive from customer</SelectItem>
                <SelectItem value="supplier">Pay to supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={f.entry_date}
              onChange={(e) => setF({ ...f, entry_date: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>{f.party_type === "customer" ? "Customer" : "Supplier"}</Label>
          <Select value={f.party_id} onValueChange={(v) => setF({ ...f, party_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {list.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount (Rs)</Label>
            <Input
              type="number"
              step="0.01"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={f.payment_mode} onValueChange={(v) => setF({ ...f, payment_mode: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
                <SelectItem value="khalti">Khalti</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Note</Label>
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
