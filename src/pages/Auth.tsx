import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";

export default function Auth() {
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/admin" replace />;

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/admin`,
        extraParams: { prompt: "select_account" },
      });

      if (result.error) throw result.error;
      if (!result.redirected) window.location.assign("/admin");
    } catch (error) {
      toast({
        title: "Google sign-in failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
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
            <p className="text-sm text-foreground/65 mt-5 leading-relaxed">
              Sign in with the Google account that has server-side admin permission.
            </p>
          </div>

          <div className="mt-8 border border-border/60 bg-background/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/45">Owner account</p>
            <p className="text-sm text-foreground/85 mt-2 break-all">{OWNER_EMAIL}</p>
          </div>

          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={busy}
            className="mt-6 w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.28em] hover:shadow-gold transition-all disabled:opacity-60"
          >
            <LogIn size={16} /> {busy ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="mt-6 flex items-start gap-3 border-t border-border/50 pt-5">
            <ShieldCheck size={16} className="text-gold shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/55 leading-relaxed">
              Signing in is not enough by itself. The dashboard still checks the live database for an admin role before access is granted.
            </p>
          </div>

          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mt-8 text-center">
            Google OAuth · Server-side admin permission required
          </p>
        </div>
      </section>
    </>
  );
}