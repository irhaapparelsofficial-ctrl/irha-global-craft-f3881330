import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLiveChatLauncher() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const path = window.location.pathname;
      const isAdminPath = path.startsWith("/admin");
      const isDedicatedConsole = path.startsWith("/admin/live-chat") || path.startsWith("/admin/visitors");
      if (!isAdminPath || isDedicatedConsole) {
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
      className="fixed bottom-5 left-5 z-[66] hidden min-h-12 items-center gap-2 rounded-full border border-emerald-500/45 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-emerald-300 shadow-2xl backdrop-blur hover:bg-emerald-500 hover:text-background md:inline-flex"
      aria-label="Open human live chat console"
      title="Open human live chat console"
    >
      <Headphones size={17} /> Live Chat
    </a>
  );
}
