import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ledger/$partyId")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <LedgerPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Party {
  id: string;
  name: string;
  phone: string | null;
  opening_balance: number;
  type: "customer" | "supplier";
}

interface CreditEntry {
  id: string;
  party_type: string;
  party_id: string;
  entry_date: string;
  debit: number;
  credit: number;
  note: string | null;
  ref_table: string | null;
}

function LedgerPage() {
  const { partyId } = Route.useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [editing, setEditing] = useState<CreditEntry | null>(null);

  async function load() {
    // Try customer first
    let { data: p } = await supabase.from("customers").select("*").eq("id", partyId).maybeSingle();
    let type: "customer" | "supplier" = "customer";
    if (!p) {
      const { data: s } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", partyId)
        .maybeSingle();
      p = s;
      type = "supplier";
    }
    if (p) {
      setParty({ ...p, type } as Party);
      const { data: cData } = await supabase
        .from("credits")
        .select("*")
        .eq("party_id", partyId)
        .order("entry_date");
      setCredits((cData ?? []) as CreditEntry[]);
    }
  }

  useEffect(() => {
    load();
  }, [partyId]);

  function getBalance() {
    if (!party) return 0;
    const sum = credits.reduce((s, x) => s + Number(x.debit) - Number(x.credit), 0);
    return Number(party.opening_balance ?? 0) + sum;
  }

  async function removeEntry(id: string) {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("credits").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from("credits")
      .update({
        entry_date: editing.entry_date,
        debit: editing.debit,
        credit: editing.credit,
        note: editing.note,
      })
      .eq("id", editing.id);

    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      setEditing(null);
      load();
    }
  }

  if (!party) return <div className="p-8 text-center text-muted-foreground">Loading ledger...</div>;

  const currentBal = getBalance();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: party.type === "customer" ? "/customers" : "/suppliers" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{party.name} - Ledger</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {party.type} • {party.phone ?? "No phone"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-3xl font-bold",
              currentBal > 0 ? "text-destructive" : currentBal < 0 ? "text-green-600" : "",
            )}
          >
            {formatNPR(Math.abs(currentBal))}{" "}
            {currentBal > 0
              ? party.type === "customer"
                ? "Dr"
                : "Cr"
              : currentBal < 0
                ? party.type === "customer"
                  ? "Cr"
                  : "Dr"
                : ""}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Receivable</TableHead>
                <TableHead className="text-right">Payable</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30 font-medium">
                <TableCell>—</TableCell>
                <TableCell>Opening Balance</TableCell>
                <TableCell className="text-right" colSpan={2}>
                  {formatNPR(party.opening_balance)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
              {credits.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">{c.entry_date}</TableCell>
                  <TableCell>
                    {c.note || (c.ref_table ? `Generated via ${c.ref_table}` : "—")}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {Number(c.debit) > 0 ? formatNPR(c.debit) : ""}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {Number(c.credit) > 0 ? formatNPR(c.credit) : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...c })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeEntry(c.id)}>
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!credits.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="grid gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editing?.entry_date ?? ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, entry_date: e.target.value } : null))
                }
              />
            </div>
            <div className="grid gap-3">
              {(editing?.debit || 0) > 0 && (
                <div>
                  <Label>Receivable Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing?.debit ?? 0}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, debit: Number(e.target.value) } : null,
                      )
                    }
                  />
                </div>
              )}
              {(editing?.credit || 0) > 0 && (
                <div>
                  <Label>Payable Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing?.credit ?? 0}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, credit: Number(e.target.value) } : null,
                      )
                    }
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={editing?.note ?? ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, note: e.target.value } : null))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
