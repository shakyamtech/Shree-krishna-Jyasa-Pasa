import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
import { formatNPR, formatGram, formatTola } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products")({
  component: () => (
    <AuthGuard>
      <AppLayout>
        <ProductsPage />
      </AppLayout>
    </AuthGuard>
  ),
});

interface Product {
  id: string;
  sku: string | null;
  name: string;
  metal: string;
  purity: string | null;
  weight_gram: number;
  making_charge: number;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
  category_id: string | null;
  jarti_percent: number;
}
interface Category {
  id: string;
  name: string;
  metal: "gold" | "silver" | "other";
  parent_id: string | null;
}

function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("app_theme") || "default" : "default",
  );

  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem("app_theme") || "default");
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setItems((p ?? []) as Product[]);
    setCats((c ?? []) as Category[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  function getCategoryName(id: string | null) {
    if (!id) return "—";
    const cat = cats.find((c) => c.id === id);
    if (!cat) return "—";
    if (cat.parent_id) {
      const parent = cats.find((c) => c.id === cat.parent_id);
      return parent ? `${parent.name} > ${cat.name}` : cat.name;
    }
    return cat.name;
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      // 1. Category Filter
      if (selectedCat !== "all") {
        const isMatch = i.category_id === selectedCat;
        const cat = cats.find((c) => c.id === i.category_id);
        const isChildMatch = cat?.parent_id === selectedCat;
        if (!isMatch && !isChildMatch) return false;
      }

      // 2. Search Filter
      if (!search) return true;
      const catName = getCategoryName(i.category_id);
      return [i.name, i.sku, i.purity, catName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [items, cats, selectedCat, search]);

  // Group products by their main category
  const groupedProducts = useMemo(() => {
    const groups: Record<
      string,
      { name: string; items: Product[]; totalWeight: number; totalStock: number }
    > = {};

    filtered.forEach((p) => {
      const cat = cats.find((c) => c.id === p.category_id);
      const parent = cat?.parent_id ? cats.find((c) => c.id === cat.parent_id) : null;
      const mainCat = parent || cat;
      const mainId = mainCat?.id || "unclassified";
      const mainName = mainCat?.name || "Unclassified";

      if (!groups[mainId]) {
        groups[mainId] = { name: mainName, items: [], totalWeight: 0, totalStock: 0 };
      }
      groups[mainId].items.push(p);
      groups[mainId].totalWeight += p.weight_gram * p.stock_qty;
      groups[mainId].totalStock += p.stock_qty;
    });

    return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filtered, cats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Products & Stock</h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4 mr-2" />
              New product
            </Button>
          </DialogTrigger>
          <ProductForm
            key={editing?.id ?? "new"}
            cats={cats}
            editing={editing}
            onDone={() => {
              setOpen(false);
              setEditing(null);
              load();
            }}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, SKU, category, purity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select value={selectedCat} onValueChange={setSelectedCat}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {cats
                  .filter((c) => !c.parent_id)
                  .map((parent) => (
                    <React.Fragment key={parent.id}>
                      <SelectItem value={parent.id} className="font-bold">
                        {parent.name}
                      </SelectItem>
                      {cats
                        .filter((child) => child.parent_id === parent.id)
                        .map((child) => (
                          <SelectItem key={child.id} value={child.id} className="pl-6 text-xs">
                            — {child.name}
                          </SelectItem>
                        ))}
                    </React.Fragment>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Grouped View */}
      <div className="space-y-6 pb-12">
        {groupedProducts.map(([id, group]) => {
          const isExpanded = expandedCats[id] !== false; // Default to expanded? Or collapsed?
          // User said "when click this neclace card it will show these childrens", implying collapsed by default or at least interactive.
          // Usually, for inventory, seeing everything is good, but user wants it hidden.
          // Let's go with collapsed by default if not searched.
          const effectivelyExpanded = search.length > 0 || expandedCats[id] === true;

          return (
            <div key={id} className="space-y-4">
              <button
                onClick={() => setExpandedCats((prev) => ({ ...prev, [id]: !effectivelyExpanded }))}
                className="w-full flex items-center gap-4 group/header"
              >
                <div className="h-px flex-1 bg-border/60 group-hover/header:bg-amber-500/30 transition-colors"></div>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex items-center gap-6 px-8 py-3 rounded-full border border-border/80 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] gold-glow",
                      theme === "gold"
                        ? effectivelyExpanded
                          ? "bg-zinc-950 text-amber-500 border-amber-500/30"
                          : "bg-amber-500 text-black border-amber-600"
                        : "bg-white dark:bg-card/50 backdrop-blur-md text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-black uppercase tracking-widest whitespace-nowrap",
                        theme === "gold" && !effectivelyExpanded ? "" : "gold-shimmer",
                      )}
                    >
                      {group.name}
                    </span>
                    <div
                      className={cn(
                        "w-px h-5 mx-1",
                        theme === "gold" && !effectivelyExpanded ? "bg-black/20" : "bg-border/60",
                      )}
                    ></div>
                    <div className="flex flex-col items-center leading-tight">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          theme === "gold"
                            ? effectivelyExpanded
                              ? "text-amber-400"
                              : "text-black"
                            : "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {formatGram(group.totalWeight)}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          theme === "gold"
                            ? effectivelyExpanded
                              ? "text-amber-400/70"
                              : "text-black/70"
                            : "text-amber-600/70 dark:text-amber-400/70",
                        )}
                      >
                        {formatTola(group.totalWeight)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-black uppercase tracking-tighter",
                        theme === "gold"
                          ? effectivelyExpanded
                            ? "text-amber-400/40"
                            : "text-black/40"
                          : "text-amber-600/40 dark:text-amber-400/40",
                      )}
                    >
                      Total
                    </span>
                    <div className="flex items-center gap-4 ml-1">
                      <span
                        className={cn(
                          "text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap border",
                          theme === "gold"
                            ? effectivelyExpanded
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-black/10 text-black border-black/20"
                            : "bg-muted/50 text-muted-foreground border-border/40",
                        )}
                      >
                        {group.totalStock} units
                      </span>
                      {effectivelyExpanded ? (
                        <ChevronUp
                          className={cn(
                            "size-5",
                            theme === "gold" && !effectivelyExpanded
                              ? "text-black"
                              : "text-muted-foreground",
                          )}
                        />
                      ) : (
                        <ChevronDown
                          className={cn(
                            "size-5",
                            theme === "gold" && !effectivelyExpanded
                              ? "text-black"
                              : "text-muted-foreground",
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-px flex-1 bg-border/60 group-hover/header:bg-amber-500/30 transition-colors"></div>
              </button>

              {effectivelyExpanded && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {group.items.map((p) => (
                    <Card
                      key={p.id}
                      className={cn(
                        "overflow-hidden flex flex-col group transition-all hover:shadow-xl",
                        theme === "gold"
                          ? "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-black border-none rounded-tl-none rounded-tr-3xl rounded-bl-3xl rounded-br-3xl shadow-amber-500/20"
                          : "border border-border/80 dark:border-amber-500/20 dark:bg-card/40 hover:border-amber-500/50 hover:shadow-amber-500/5 rounded-xl",
                      )}
                    >
                      <CardContent className="p-4 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "font-bold text-base leading-tight truncate transition-colors",
                                theme === "gold" ? "text-black" : "text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400",
                              )}
                            >
                              {p.name}
                            </div>
                            <div
                              className={cn(
                                "text-[10px] font-semibold mt-0.5 truncate",
                                theme === "gold" ? "text-black/60" : "text-amber-600 dark:text-amber-500",
                              )}
                            >
                              {getCategoryName(p.category_id)}
                            </div>
                            <div
                              className={cn(
                                "text-[10px] font-mono mt-1",
                                theme === "gold" ? "text-black/40" : "text-muted-foreground",
                              )}
                            >
                              SKU: {p.sku ?? "—"}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge
                              variant={p.metal === "gold" ? "default" : "secondary"}
                              className={cn(
                                "capitalize text-[10px] px-2 py-0.5 font-medium",
                                theme === "gold" && "bg-black text-amber-500 border-none",
                              )}
                            >
                              {p.metal}
                            </Badge>
                            {p.purity && (
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                  theme === "gold" ? "bg-black/10 text-black" : "bg-muted text-muted-foreground",
                                )}
                              >
                                {p.purity}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "grid grid-cols-2 gap-3 pt-3 border-t text-xs",
                            theme === "gold" ? "border-black/10" : "border-border/80",
                          )}
                        >
                          <div>
                            <span
                              className={cn(
                                "block text-[10px] uppercase font-bold tracking-tight",
                                theme === "gold" ? "text-black/50" : "text-muted-foreground",
                              )}
                            >
                              Weight
                            </span>
                            <span className="font-semibold text-sm">
                              {formatGram(p.weight_gram)}
                            </span>
                            <div
                              className={cn(
                                "text-[10px] font-medium italic mt-0.5",
                                theme === "gold" ? "text-black/60" : "text-muted-foreground",
                              )}
                            >
                              {formatTola(p.weight_gram)}
                            </div>
                          </div>
                          <div>
                            <span
                              className={cn(
                                "block text-[10px] uppercase font-bold tracking-tight",
                                theme === "gold" ? "text-black/50" : "text-muted-foreground",
                              )}
                            >
                              In Stock
                            </span>
                            <span
                              className={cn(
                                "font-semibold text-sm",
                                theme === "gold"
                                  ? "text-black"
                                  : p.stock_qty <= p.min_stock && "text-destructive font-black animate-pulse",
                              )}
                            >
                              {p.stock_qty} {p.stock_qty <= p.min_stock && "⚠️"}
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      <div
                        className={cn(
                          "p-2 border-t flex items-center justify-end gap-1",
                          theme === "gold" ? "bg-black/5 border-black/10" : "bg-muted/30 border-border/80",
                        )}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-8 px-3 text-xs gap-1.5",
                            theme === "gold"
                              ? "text-black hover:bg-black/10"
                              : "hover:bg-amber-500/10 hover:text-amber-600",
                          )}
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-8 px-3 text-xs gap-1.5",
                            theme === "gold"
                              ? "text-black hover:bg-black/10"
                              : "hover:bg-destructive/10 hover:text-destructive",
                          )}
                          onClick={() => remove(p.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!groupedProducts.length && (
          <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            <div className="text-lg font-medium">No products found</div>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductForm({
  cats,
  editing,
  onDone,
}: {
  cats: Category[];
  editing: Product | null;
  onDone: () => void;
}) {
  // Derived main category ID for UI selection
  const initialMainCatId = useMemo(() => {
    if (!editing?.category_id) return "";
    const cat = cats.find((c) => c.id === editing.category_id);
    return cat?.parent_id || cat?.id || "";
  }, [editing, cats]);

  const [mainCatId, setMainCatId] = useState(initialMainCatId);

  const [f, setF] = useState({
    sku: editing?.sku ?? "",
    name: editing?.name ?? "",
    category_id: editing?.category_id ?? "",
    metal: (editing?.metal ?? "gold") as "gold" | "silver" | "other",
    purity: editing?.purity ?? "24K",
    weight_gram: editing?.weight_gram ?? 0,
    making_charge: editing?.making_charge ?? 0,
    stock_qty: editing?.stock_qty ?? 1,
    min_stock: editing?.min_stock ?? 1,
    cost_price: editing?.cost_price ?? 0,
    jarti_percent: editing?.jarti_percent ?? 0,
  });

  // Re-sync mainCatId when editing changes (if not remounted by key)
  useEffect(() => {
    setMainCatId(initialMainCatId);
  }, [initialMainCatId]);

  const subCategories = useMemo(() => {
    if (!mainCatId) return [];
    return cats.filter((c) => c.parent_id === mainCatId);
  }, [mainCatId, cats]);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({
    gold: 22235.03,
    silver: 492.5,
  });

  useEffect(() => {
    supabase
      .from("metal_prices")
      .select("metal, price_per_gram, price_per_tola")
      .order("fetched_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const map = { gold: 22235.03, silver: 492.5 };
        const gp = data?.find((x) => x.metal === "gold");
        if (gp?.price_per_gram) map.gold = Number(gp.price_per_gram);

        const sp = data?.find((x) => x.metal === "silver" && x.price_per_tola < 10000);
        if (sp?.price_per_gram) map.silver = Number(sp.price_per_gram);
        setLiveRates(map);
      });
  }, []);
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
      <DialogHeader>
        <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>
            SKU{" "}
            <span className="text-[10px] font-normal text-muted-foreground">
              (Stock Keeping Unit / ID)
            </span>
          </Label>
          <Input
            value={f.sku}
            onChange={(e) => setF({ ...f, sku: e.target.value })}
            placeholder="e.g. RNG-GLD-001"
          />
        </div>
        <div>
          <Label>Name *</Label>
          <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <Label>Main Category</Label>
          <Select
            value={mainCatId}
            onValueChange={(v) => {
              setMainCatId(v);
              // If we pick a new main category, set product to the main category by default
              // unless sub-categories exist
              setF({ ...f, category_id: v });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Main Category" />
            </SelectTrigger>
            <SelectContent>
              {cats
                .filter((c) => !c.parent_id)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {subCategories.length > 0 && (
          <div>
            <Label>Sub-category (Design/Type)</Label>
            <Select
              value={f.category_id === mainCatId ? "" : f.category_id || ""}
              onValueChange={(v) => setF({ ...f, category_id: v || mainCatId })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Generic Design" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERIC">Generic / Standard</SelectItem>
                {subCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Metal</Label>
          <Select
            value={f.metal}
            onValueChange={(v) => setF({ ...f, metal: v as "gold" | "silver" | "other" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Purity</Label>
          <Select value={f.purity} onValueChange={(v) => setF({ ...f, purity: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Purity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24K">24K</SelectItem>
              <SelectItem value="22K">22K</SelectItem>
              <SelectItem value="18K">18K</SelectItem>
              <SelectItem value="999">999 (Fine Silver)</SelectItem>
              <SelectItem value="925">925 (Sterling)</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Weight (gram)</Label>
          <Input
            type="number"
            step="0.001"
            value={f.weight_gram}
            onChange={(e) => setF({ ...f, weight_gram: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Jarti (DOM) %</Label>
          <Input
            type="number"
            step="0.01"
            value={f.jarti_percent}
            onChange={(e) => setF({ ...f, jarti_percent: Number(e.target.value) })}
            placeholder="e.g. 1.5"
          />
        </div>
        <div>
          <Label>Making charge (Rs)</Label>
          <Input
            type="number"
            step="0.01"
            value={f.making_charge}
            onChange={(e) => setF({ ...f, making_charge: Number(e.target.value) })}
          />
        </div>
        <div>
          <div className="flex items-center justify-between pb-1">
            <Label>Cost price (Rs)</Label>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-[10px] font-medium text-amber-600 dark:text-amber-500"
              onClick={() => {
                const base = f.metal === "gold" ? liveRates.gold : liveRates.silver;
                let mul = 1;
                if (f.metal === "gold") {
                  const p = f.purity.toUpperCase();
                  if (p.includes("22K")) mul = 0.9167;
                  else if (p.includes("21K")) mul = 0.875;
                  else if (p.includes("18K")) mul = 0.75;
                }
                const est = Math.round(f.weight_gram * base * mul * 100) / 100;
                setF({ ...f, cost_price: est });
                toast.success(`Estimated cost set to Rs ${est}`);
              }}
            >
              ✨ Auto-estimate
            </Button>
          </div>
          <Input
            type="number"
            step="0.01"
            value={f.cost_price}
            onChange={(e) => setF({ ...f, cost_price: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Stock qty</Label>
          <Input
            type="number"
            value={f.stock_qty}
            onChange={(e) => setF({ ...f, stock_qty: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Min stock alert</Label>
          <Input
            type="number"
            value={f.min_stock}
            onChange={(e) => setF({ ...f, min_stock: Number(e.target.value) })}
          />
        </div>
        <DialogFooter className="md:col-span-2">
          <Button type="submit">{editing ? "Update" : "Add"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
