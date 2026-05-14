import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Users, Truck, Receipt, ShoppingBag,
  BookOpen, Wallet, BarChart3, Settings, LogOut, Menu, X, Gem,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products & Stock", icon: Package },
  { to: "/sales", label: "Sales / Billing", icon: Receipt },
  { to: "/purchases", label: "Purchases", icon: ShoppingBag },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/credits", label: "Credits / Dues", icon: BookOpen },
  { to: "/cashbook", label: "Cashbook", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Shop Settings", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("Shree Krishna Jyasa Pasa");
  const [logoUrl, setLogoUrl] = useState<string | null>("/logo.jpg");
  const [theme, setThemeState] = useState<string>("default");

  useEffect(() => {
    const saved = localStorage.getItem("app_theme") || "default";
    setThemeState(saved);
    const root = document.documentElement;
    root.classList.remove("theme-emerald", "theme-sapphire", "theme-ruby", "theme-gold");
    if (saved !== "default") {
      root.classList.add(`theme-${saved}`);
    }
  }, []);

  const setTheme = (t: string) => {
    setThemeState(t);
    localStorage.setItem("app_theme", t);
    const root = document.documentElement;
    root.classList.remove("theme-emerald", "theme-sapphire", "theme-ruby", "theme-gold");
    if (t !== "default") {
      root.classList.add(`theme-${t}`);
    }
  };

  const navItems = [
    { to: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { to: "/products", label: t.products_stock, icon: Package },
    { to: "/sales", label: t.sales_billing, icon: Receipt },
    { to: "/purchases", label: t.purchases, icon: ShoppingBag },
    { to: "/customers", label: t.customers, icon: Users },
    { to: "/suppliers", label: t.suppliers, icon: Truck },
    { to: "/credits", label: t.credits_dues, icon: BookOpen },
    { to: "/cashbook", label: t.cashbook, icon: Wallet },
    { to: "/reports", label: t.reports, icon: BarChart3 },
    { to: "/settings", label: t.shop_settings, icon: Settings },
  ];

  useEffect(() => {
    supabase.from("shop_settings").select("shop_name, logo_url").limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        if (data.shop_name) setShopName(data.shop_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
      }
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform md:static md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
          {logoUrl ? (
            <div className="relative shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 shadow-md">
              <img src={logoUrl} alt={shopName} className="size-10 rounded-full object-cover" />
            </div>
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Gem className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-base bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 bg-clip-text text-transparent truncate tracking-tight">{shopName}</div>
            <div className="text-xs font-medium text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {role ?? "Staff"} {lang === "ne" ? "खाता" : "Account"}
            </div>
          </div>
          <button className="ml-auto md:hidden text-sidebar-foreground hover:bg-sidebar-accent p-1 rounded-md transition-colors" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItems.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center justify-between bg-sidebar-accent/50 px-2 py-1.5 rounded-md border border-sidebar-border/60">
            <span className="text-xs font-medium text-sidebar-foreground/70">🌐 {lang === "ne" ? "भाषा" : "Language"}</span>
            <div className="flex bg-background/50 rounded-sm border border-sidebar-border/60 p-0.5 shadow-xs">
              <button
                onClick={() => setLang("en")}
                className={cn("px-2 py-0.5 text-[10px] font-bold rounded-xs transition-colors", lang === "en" ? "bg-amber-600 text-white" : "text-sidebar-foreground/50 hover:text-sidebar-foreground")}
              >
                ENG
              </button>
              <button
                onClick={() => setLang("ne")}
                className={cn("px-2 py-0.5 text-[10px] font-bold rounded-xs transition-colors", lang === "ne" ? "bg-amber-600 text-white" : "text-sidebar-foreground/50 hover:text-sidebar-foreground")}
              >
                नेपाली
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between bg-sidebar-accent/50 px-2 py-1.5 rounded-md border border-sidebar-border/60">
            <span className="text-xs font-medium text-sidebar-foreground/70">✨ {lang === "ne" ? "थिम" : "Theme"}</span>
            <div className="flex items-center gap-2">
              <button
                title="Amber Base (Default)"
                onClick={() => setTheme("default")}
                className={cn("size-4 rounded-full bg-amber-500 border border-sidebar-border transition-transform", theme === "default" ? "scale-125 ring-2 ring-amber-500 ring-offset-1 ring-offset-background" : "hover:scale-110")}
              />
              <button
                title="Premium Black & Gold Shimmer"
                onClick={() => setTheme("gold")}
                className={cn("size-4 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-950 border border-sidebar-border transition-transform", theme === "gold" ? "scale-125 ring-2 ring-amber-400 ring-offset-1 ring-offset-background" : "hover:scale-110")}
              />
              <button
                title="Aesthetic Blue & Light"
                onClick={() => setTheme("sapphire")}
                className={cn("size-4 rounded-full bg-blue-600 border border-sidebar-border transition-transform", theme === "sapphire" ? "scale-125 ring-2 ring-blue-500 ring-offset-1 ring-offset-background" : "hover:scale-110")}
              />
            </div>
          </div>
          <div className="text-xs text-sidebar-foreground/60 truncate px-1">{user?.email}</div>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center w-full gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-sidebar-accent/40 hover:bg-sidebar-accent text-sidebar-foreground transition-colors border border-sidebar-border/60"
          >
            <LogOut className="size-3.5" /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur shadow-sm">
          <button onClick={() => setOpen(true)} className="p-1 hover:bg-accent rounded-md transition-colors text-foreground">
            <Menu className="size-5" />
          </button>
          {logoUrl ? (
            <div className="shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 shadow-xs">
              <img src={logoUrl} alt={shopName} className="size-8 rounded-full object-cover" />
            </div>
          ) : (
            <Gem className="size-6 text-primary shrink-0" />
          )}
          <span className="font-bold text-base bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent truncate tracking-tight">{shopName}</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
