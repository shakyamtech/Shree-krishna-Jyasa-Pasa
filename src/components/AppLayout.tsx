import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Users, Truck, Receipt, ShoppingBag,
  BookOpen, Wallet, BarChart3, Settings, LogOut, Menu, X, Gem, User,
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
  const [ownerName, setOwnerName] = useState(() => localStorage.getItem("custom_owner_name") || "Mahesh");
  const [staffName, setStaffName] = useState(() => localStorage.getItem("custom_staff_name") || "");
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app_theme") || "default";
    }
    return "default";
  });

  useEffect(() => {
    const syncTheme = () => {
      const current = localStorage.getItem("app_theme") || "default";
      setThemeState(current);
      const root = document.documentElement;
      root.classList.remove("theme-emerald", "theme-sapphire", "theme-ruby", "theme-gold");
      if (current !== "default") {
        root.classList.add(`theme-${current}`);
      }
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const setTheme = (t: string) => {
    setThemeState(t);
    localStorage.setItem("app_theme", t);
    const root = document.documentElement;
    root.classList.remove("theme-emerald", "theme-sapphire", "theme-ruby", "theme-gold");
    if (t !== "default") {
      root.classList.add(`theme-${t}`);
    }
    window.dispatchEvent(new Event("storage"));
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
    supabase.from("shop_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as { shop_name?: string; logo_url?: string; owner_name?: string };
        if (d.shop_name) setShopName(d.shop_name);
        if (d.logo_url) setLogoUrl(d.logo_url);
        if (d.owner_name) setOwnerName(d.owner_name);
      }
    });

    if (user?.id) {
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.full_name) {
          setStaffName(data.full_name);
          localStorage.setItem("custom_staff_name", data.full_name);
        }
      });
    }

    const handleStorage = () => {
      const stored = localStorage.getItem("custom_owner_name");
      if (stored) setOwnerName(stored);
      setStaffName(localStorage.getItem("custom_staff_name") || "");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.id]);

  const derivedStaffName = staffName || (user?.email ? user.email.split("@")[0].split(/[._]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Dipen");

  const displayShopName = lang === "ne" && shopName.toLowerCase().includes("shree krishna")
    ? "श्री कृष्ण ज्यास: पस"
    : shopName;

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
            <div className={cn(
              "font-extrabold text-base bg-clip-text text-transparent truncate tracking-tight",
              theme === "sapphire"
                ? "bg-gradient-to-r from-cyan-200 via-blue-100 to-white"
                : theme === "gold"
                ? "bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-200"
                : "bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950"
            )}>{displayShopName}</div>
            <div className="text-xs font-medium text-sidebar-foreground/70 capitalize flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {lang === "ne" ? ((role || "Staff").toLowerCase() === "owner" ? "मालिक" : "कर्मचारी") : (role || "Staff")} {lang === "ne" ? "खाता" : "Account"}
              {(!role || role.toLowerCase() === "owner") && ownerName && (
                <span className="text-amber-600 dark:text-amber-500 font-bold ml-0.5 capitalize truncate max-w-[100px]">
                  • {ownerName}
                </span>
              )}
              {role?.toLowerCase() === "staff" && (
                <span className="text-amber-600 dark:text-amber-500 font-bold ml-0.5 capitalize truncate max-w-[100px]">
                  • {derivedStaffName}
                </span>
              )}
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
        <div className="border-t border-sidebar-border p-3 space-y-2.5">
          {/* User profile compact badge */}
          {user?.email && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/40 border border-sidebar-border/40">
              <div className={cn(
                "flex size-6 items-center justify-center rounded-full shrink-0 border",
                theme === "sapphire"
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : theme === "gold"
                  ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
                  : "bg-amber-600/10 text-amber-600 dark:text-amber-500 border-amber-600/20"
              )}>
                <User className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-sidebar-foreground truncate">{user.email}</div>
              </div>
            </div>
          )}

          {/* Language selector card */}
          <div className="flex items-center justify-between bg-sidebar-accent/50 px-2 py-1.5 rounded-md border border-sidebar-border/60">
            <span className="text-xs font-medium text-sidebar-foreground/70 flex items-center gap-1.5">
              <span>🌐</span> {lang === "ne" ? "भाषा" : "Language"}
            </span>
            <div className="flex bg-background/50 rounded-sm border border-sidebar-border/60 p-0.5 shadow-xs">
              <button
                onClick={() => setLang("en")}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-xs transition-colors",
                  lang === "en"
                    ? theme === "sapphire" ? "bg-cyan-600 text-white" : theme === "gold" ? "bg-amber-500 text-black" : "bg-amber-600 text-white"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                )}
              >
                ENG
              </button>
              <button
                onClick={() => setLang("ne")}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-xs transition-colors",
                  lang === "ne"
                    ? theme === "sapphire" ? "bg-cyan-600 text-white" : theme === "gold" ? "bg-amber-500 text-black" : "bg-amber-600 text-white"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                )}
              >
                नेपाली
              </button>
            </div>
          </div>

          {/* Logout action */}
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center w-full gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-sidebar-accent/40 hover:bg-sidebar-accent hover:text-destructive text-sidebar-foreground transition-colors border border-sidebar-border/60 shadow-xs"
          >
            <LogOut className="size-3.5" /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-sidebar-border bg-sidebar shadow-sm">
          <button onClick={() => setOpen(true)} className="p-1 hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground">
            <Menu className="size-5" />
          </button>
          {logoUrl ? (
            <div className="shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 shadow-xs">
              <img src={logoUrl} alt={shopName} className="size-8 rounded-full object-cover" />
            </div>
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Gem className="size-4" />
            </div>
          )}
          <span className={cn(
            "font-extrabold text-base bg-clip-text text-transparent truncate tracking-tight",
            theme === "sapphire"
              ? "bg-gradient-to-r from-cyan-200 via-blue-100 to-white"
              : theme === "gold"
              ? "bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-200"
              : "bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950"
          )}>{displayShopName}</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
