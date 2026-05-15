import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/cashbook")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <CashbookPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Entry {
  id: string;
  entry_date: string;
  direction: "in" | "out";
  category: string;
  amount: number;
  payment_mode: string;
  note: string | null;
}

function CashbookPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    let q = supabase
      .from("cashbook")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(500);
    if (from) q = q.gte("entry_date", from);
    if (to) q = q.lte("entry_date", to);
    const { data } = await q;
    setItems((data ?? []) as Entry[]);
  }
  useEffect(() => {
    load();
  }, [from, to]);

  const totals = useMemo(() => {
    let inn = 0,
      out = 0;
    for (const e of items) {
      if (e.direction === "in") inn += Number(e.amount);
      else out += Number(e.amount);
    }
    return { in: inn, out, balance: inn - out };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Cashbook</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              New entry
            </Button>
          </DialogTrigger>
          <EntryForm
            onDone={() => {
              setOpen(false);
              load();
            }}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-4 md:grid-cols-4 items-start">
          <div>
            <Label className="text-xs text-muted-foreground block mb-1.5 font-normal">From</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground block mb-1.5 font-normal">To</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Stat label="Cash in" value={formatNPR(totals.in)} cls="text-green-600" />
          <Stat label="Cash out" value={formatNPR(totals.out)} cls="text-destructive" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex justify-between font-bold">
          <span>Net balance</span>
          <span className={totals.balance >= 0 ? "text-green-600" : "text-destructive"}>
            {formatNPR(totals.balance)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.entry_date}</TableCell>
                  <TableCell>
                    <Badge variant={e.direction === "in" ? "default" : "destructive"}>
                      {e.direction === "in" ? "IN" : "OUT"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{e.category}</TableCell>
                  <TableCell className="capitalize">{e.payment_mode}</TableCell>
                  <TableCell
                    className={
                      "font-medium " +
                      (e.direction === "in" ? "text-green-600" : "text-destructive")
                    }
                  >
                    {formatNPR(e.amount)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{e.note ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No entries
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

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="text-xs text-muted-foreground block mb-1.5">{label}</div>
      <div className={"text-lg font-bold flex items-center h-9 " + (cls ?? "")}>{value}</div>
    </div>
  );
}

function EntryForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    entry_date: todayISO(),
    direction: "in" as "in" | "out",
    category: "other",
    amount: 0,
    payment_mode: "cash",
    note: "",
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.amount <= 0) return toast.error("Amount must be > 0");
    const { error } = await supabase.from("cashbook").insert(f);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onDone();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Cashbook entry</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={f.entry_date}
              onChange={(e) => setF({ ...f, entry_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={f.direction}
              onValueChange={(v) => setF({ ...f, direction: v as "in" | "out" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Cash IN</SelectItem>
                <SelectItem value="out">Cash OUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="customer-payment">Customer payment</SelectItem>
                <SelectItem value="supplier-payment">Supplier payment</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment mode</Label>
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
          <Label>Amount (Rs)</Label>
          <Input
            type="number"
            step="0.01"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: Number(e.target.value) })}
          />
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
