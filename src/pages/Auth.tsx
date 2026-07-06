import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, Send } from "lucide-react";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";

export default function Auth() {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URL(window.location.href).searchParams.get("mode") === "recovery";
  });
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    setPasskeySupported(typeof window !== "undefined" && "PublicKeyCredential" in window);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!loading && session && !recoveryMode) return <Navigate to="/admin" replace />;

  const signInWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password });
      if (error) throw error;
      window.location.assign("/admin");
    } catch (error) {
      toast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Check the password and try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const signInWithPasskey = async () => {
    setBusy(true);
    try {
      const auth = supabase.auth as typeof supabase.auth & {
        signInWithPasskey: () => Promise<{ error: Error | null }>;
      };
      const { error } = await auth.signInWithPasskey();
      if (error) throw error;
      window.location.assign("/admin");
    } catch (error) {
      toast({
        title: "Passkey sign-in failed",
        description: error instanceof Error ? error.message : "Use your password or send a setup link.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordSetup = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, {
        redirectTo: `${window.location.origin}/auth?mode=recovery`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Secure setup email sent", description: "Open the email on this device and set your owner password." });
    } catch (error) {
      toast({
        title: "Could not send setup email",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Use at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Owner password set", description: "You can now use password login and set up Face ID passkey in Admin." });
      window.location.assign("/admin?setup_passkey=1");
    } catch (error) {
      toast({
        title: "Password update failed",
        description: error instanceof Error ? error.message : "Open a fresh setup email and try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Admin Sign-in — Irha Apparels" description="Private admin dashboard." path="/auth" noindex />
      <section className="min-h-[100svh] flex items-center justify-center px-4 py-20 sm:py-28">
        <div className="w-full max-w-md mx-auto border border-border/60 bg-card/40 p-6 sm:p-9">
          <div className="text-center">
            <p className="eyebrow mb-3">Private Owner Access</p>
            <h1 className="font-display text-4xl leading-tight">
              <span className="text-gold italic">Atelier</span> Dashboard
            </h1>
          </div>

          {recoveryMode ? (
            <form onSubmit={updatePassword} className="mt-8 space-y-4">
              <div className="text-center mb-6">
                <LockKeyhole className="mx-auto text-gold mb-3" size={26} />
                <h2 className="font-display text-xl">Set owner password</h2>
                <p className="text-sm text-foreground/60 mt-2">This password is stored by the authentication service, never in the website code.</p>
              </div>
              <PasswordField label="New password" value={newPassword} setValue={setNewPassword} show={showPassword} setShow={setShowPassword} autoComplete="new-password" />
              <PasswordField label="Confirm password" value={confirmPassword} setValue={setConfirmPassword} show={showPassword} setShow={setShowPassword} autoComplete="new-password" />
              <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.28em] hover:shadow-gold transition-all disabled:opacity-60">
                <LockKeyhole size={15} /> {busy ? "Saving…" : "Save Secure Password"}
              </button>
            </form>
          ) : (
            <>
              <p className="text-sm text-foreground/65 mt-5 text-center leading-relaxed">
                Owner-only access. Sign in with Face ID / passkey or your secure password.
              </p>

              {passkeySupported && (
                <button type="button" onClick={() => void signInWithPasskey()} disabled={busy} className="mt-7 w-full inline-flex items-center justify-center gap-3 border border-gold/70 text-gold px-6 py-4 text-xs uppercase tracking-[0.25em] hover:bg-gold hover:text-primary-foreground transition-all disabled:opacity-60">
                  <KeyRound size={16} /> Sign in with Face ID / Passkey
                </button>
              )}

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[9px] uppercase tracking-[0.25em] text-foreground/40">or password</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <form onSubmit={signInWithPassword} className="space-y-4">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/50 mb-2">Owner email</span>
                  <div className="flex items-center gap-3 border border-border/60 bg-background/60 px-4 py-3">
                    <Mail size={15} className="text-gold shrink-0" />
                    <input value={OWNER_EMAIL} readOnly autoComplete="username" className="min-w-0 w-full bg-transparent outline-none text-sm text-foreground/80" />
                  </div>
                </label>

                <PasswordField label="Password" value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} autoComplete="current-password" />

                <button type="submit" disabled={busy || !password} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.28em] hover:shadow-gold transition-all disabled:opacity-50">
                  <LockKeyhole size={15} /> {busy ? "Signing in…" : "Secure Sign In"}
                </button>
              </form>

              <div className="mt-5 border-t border-border/50 pt-5 text-center">
                {resetSent ? (
                  <p className="text-xs text-emerald-400 leading-relaxed">Setup email sent. Open it, return here, then create your password.</p>
                ) : (
                  <button type="button" onClick={() => void sendPasswordSetup()} disabled={busy} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground/55 hover:text-gold transition-colors disabled:opacity-50">
                    <Send size={12} /> First login or forgot password? Send secure setup link
                  </button>
                )}
              </div>
            </>
          )}

          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mt-8 text-center">
            Server-side admin permission still required
          </p>
        </div>
      </section>
    </>
  );
}

function PasswordField({
  label,
  value,
  setValue,
  show,
  setShow,
  autoComplete,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/50 mb-2">{label}</span>
      <div className="flex items-center gap-3 border border-border/60 bg-background/60 px-4 py-3 focus-within:border-gold/70 transition-colors">
        <LockKeyhole size={15} className="text-gold shrink-0" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete={autoComplete}
          className="min-w-0 w-full bg-transparent outline-none text-sm"
        />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="text-foreground/45 hover:text-gold">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
