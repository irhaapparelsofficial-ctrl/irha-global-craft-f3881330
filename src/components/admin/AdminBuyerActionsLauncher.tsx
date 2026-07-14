import { useEffect, useState } from "react";
import { Bell, MessageSquare, UsersRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BuyerCoreActionsHub from "@/components/admin/BuyerCoreActionsHub";
import LeadEngineAlertsPanel from "@/components/admin/LeadEngineAlertsPanel";
import LiveChatAdminPanel from "@/components/admin/LiveChatAdminPanel";

export default function AdminBuyerActionsLauncher() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
    if (!open && !alertsOpen && !chatOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAlertsOpen(false);
        setChatOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, alertsOpen, chatOpen]);

  const closeAll = () => {
    setOpen(false);
    setAlertsOpen(false);
    setChatOpen(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed z-[65] right-3 sm:right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => {
            closeAll();
            setChatOpen(true);
          }}
          className="min-h-12 inline-flex items-center gap-2 rounded-full border border-emerald-500/55 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-emerald-300 shadow-2xl backdrop-blur hover:bg-emerald-500 hover:text-background"
          aria-label="Open Live Chat Inbox"
        >
          <MessageSquare size={17} /> Live Chat
        </button>
        <button
          type="button"
          onClick={() => {
            closeAll();
            setAlertsOpen(true);
          }}
          className="min-h-12 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-gold shadow-2xl backdrop-blur hover:bg-gold hover:text-background"
          aria-label="Open Lead Alerts"
        >
          <Bell size={17} /> Lead Alerts
        </button>
        <button
          type="button"
          onClick={() => {
            closeAll();
            setOpen(true);
          }}
          className="min-h-13 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-gold shadow-2xl backdrop-blur hover:bg-gold hover:text-background"
          aria-label="Open Buyer Actions"
        >
          <UsersRound size={17} /> Buyer Actions
        </button>
      </div>

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

      {alertsOpen && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Lead alerts and duplicate review">
          <header className="sticky top-0 z-10 min-h-16 border-b border-border/70 bg-card/95 backdrop-blur flex items-center justify-between gap-3 px-3 sm:px-6 pt-[env(safe-area-inset-top)]">
            <div className="min-w-0 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Irha Admin · Lead Engine</p>
              <h1 className="font-display text-lg sm:text-xl truncate">Lead Alerts & Duplicate Review</h1>
            </div>
            <button type="button" onClick={() => setAlertsOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:border-gold hover:text-gold" aria-label="Close Lead Alerts"><X size={19} /></button>
          </header>
          <main className="mx-auto max-w-[1600px] p-3 pb-10 sm:p-5 lg:p-8">
            <LeadEngineAlertsPanel />
          </main>
        </div>
      )}

      {chatOpen && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Human live chat inbox">
          <header className="sticky top-0 z-10 min-h-16 border-b border-border/70 bg-card/95 backdrop-blur flex items-center justify-between gap-3 px-3 sm:px-6 pt-[env(safe-area-inset-top)]">
            <div className="min-w-0 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-emerald-300">Irha Admin · Website Support</p>
              <h1 className="font-display text-lg sm:text-xl truncate">Human Live Chat</h1>
            </div>
            <button type="button" onClick={() => setChatOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:border-gold hover:text-gold" aria-label="Close Live Chat"><X size={19} /></button>
          </header>
          <main className="mx-auto max-w-[1600px] p-3 pb-10 sm:p-5 lg:p-8">
            <LiveChatAdminPanel />
          </main>
        </div>
      )}
    </>
  );
}
