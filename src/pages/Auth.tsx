import { useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, LogIn, Mail, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";

export default function Auth() {
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState<"google" | "password" | "magic" | null>(null);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");

  if (!loading && session) return <Navigate to="/admin" replace />;

  const signInWithGoogle = async () => {
    setBusy("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: "Google sign-in failed",
        description: error instanceof Error ? error.message : "Please try email/password or magic link.",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const signInWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }

    setBusy("password");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: "Password sign-in failed",
        description: error.message,
        variant: "destructive",
      });
      setBusy(null);
      return;
    }

    window.location.assign("/admin");
  };

  const sendMagicLink = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    setBusy("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });

    if (error) {
      toast({ title: "Magic link failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }

    toast({ title: "Magic link sent", description: "Open the email link on the same device to access admin." });
    setBusy(null);
  };

  return (
    <>
      <SEO title="Admin Sign-in — Irha Apparels" description="Private admin dashboard." path="/auth" noindex />

      <section className="min-h-[100svh] flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-md mx-auto border border-border/60 bg-card/40 p-6 sm:p-9">
          <div className="text-center">
            <p className="eyebrow mb-3">Private Owner Access</p>
            <h1 className="font-display text-4xl leading-tight">
              <span className="text-gold italic">Atelier</span> Dashboard
            </h1>
            <p className="text-sm text-foreground/65 mt-5 leading-relaxed">
              Sign in with the authorised owner account. The dashboard still checks the live database for admin permission after login.
            </p>
          </div>

          <form onSubmit={signInWithPassword} className="mt-7 space-y-3">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/45 mb-1.5">Owner email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/45 mb-1.5">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter owner password"
                className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </label>
            <button
              type="submit"
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.26em] hover:shadow-gold transition-all disabled:opacity-60"
            >
              <KeyRound size={16} /> {busy === "password" ? "Signing in…" : "Sign in with password"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-foreground/35">
            <span className="h-px bg-border/60 flex-1" />
            Or
            <span className="h-px bg-border/60 flex-1" />
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => void sendMagicLink()}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-3 border border-border/60 px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:border-gold hover:text-gold transition-colors disabled:opacity-60"
            >
              <Mail size={15} /> {busy === "magic" ? "Sending…" : "Send magic link"}
            </button>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-3 border border-border/60 px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:border-gold hover:text-gold transition-colors disabled:opacity-60"
            >
              <LogIn size={15} /> {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
          </div>

          <div className="mt-6 flex items-start gap-3 border-t border-border/50 pt-5">
            <ShieldCheck size={16} className="text-gold shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/55 leading-relaxed">
              Passwords are never stored in the website code. Access is granted only when Supabase Auth and the live admin role both approve the signed-in user.
            </p>
          </div>

          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mt-8 text-center">
            Authorised personnel only
          </p>
        </div>
      </section>
    </>
  );
}
