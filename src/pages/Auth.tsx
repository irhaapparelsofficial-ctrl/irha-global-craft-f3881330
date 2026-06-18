import { useState } from "react";
import { Navigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { LogIn } from "lucide-react";

export default function Auth() {
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/admin" replace />;

  const signIn = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/admin`,
      });
      if (result.error) {
        toast({ title: "Sign-in failed", description: String(result.error), variant: "destructive" });
        setBusy(false);
        return;
      }
      // If redirected, browser navigates away. If tokens returned, useAuth picks it up.
      if (!result.redirected) window.location.href = "/admin";
    } catch (e) {
      toast({ title: "Sign-in failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <SEO title="Admin Sign-in — Irha Apparels" description="Private admin dashboard." path="/auth" noindex />
      <section className="min-h-[80vh] flex items-center justify-center py-32">
        <div className="w-full max-w-md mx-auto border border-border/60 bg-card/40 p-10 text-center">
          <p className="eyebrow mb-3">Private</p>
          <h1 className="font-display text-4xl leading-tight">
            <span className="text-gold italic">Atelier</span> Dashboard
          </h1>
          <p className="text-sm text-foreground/70 mt-4 leading-relaxed">
            Sign in with the Google account linked to{" "}
            <span className="text-foreground/90">irhaapparelsofficial@gmail.com</span> to access inquiries, traffic and chat insights.
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all disabled:opacity-60"
          >
            <LogIn size={14} /> {busy ? "Redirecting…" : "Continue with Google"}
          </button>
          {session && (
            <button onClick={signOut} className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
              Sign out
            </button>
          )}
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-8">
            Authorised personnel only
          </p>
        </div>
      </section>
    </>
  );
}
