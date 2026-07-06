import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";
const DISMISS_KEY = "irha:admin-passkey-banner-dismissed";

export default function PasskeySetupBanner() {
  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canUsePasskeys = typeof window !== "undefined" && "PublicKeyCredential" in window;
    const forceSetup = new URL(window.location.href).searchParams.get("setup_passkey") === "1";
    setSupported(canUsePasskeys);
    setVisible(canUsePasskeys && (forceSetup || localStorage.getItem(DISMISS_KEY) !== "1"));
  }, []);

  const registerPasskey = async () => {
    setBusy(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (userData.user?.email?.toLowerCase() !== OWNER_EMAIL) {
        throw new Error("Passkey registration is restricted to the owner account.");
      }

      const auth = supabase.auth as typeof supabase.auth & {
        registerPasskey: () => Promise<{ error: Error | null }>;
      };
      const { error } = await auth.registerPasskey();
      if (error) throw error;

      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("setup_passkey");
      window.history.replaceState({}, "", url.pathname + url.search);
      toast({ title: "Passkey ready", description: "Face ID / device passkey can now sign in to the owner dashboard." });
    } catch (error) {
      toast({
        title: "Passkey setup failed",
        description: error instanceof Error ? error.message : "Use password login and try again on this device.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!supported || !visible) return null;

  return (
    <div className="mb-5 border border-gold/40 bg-gold/[0.05] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
          <ShieldCheck size={17} className="text-gold" />
        </div>
        <div>
          <p className="font-display text-lg">Make owner login one-tap</p>
          <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
            Register Face ID / device passkey for the owner account. The private key stays in your device or passkey manager.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => void registerPasskey()} disabled={busy} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50">
          <KeyRound size={13} /> {busy ? "Setting up…" : "Enable Passkey"}
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss passkey setup" className="p-2 text-foreground/45 hover:text-foreground">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
