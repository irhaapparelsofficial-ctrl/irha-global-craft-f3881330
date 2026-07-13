import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Database, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase, supabaseProjectId } from "@/integrations/supabase/client";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";
const MIN_PASSWORD_LENGTH = 8;

type BusyAction = "password" | "magic" | "reset" | "update" | "signout" | null;

export default function Auth() {
  const { session, isAdmin, loading, authError } = useAuth();
  const [busy, setBusy] = useState<BusyAction>(null);
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

  if (!loading && session && isAdmin && !recoveryMode) {
    return <Navigate to="/admin" replace />;
  }

  const validatePassword = (value: string) => {
    if (value.length < MIN_PASSWORD_LENGTH) {
      toast({ title: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, variant: "destructive" });
      return false;
    }
    return true;
  };

  const openAdmin = () => window.location.assign("/admin");

  const signInWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }

    setBusy("password");
    const { error } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password });
    if (error) {
      toast({ title: "Password sign-in failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }
    openAdmin();
  };

  const sendMagicLink = async () => {
    setBusy("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email: OWNER_EMAIL,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      toast({ title: "Magic link failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }

    toast({
      title: "Magic link sent",
      description: "Open the newest email link on this device to access the owner dashboard.",
    });
    setBusy(null);
  };

  const sendPasswordReset = async () => {
    setBusy("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, {
      redirectTo: `${window.location.origin}/auth?mode=recovery`,
    });

    if (error) {
      toast({ title: "Password reset failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }

    toast({
      title: "Password reset email sent",
      description: "Open the newest recovery email on this device.",
    });
    setBusy(null);
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      toast({
        title: "Recovery session missing",
        description: "Open the newest recovery email link again.",
        variant: "destructive",
      });
      return;
    }
    if (!validatePassword(newPassword)) return;
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
    openAdmin();
  };

  const signOut = async () => {
    setBusy("signout");
    await supabase.auth.signOut();
    setBusy(null);
  };

  if (recoveryMode) {
    return (
      <>
        <SEO title="Set Admin Password — Irha Apparels" description="Private admin password setup." path="/auth" noindex />
        <section className="min-h-[100svh] flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="w-full max-w-md mx-auto border border-border/60 bg-card/40 p-6 sm:p-9">
            <div className="text-center">
              <p className="eyebrow mb-3">Secure Owner Access</p>
              <h1 className="font-display text-4xl leading-tight"><span className="text-gold italic">Set</span> Password</h1>
              <p className="text-sm text-foreground/65 mt-5 leading-relaxed">
                This works only after opening the newest Supabase recovery email. The password is stored only by Supabase Auth.
              </p>
            </div>

            <form onSubmit={updatePassword} className="mt-7 space-y-3">
              <AuthField label="New password">
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter new owner password" className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold" />
              </AuthField>
              <AuthField label="Confirm password">
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold" />
              </AuthField>
              <button type="submit" disabled={busy !== null || loading || !session} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.26em] hover:shadow-gold transition-all disabled:opacity-60">
                <KeyRound size={16} /> {busy === "update" ? "Setting password…" : "Set owner password"}
              </button>
            </form>

            {!loading && !session && (
              <p className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                Recovery session not found. Request a fresh password reset and open its newest link on this device.
              </p>
            )}

            <button type="button" onClick={() => { setRecoveryMode(false); window.history.replaceState({}, "", "/auth"); }} className="mt-5 w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-gold">
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
            <h1 className="font-display text-4xl leading-tight"><span className="text-gold italic">Irha</span> Dashboard</h1>
            <p className="text-sm text-foreground/65 mt-5 leading-relaxed">
              Owner registration is permanently closed. Only the existing verified owner account can sign in.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3 border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-foreground/65">
            <Database size={15} className="text-emerald-400 shrink-0" />
            <span>Owner Supabase connected · {supabaseProjectId}</span>
          </div>

          {session && !loading && !isAdmin && (
            <div className="mt-4 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-100">
              <p>{authError || "This signed-in session does not have owner admin permission."}</p>
              <button type="button" onClick={() => void signOut()} disabled={busy !== null} className="mt-3 inline-flex items-center gap-2 uppercase tracking-[0.18em] text-[10px] text-gold">
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}

          <form onSubmit={signInWithPassword} className="mt-7 space-y-3">
            <AuthField label="Owner email">
              <input type="email" autoComplete="username" value={OWNER_EMAIL} readOnly className="w-full bg-background border border-border/60 px-4 py-3 text-sm text-foreground/75 outline-none" />
            </AuthField>
            <AuthField label="Password">
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter owner password" className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold" />
            </AuthField>
            <button type="submit" disabled={busy !== null || Boolean(session)} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.26em] hover:shadow-gold transition-all disabled:opacity-60">
              <KeyRound size={16} /> {busy === "password" ? "Signing in…" : "Sign in with password"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-foreground/35">
            <span className="h-px bg-border/60 flex-1" /> Or <span className="h-px bg-border/60 flex-1" />
          </div>

          <div className="grid gap-3">
            <button type="button" onClick={() => void sendMagicLink()} disabled={busy !== null || Boolean(session)} className="w-full inline-flex items-center justify-center gap-3 border border-border/60 px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:border-gold hover:text-gold transition-colors disabled:opacity-60">
              <Mail size={15} /> {busy === "magic" ? "Sending…" : "Send magic link"}
            </button>
            <button type="button" onClick={() => void sendPasswordReset()} disabled={busy !== null || Boolean(session)} className="w-full inline-flex items-center justify-center gap-3 border border-gold/40 px-6 py-3.5 text-xs uppercase tracking-[0.22em] text-gold hover:bg-gold hover:text-background transition-colors disabled:opacity-60">
              <KeyRound size={15} /> {busy === "reset" ? "Sending reset email…" : "Reset password"}
            </button>
          </div>

          <div className="mt-6 flex items-start gap-3 border-t border-border/50 pt-5">
            <ShieldCheck size={16} className="text-gold shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/55 leading-relaxed">
              New account creation is disabled. Admin permission is verified by Row Level Security in the owner database.
            </p>
          </div>

          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mt-8 text-center">Authorised personnel only</p>
        </div>
      </section>
    </>
  );
}

function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/45 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
