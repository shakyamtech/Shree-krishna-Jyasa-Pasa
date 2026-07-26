import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gem, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shopName, setShopName] = useState("Shree Krishna Jyasa Pasa");
  const [logoUrl, setLogoUrl] = useState<string | null>("/logo.jpg");

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select("shop_name, logo_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.shop_name) setShopName(data.shop_name);
          if (data.logo_url) setLogoUrl(data.logo_url);
        }
      });
  }, []);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn(email, password);
      if (error) return toast.error(error);
      toast.success("Signed in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <Link
            to="/"
            title="Go to Homepage"
            className="inline-flex flex-col items-center mx-auto cursor-pointer group hover:scale-105 transition-transform duration-300 mb-2"
          >
            <div className="mb-3 flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-[0_0_25px_rgba(212,175,55,0.6)] transition-shadow">
              {logoUrl ? (
                <img src={logoUrl} alt={shopName} className="size-full rounded-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center rounded-full bg-background text-primary">
                  <Gem className="size-8 text-amber-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 bg-clip-text text-transparent tracking-tight group-hover:brightness-125 transition-all">
              {shopName}
            </CardTitle>
          </Link>
          <CardDescription className="text-xs font-medium mt-1">
            Sign in to your shop account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@shop.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
