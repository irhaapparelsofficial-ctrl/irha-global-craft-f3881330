import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, LogIn, Mail, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";
const MIN_PASSWORD_LENGTH = 8;

export default function Auth() {
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState<"google" | "password" | "magic" | "reset" | "update" | null>(null);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(
    () => new URLSearchParams(window.location.search).get("mode") === "recovery",
  );

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!loading && session && !recoveryMode) return <Navigate to="/admin" replace />;

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
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      toast({ title: "Magic link failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }

    toast({ title: "Magic link sent", description: "Open the email link on the same device to access admin." });
    setBusy(null);
  };

  const sendPasswordReset = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    setBusy("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=recovery`,
    });

    if (error) {
      toast({ title: "Password reset failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }

    toast({
      title: "Password setup email sent",
      description: "Open the recovery link on this device, then choose the new owner password.",
    });
    setBusy(null);
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      toast({ title: "Recovery session missing", description: "Open the latest recovery email link again.", variant: "destructive" });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast({ title: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setBusy("update");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Password could not be set", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }

    toast({ title: "Owner password set", description: "Password login is now enabled for the authorised owner account." });
    window.history.replaceState({}, "", "/auth");
    window.location.assign("/admin");
  };

  if (recoveryMode) {
    return (
      <>
        <SEO title="Set Admin Password — Irha Apparels" description="Private admin password setup." path="/auth" noindex />
        <section className="min-h-[100svh] flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="w-full max-w-md mx-auto border border-border/60 bg-card/40 p-6 sm:p-9">
            <div className="text-center">
              <p className="eyebrow mb-3">Secure Owner Setup</p>
              <h1 className="font-display text-4xl leading-tight"><span className="text-gold italic">Set</span> Password</h1>
              <p className="text-sm text-foreground/65 mt-5 leading-relaxed">
                This form only works after opening the Supabase recovery email. The password is sent directly to Supabase Auth and is never stored in website code.
              </p>
            </div>

            <form onSubmit={updatePassword} className="mt-7 space-y-3">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/45 mb-1.5">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new owner password"
                  className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/45 mb-1.5">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold"
                />
              </label>
              <button
                type="submit"
                disabled={busy !== null || loading || !session}
                className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.26em] hover:shadow-gold transition-all disabled:opacity-60"
              >
                <KeyRound size={16} /> {busy === "update" ? "Setting password…" : "Set owner password"}
              </button>
            </form>

            {!loading && !session && (
              <p className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                Recovery session not found. Return to the sign-in page, request a fresh password setup email, and open its link on this device.
              </p>
            )}

            <button
              type="button"
              onClick={() => { setRecoveryMode(false); window.history.replaceState({}, "", "/auth"); }}
              className="mt-5 w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
            >
              Back to sign in
            </button>
          </div>
        </section>
      </>
    );
  }

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
              onClick={() => void sendPasswordReset()}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-3 border border-gold/40 px-6 py-3.5 text-xs uppercase tracking-[0.22em] text-gold hover:bg-gold hover:text-background transition-colors disabled:opacity-60"
            >
              <KeyRound size={15} /> {busy === "reset" ? "Sending setup email…" : "Set or reset password"}
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
