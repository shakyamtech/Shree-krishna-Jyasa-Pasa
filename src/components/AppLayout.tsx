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
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("Shree Krishna Jyasa Pasa");
  const [logoUrl, setLogoUrl] = useState<string | null>("/logo.jpg");

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
              {role ?? "Staff"} Account
            </div>
          </div>
          <button className="ml-auto md:hidden text-sidebar-foreground hover:bg-sidebar-accent p-1 rounded-md transition-colors" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {nav.map((n) => {
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
        <div className="border-t border-sidebar-border p-3">
          <div className="text-xs text-muted-foreground truncate mb-2">{user?.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
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
