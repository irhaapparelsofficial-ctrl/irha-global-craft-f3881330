import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLiveChatLauncher() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const isAdminPath = window.location.pathname.startsWith("/admin");
      const isConsole = window.location.pathname.startsWith("/admin/live-chat");
      if (!isAdminPath || isConsole) {
        if (!cancelled) setVisible(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        if (!cancelled) setVisible(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setVisible(!error && data?.role === "admin");
    };

    void check();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!visible) return null;

  return (
    <a
      href="/admin/live-chat"
      className="fixed z-[66] left-3 sm:left-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5 min-h-12 inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-emerald-300 shadow-2xl backdrop-blur hover:bg-emerald-500 hover:text-background"
      aria-label="Open human live chat console"
      title="Open human live chat console"
    >
      <Headphones size={17} /> Live Chat
    </a>
  );
}
