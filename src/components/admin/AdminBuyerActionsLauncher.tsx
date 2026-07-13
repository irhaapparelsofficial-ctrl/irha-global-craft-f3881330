import { useEffect, useState } from "react";
import { UsersRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BuyerCoreActionsHub from "@/components/admin/BuyerCoreActionsHub";

export default function AdminBuyerActionsLauncher() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!window.location.pathname.startsWith("/admin")) {
        if (!cancelled) setVisible(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        if (!cancelled) setVisible(false);
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setVisible(Boolean(role));
    };
    void check();
    const onPopState = () => void check();
    window.addEventListener("popstate", onPopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[65] right-3 sm:right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5 min-h-13 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-gold shadow-2xl backdrop-blur hover:bg-gold hover:text-background"
        aria-label="Open Buyer Actions"
      >
        <UsersRound size={17} /> Buyer Actions
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Buyer CRM actions">
          <header className="sticky top-0 z-10 min-h-16 border-b border-border/70 bg-card/95 backdrop-blur flex items-center justify-between gap-3 px-3 sm:px-6 pt-[env(safe-area-inset-top)]">
            <div className="min-w-0 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Irha Admin · Live CRM</p>
              <h1 className="font-display text-lg sm:text-xl truncate">Buyer Actions</h1>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:border-gold hover:text-gold" aria-label="Close Buyer Actions"><X size={19} /></button>
          </header>
          <main className="mx-auto max-w-[1600px] p-3 pb-10 sm:p-5 lg:p-8">
            <BuyerCoreActionsHub />
          </main>
        </div>
      )}
    </>
  );
}
