import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
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

  useEffect(() => { if (user) navigate({ to: "/dashboard", replace: true }); }, [user, navigate]);

  // Default to Sign In mode since owner accounts are already configured

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) return toast.error(error);
        const { error: e2 } = await signIn(email, password);
        if (e2) {
          toast.success("Account registered. Please check email confirmation if enabled, then sign in.");
          setIsSignUp(false);
        } else {
          toast.success("Account successfully created and signed in!");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) return toast.error(error);
        toast.success("Signed in");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 p-0.5 shadow-lg shadow-amber-500/10">
            {logoUrl ? (
              <img src={logoUrl} alt={shopName} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-background text-primary">
                <Gem className="size-8" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 bg-clip-text text-transparent tracking-tight">
            {shopName}
          </CardTitle>
          <CardDescription className="text-xs font-medium">
            {isSignUp ? "Register a new credentials account" : "Sign in to your shop account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@shop.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
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
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white cursor-pointer" disabled={busy}>
              {busy ? "Please wait…" : isSignUp ? "Create account & sign in" : "Sign in"}
            </Button>

            <div className="text-center pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors cursor-pointer"
              >
                {isSignUp ? "Already registered? Sign in instead" : "Need to register a new staff/user account? Click here"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
