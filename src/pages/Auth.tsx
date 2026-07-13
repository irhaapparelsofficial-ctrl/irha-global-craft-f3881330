import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Chrome,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import SEO from "@/components/SEO";
import { OWNER_AUTH_UI_POLICY, OWNER_EMAIL } from "@/config/ownerIdentity";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  supabase,
  supabaseProjectId,
  supabasePublishableKey,
  supabaseRuntimeUrl,
} from "@/integrations/supabase/client";
import {
  EMPTY_AUTH_CAPABILITIES,
  buildAuthRedirect,
  fetchAuthCapabilities,
  friendlyAuthError,
  isRecoveryLocation,
  unavailableAuthCapabilities,
  type AuthServerCapabilities,
} from "@/lib/authCapabilities";

const MIN_PASSWORD_LENGTH = 8;
type BusyAction = "password" | "magic" | "reset" | "update" | "google" | "signout" | null;

export default function Auth() {
  const { session, isAdmin, loading, authError } = useAuth();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [capabilities, setCapabilities] = useState<AuthServerCapabilities>(EMPTY_AUTH_CAPABILITIES);
  const [capabilitiesBusy, setCapabilitiesBusy] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(
    () => isRecoveryLocation(window.location.search, window.location.hash),
  );

  const loadCapabilities = useCallback(async (signal?: AbortSignal) => {
    setCapabilitiesBusy(true);
    setCapabilities((current) => ({ ...current, status: "checking", error: null }));
    try {
      const next = await fetchAuthCapabilities({
        runtimeUrl: supabaseRuntimeUrl,
        publishableKey: supabasePublishableKey,
        signal,
      });
      setCapabilities(next);
    } catch (error) {
      if (signal?.aborted) return;
      setCapabilities(unavailableAuthCapabilities(error));
    } finally {
      if (!signal?.aborted) setCapabilitiesBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCapabilities(controller.signal);
    return () => controller.abort();
  }, [loadCapabilities]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const emailPasswordAvailable = capabilities.status === "ready" && capabilities.emailEnabled;
  const emailDeliveryAvailable = emailPasswordAvailable && OWNER_AUTH_UI_POLICY.emailDeliveryVerified;
  const googleAvailable = capabilities.status === "ready"
    && capabilities.googleEnabled
    && OWNER_AUTH_UI_POLICY.googleOAuthVerified;

  const capabilitySummary = useMemo(() => {
    if (capabilities.status === "checking") return "Checking available sign-in methods…";
    if (capabilities.status === "unavailable") return capabilities.error || "Authentication configuration could not be verified.";
    if (!capabilities.emailEnabled && !googleAvailable) return "No verified owner sign-in method is active in this backend yet.";
    if (capabilities.emailEnabled) return "Password authentication is enabled for the existing owner account.";
    return "A verified owner sign-in method is available.";
  }, [capabilities, googleAvailable]);

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

  const openAdmin = () => window.location.assign(buildAuthRedirect(window.location.origin, "/admin"));

  const signInWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!emailPasswordAvailable) {
      toast({ title: "Password sign-in is not enabled", description: capabilitySummary, variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }

    setBusy("password");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password });
      if (error) throw error;
      setPassword("");
      openAdmin();
    } catch (error) {
      toast({ title: "Password sign-in failed", description: friendlyAuthError(error, "password"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const sendMagicLink = async () => {
    if (!emailDeliveryAvailable) {
      toast({ title: "Magic link is not verified", description: "Email delivery stays disabled in the UI until the final owner-controlled delivery test passes.", variant: "destructive" });
      return;
    }
    setBusy("magic");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: OWNER_EMAIL,
        options: {
          emailRedirectTo: buildAuthRedirect(window.location.origin, "/auth"),
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      toast({ title: "Magic link accepted by Auth", description: "Open the newest owner email link on this device." });
    } catch (error) {
      toast({ title: "Magic link failed", description: friendlyAuthError(error, "magic"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const sendPasswordReset = async () => {
    if (!emailDeliveryAvailable) {
      toast({ title: "Password recovery is not verified", description: "The reset button stays disabled until the email provider and delivery path pass the final activation test.", variant: "destructive" });
      return;
    }
    setBusy("reset");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, {
        redirectTo: buildAuthRedirect(window.location.origin, "/auth?mode=recovery"),
      });
      if (error) throw error;
      toast({ title: "Password recovery accepted by Auth", description: "Open the newest recovery email on this device." });
    } catch (error) {
      toast({ title: "Password reset failed", description: friendlyAuthError(error, "reset"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const signInWithGoogle = async () => {
    if (!googleAvailable) return;
    setBusy("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildAuthRedirect(window.location.origin, "/auth") },
      });
      if (error) throw error;
    } catch (error) {
      toast({ title: "Google sign-in failed", description: friendlyAuthError(error, "google"), variant: "destructive" });
      setBusy(null);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      toast({ title: "Recovery session missing", description: "Open the newest recovery email link again.", variant: "destructive" });
      return;
    }
    if (!validatePassword(newPassword)) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setBusy("update");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      openAdmin();
    } catch (error) {
      toast({ title: "Password could not be set", description: friendlyAuthError(error, "update"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy("signout");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setPassword("");
    } catch (error) {
      toast({ title: "Sign-out failed", description: friendlyAuthError(error, "password"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
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
                This page updates the password only inside Supabase Auth after a valid recovery session. The password is never stored in website code.
              </p>
            </div>

            <form onSubmit={updatePassword} className="mt-7 space-y-3">
              <AuthField label="New password">
                <input type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter a new private owner password" className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold" />
              </AuthField>
              <AuthField label="Confirm password">
                <input type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter the new password" className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold" />
              </AuthField>
              <button type="submit" disabled={busy !== null || loading || !session} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.26em] hover:shadow-gold transition-all disabled:opacity-60">
                <KeyRound size={16} /> {busy === "update" ? "Setting password…" : "Set owner password"}
              </button>
            </form>

            {!loading && !session && (
              <p className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                Recovery session not found. Request a fresh recovery email after email delivery is verified, then open the newest link on this device.
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
              Owner registration is closed. Authentication and database admin authorization are checked separately.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3 border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-foreground/65">
            <Database size={15} className="text-emerald-400 shrink-0" />
            <span>Owner runtime · {supabaseProjectId}</span>
          </div>

          <div className={`mt-3 border p-3 text-xs leading-relaxed ${
            capabilities.status === "ready" && emailPasswordAvailable
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-100"
              : capabilities.status === "checking"
                ? "border-border/60 bg-background/30 text-foreground/65"
                : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`} aria-live="polite">
            <div className="flex items-start gap-3">
              {capabilities.status === "checking" ? <Loader2 size={15} className="animate-spin shrink-0 mt-0.5" /> : emailPasswordAvailable ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="text-amber-300 shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p>{capabilitySummary}</p>
                {capabilities.status === "ready" && capabilities.signupDisabled === true && <p className="mt-1 text-foreground/55">New account creation is disabled, as required.</p>}
              </div>
              {capabilities.status === "unavailable" && (
                <button type="button" onClick={() => void loadCapabilities()} disabled={capabilitiesBusy} className="inline-flex min-h-9 items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-gold disabled:opacity-50">
                  <RefreshCw size={11} /> Retry
                </button>
              )}
            </div>
          </div>

          {session && !loading && !isAdmin && (
            <div className="mt-4 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-100">
              <p>{authError || "This signed-in session does not have the owner admin role."}</p>
              <button type="button" onClick={() => void signOut()} disabled={busy !== null} className="mt-3 inline-flex items-center gap-2 uppercase tracking-[0.18em] text-[10px] text-gold">
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}

          {emailPasswordAvailable ? (
            <form onSubmit={signInWithPassword} className="mt-7 space-y-3">
              <AuthField label="Owner email">
                <input type="email" autoComplete="username" value={OWNER_EMAIL} readOnly className="w-full bg-background border border-border/60 px-4 py-3 text-sm text-foreground/75 outline-none" />
              </AuthField>
              <AuthField label="Password">
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter owner password" className="w-full bg-background border border-border/60 px-4 py-3 text-sm outline-none focus:border-gold" />
              </AuthField>
              <button type="submit" disabled={busy !== null || Boolean(session) || capabilitiesBusy} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.26em] hover:shadow-gold transition-all disabled:opacity-60">
                <KeyRound size={16} /> {busy === "password" ? "Signing in…" : "Sign in with password"}
              </button>
            </form>
          ) : (
            <div className="mt-6 border border-dashed border-border/60 p-5 text-center">
              <KeyRound size={20} className="mx-auto text-muted-foreground" />
              <p className="text-sm mt-3">Password controls are hidden because the connected Auth server has not reported email authentication as enabled.</p>
              <p className="text-xs text-foreground/50 mt-2">No unsupported login or recovery request will be sent.</p>
            </div>
          )}

          {emailDeliveryAvailable && (
            <>
              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-foreground/35">
                <span className="h-px bg-border/60 flex-1" /> Email recovery <span className="h-px bg-border/60 flex-1" />
              </div>
              <div className="grid gap-3">
                <button type="button" onClick={() => void sendMagicLink()} disabled={busy !== null || Boolean(session)} className="w-full inline-flex items-center justify-center gap-3 border border-border/60 px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:border-gold hover:text-gold transition-colors disabled:opacity-60">
                  <Mail size={15} /> {busy === "magic" ? "Sending…" : "Send magic link"}
                </button>
                <button type="button" onClick={() => void sendPasswordReset()} disabled={busy !== null || Boolean(session)} className="w-full inline-flex items-center justify-center gap-3 border border-gold/40 px-6 py-3.5 text-xs uppercase tracking-[0.22em] text-gold hover:bg-gold hover:text-background transition-colors disabled:opacity-60">
                  <KeyRound size={15} /> {busy === "reset" ? "Sending reset email…" : "Reset password"}
                </button>
              </div>
            </>
          )}

          {emailPasswordAvailable && !emailDeliveryAvailable && (
            <div className="mt-4 flex items-start gap-3 border border-border/60 bg-background/25 p-3 text-xs text-foreground/55">
              <Mail size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p>Magic link and password recovery remain hidden until one owner-controlled email delivery test is verified during final activation.</p>
            </div>
          )}

          {googleAvailable && (
            <button type="button" onClick={() => void signInWithGoogle()} disabled={busy !== null || Boolean(session)} className="mt-4 w-full inline-flex items-center justify-center gap-3 border border-border/60 px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:border-gold hover:text-gold transition-colors disabled:opacity-60">
              <Chrome size={15} /> {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
          )}

          {capabilities.status === "ready" && capabilities.googleEnabled && !OWNER_AUTH_UI_POLICY.googleOAuthVerified && (
            <p className="mt-3 text-[10px] text-center text-muted-foreground">Google is reported enabled by Auth but stays hidden until its OAuth secret and callback complete a controlled owner test.</p>
          )}

          <div className="mt-6 flex items-start gap-3 border-t border-border/50 pt-5">
            <ShieldCheck size={16} className="text-gold shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/55 leading-relaxed">
              A successful sign-in does not grant admin access by itself. The owner role is verified from the protected database role table before the dashboard opens.
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
