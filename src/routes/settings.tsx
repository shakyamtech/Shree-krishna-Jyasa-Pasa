import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Users, Check, Sparkles } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <SettingsPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Shop {
  id: string;
  shop_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  pan_vat: string | null;
  vat_rate: number;
  currency: string;
  invoice_prefix: string;
  bill_footer: string | null;
  logo_url: string | null;
}

interface StaffItem {
  user_id: string;
  role_id: string;
  full_name: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  metal: "gold" | "silver" | "other";
  parent_id: string | null;
}

function SettingsPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStaff = role === "staff";
  const [s, setS] = useState<Shop | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedTheme, setSavedTheme] = useState("default");
  const [ownerName, setOwnerName] = useState(
    () => localStorage.getItem("custom_owner_name") || "Mahesh",
  );
  const [staffName, setStaffName] = useState(() => localStorage.getItem("custom_staff_name") || "");
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [openStaffModal, setOpenStaffModal] = useState(false);
  const [wiping, setWiping] = useState(false);

  // Category management state
  const [cats, setCats] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState({ name: "", metal: "gold" as const, parent_id: "" });
  const [busyCat, setBusyCat] = useState(false);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCats((data || []) as Category[]);
  }

  async function addCategory() {
    if (!newCat.name.trim()) return toast.error("Enter category name");
    setBusyCat(true);
    const { error } = await supabase.from("categories").insert({
      name: newCat.name.trim(),
      metal: newCat.metal,
      parent_id: newCat.parent_id || null,
    });
    setBusyCat(false);
    if (error) toast.error(error.message);
    else {
      setNewCat({ ...newCat, name: "", parent_id: "" });
      loadCategories();
      toast.success("Category added");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Are you sure? Products using this category will have it unassigned.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      loadCategories();
      toast.success("Category deleted");
    }
  }

  async function seedCategories() {
    const list = [
      "Magal Sutra",
      "Top",
      "Tilhari",
      "Jhumka",
      "Bracelet",
      "Mundra",
      "Rani Haar",
      "Pure Gold",
    ];
    setBusyCat(true);
    try {
      for (const name of list) {
        // Only insert if it doesn't exist
        const exists = cats.some((c) => c.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          await supabase.from("categories").insert({ name, metal: "gold" });
        }
      }
      loadCategories();
      toast.success("Categories seeded!");
    } catch (e) {
      toast.error("Failed to seed");
    } finally {
      setBusyCat(false);
    }
  }

  async function wipeAllSales() {
    const code = prompt("DANGER: Type 'DELETE' to wipe all sales records and reverse inventory.");
    if (code !== "DELETE") return;
    setWiping(true);
    try {
      const { data: items } = await supabase.from("sale_items").select("product_id, qty");
      const { data: products } = await supabase.from("products").select("id, stock_qty");
      if (items && products) {
        const restoreMap: Record<string, number> = {};
        for (const it of items) {
          if (it.product_id) restoreMap[it.product_id] = (restoreMap[it.product_id] || 0) + it.qty;
        }
        for (const pid of Object.keys(restoreMap)) {
          const prod = products.find((p) => p.id === pid);
          if (prod) {
            await supabase
              .from("products")
              .update({ stock_qty: prod.stock_qty + restoreMap[pid] })
              .eq("id", pid);
          }
        }
      }
      await supabase
        .from("stock_movements")
        .delete()
        .eq("ref_table", "sales")
        .not("id", "is", null);
      await supabase.from("cashbook").delete().eq("ref_table", "sales").not("id", "is", null);
      await supabase.from("credits").delete().eq("ref_table", "sales").not("id", "is", null);
      await supabase.from("sale_items").delete().not("id", "is", null);
      const { error } = await supabase.from("sales").delete().not("id", "is", null);

      if (error) throw error;
      toast.success("All sales records have been wiped.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setWiping(false);
    }
  }

  useEffect(() => {
    setSavedTheme(localStorage.getItem("app_theme") || "default");
    const stored = localStorage.getItem("custom_owner_name");
    if (stored) setOwnerName(stored);
    loadCategories();
    supabase
      .from("shop_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Shop & { owner_name?: string };
          setS(d);
          if (d.owner_name) setOwnerName(d.owner_name);
        }
      });

    if (role && role !== "staff") {
      setLoadingStaff(true);
      supabase
        .from("user_roles")
        .select("*")
        .eq("role", "staff")
        .then(async ({ data: roles }) => {
          if (roles && roles.length > 0) {
            const userIds = roles.map((r) => r.user_id);
            const { data: profs } = await supabase
              .from("profiles")
              .select("*")
              .in("user_id", userIds);
            const merged: StaffItem[] = roles.map((r) => {
              const p = profs?.find((x) => x.user_id === r.user_id);
              return {
                user_id: r.user_id,
                role_id: r.id,
                full_name: p?.full_name || "",
                created_at: r.created_at,
              };
            });
            setStaffList(merged);
          }
          setLoadingStaff(false);
        });
    }
  }, [role]);

  async function save() {
    if (!s || isStaff) return;
    setBusy(true);
    localStorage.setItem("custom_owner_name", ownerName.trim() || "Mahesh");
    window.dispatchEvent(new Event("storage"));

    const payload: Partial<Shop> = {
      shop_name: s.shop_name,
      address: s.address,
      phone: s.phone,
      email: s.email,
      pan_vat: s.pan_vat,
      vat_rate: s.vat_rate,
      currency: s.currency,
      invoice_prefix: s.invoice_prefix,
      bill_footer: s.bill_footer,
      logo_url: s.logo_url,
    };

    const { error } = await supabase.from("shop_settings").update(payload).eq("id", s.id);
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Saved successfully");
    window.dispatchEvent(new Event("storage"));
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 150);
  }

  function handleUpdateStaffName(userId: string, newName: string) {
    const trimmed = newName.trim();
    setStaffList((prev) =>
      prev.map((item) => (item.user_id === userId ? { ...item, full_name: trimmed } : item)),
    );

    // Guaranteed local administrative visibility & session storage override broadcast
    localStorage.setItem("custom_staff_name", trimmed);
    localStorage.setItem(`staff_name_${userId}`, trimmed);
    window.dispatchEvent(new Event("storage"));

    // Completely non-blocking background metadata sync
    supabase
      .from("profiles")
      .update({
        full_name: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .then(() => {});

    toast.success("Staff profile display name assigned successfully");
  }

  async function handleDeleteStaff(roleId: string) {
    if (
      !confirm(
        "Are you sure you want to permanently revoke staff dashboard access and remove this user mapping?",
      )
    )
      return;
    setStaffList((prev) => prev.filter((item) => item.role_id !== roleId));
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Staff mapping removed. Access completely revoked.");
    }
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
              <div className="md:col-span-2">
                <Label>Owner name</Label>
                <Input
                  value={ownerName}
                  disabled={isStaff}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Mahesh"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Shop name</Label>
                <Input
                  value={s.shop_name}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, shop_name: e.target.value })}
                />
              </div>
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
                    <img
                      src={s.logo_url}
                      alt="Logo preview"
                      className="h-10 w-auto object-contain rounded border p-1 bg-background"
                    />
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={s.address ?? ""}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, address: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={s.phone ?? ""}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={s.email ?? ""}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, email: e.target.value })}
                />
              </div>
              <div>
                <Label>PAN / VAT no.</Label>
                <Input
                  value={s.pan_vat ?? ""}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, pan_vat: e.target.value })}
                />
              </div>
              <div>
                <Label>VAT rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={s.vat_rate}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, vat_rate: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={s.currency}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, currency: e.target.value })}
                />
              </div>
              <div>
                <Label>Invoice prefix</Label>
                <Input
                  value={s.invoice_prefix}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, invoice_prefix: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Bill footer text</Label>
                <Textarea
                  value={s.bill_footer ?? ""}
                  disabled={isStaff}
                  onChange={(e) => setS({ ...s, bill_footer: e.target.value })}
                  placeholder="Thank you for shopping with us!"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Categories</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Add or remove product categories like Magal Sutra, Jhumka, etc.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={seedCategories}
                disabled={busyCat}
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <Sparkles className="size-3.5 mr-1" /> Quick add requested
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Category name (e.g. Fulbutte)..."
                      value={newCat.name}
                      onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newCat.parent_id}
                      onChange={(e) => setNewCat({ ...newCat, parent_id: e.target.value })}
                    >
                      <option value="">Main category (None)</option>
                      {cats
                        .filter((c) => !c.parent_id)
                        .map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            Under: {pc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newCat.metal}
                      onChange={(e) =>
                        setNewCat({ ...newCat, metal: e.target.value as any })
                      }
                    >
                      <option value="gold">Metal: Gold</option>
                      <option value="silver">Metal: Silver</option>
                      <option value="other">Metal: Other</option>
                    </select>
                  </div>
                  <Button onClick={addCategory} disabled={busyCat} size="sm" className="shrink-0 sm:w-32">
                    <Plus className="size-4 mr-1" /> Create
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Category Name</th>
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cats
                        .filter((c) => !c.parent_id)
                        .map((parent) => (
                          <React.Fragment key={parent.id}>
                            <tr className="bg-muted/10">
                              <td className="p-2 font-bold">{parent.name}</td>
                              <td className="p-2 capitalize text-[10px] text-muted-foreground">
                                Main ({parent.metal})
                              </td>
                              <td className="p-1 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteCategory(parent.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                            {cats
                              .filter((child) => child.parent_id === parent.id)
                              .map((child) => (
                                <tr key={child.id} className="hover:bg-muted/30">
                                  <td className="p-2 pl-8 text-muted-foreground flex items-center gap-1">
                                    <div className="w-2 h-2 border-l border-b border-muted-foreground/30 -mt-2"></div>
                                    {child.name}
                                  </td>
                                  <td className="p-2 capitalize text-[10px] text-muted-foreground">
                                    Sub-type
                                  </td>
                                  <td className="p-1 text-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteCategory(child.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        ))}
                      {!cats.length && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-muted-foreground">
                            No categories defined yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Appearance & Theme (Takes 1 grid column) */}
        <div className="space-y-4">
          {isStaff && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-400">
                  Personal Display Credentials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-xs">Your Staff Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 text-xs bg-background flex-1"
                      placeholder="e.g. Mahesh Shakya"
                      value={staffName}
                      onChange={(e) => {
                        setStaffName(e.target.value);
                        localStorage.setItem("custom_staff_name", e.target.value);
                        window.dispatchEvent(new Event("storage"));
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                      onClick={async () => {
                        const trimmed = staffName.trim();
                        localStorage.setItem("custom_staff_name", trimmed);
                        window.dispatchEvent(new Event("storage"));

                        const {
                          data: { session },
                        } = await supabase.auth.getSession();
                        if (session?.user?.id) {
                          await supabase
                            .from("profiles")
                            .update({
                              full_name: trimmed,
                              updated_at: new Date().toISOString(),
                            })
                            .eq("user_id", session.user.id);
                        }
                        toast.success("Staff profile display name saved permanently!");
                      }}
                    >
                      Save Name
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Instantly updates your top header identity indicator
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Appearance & Theme</CardTitle>
              <p className="text-xs text-muted-foreground">
                Select your premium brand interface profile
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                type="button"
                onClick={() => handleThemeChange("default")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden w-full cursor-pointer",
                  savedTheme === "default"
                    ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5"
                    : "hover:bg-accent",
                )}
              >
                <div className="size-10 rounded-md bg-[#fbf8f3] border flex items-center justify-center shrink-0">
                  <span className="size-3.5 rounded-full bg-amber-500 shadow-xs"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Amber Base</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Warm classic workflow
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("gold")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden w-full cursor-pointer",
                  savedTheme === "gold"
                    ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-400/5"
                    : "hover:bg-accent",
                )}
              >
                <div className="size-10 rounded-md bg-[#120000] border border-white/10 flex items-center justify-center shrink-0">
                  <span className="size-3.5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-950 shadow-xs"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Gold Shimmer</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Obsidian premium luxury
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("sapphire")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden w-full cursor-pointer",
                  savedTheme === "sapphire"
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5"
                    : "hover:bg-accent",
                )}
              >
                <div className="size-10 rounded-md bg-[#f2f6fc] border flex items-center justify-center shrink-0">
                  <span className="size-3.5 rounded-full bg-blue-600 shadow-xs"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Aesthetic Blue</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Crisp light & deep indigo
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5 shadow-none mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-600 flex items-center gap-2 text-lg">
                <Trash2 className="size-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Wipe All Sales Records</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Permanently delete all generated invoices, reverse stock quantities, and remove
                    associated ledger entries. This is used to clear test data before going live.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={wipeAllSales}
                  disabled={wiping}
                  className="shrink-0"
                >
                  {wiping ? "Wiping..." : "Delete All Sales"}
                </Button>
              </div>
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
