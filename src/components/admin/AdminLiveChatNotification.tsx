import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type LiveChatAlert = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const db = supabase as any;
const POLL_INTERVAL_MS = 15_000;

function liveChatHref(alert: LiveChatAlert | null) {
  const sessionId = typeof alert?.metadata?.session_id === "string"
    ? alert.metadata.session_id.trim()
    : "";
  return sessionId
    ? `/admin/live-chat?session=${encodeURIComponent(sessionId)}`
    : "/admin/live-chat";
}

export default function AdminLiveChatNotification() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAlert, setLatestAlert] = useState<LiveChatAlert | null>(null);
  const previousCount = useRef(0);

  const load = useCallback(async (announce: boolean) => {
    if (!window.location.pathname.startsWith("/admin")) {
      setIsAdmin(false);
      setUnreadCount(0);
      setLatestAlert(null);
      previousCount.current = 0;
      return;
    }

    const { data: authData } = await supabase.auth.getSession();
    const userId = authData.session?.user.id;
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || role?.role !== "admin") {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(true);
    const { data, error, count } = await db
      .from("crm_notifications")
      .select("id,title,body,created_at,metadata", { count: "exact" })
      .eq("status", "unread")
      .contains("metadata", { channel: "human_live_chat" })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return;

    const nextAlert = ((data ?? [])[0] ?? null) as LiveChatAlert | null;
    const nextCount = typeof count === "number" ? count : (data ?? []).length;

    if (announce && nextCount > previousCount.current && nextAlert) {
      toast({
        title: "New website live-chat message",
        description: nextAlert.body || "A buyer is waiting in Live Chat.",
      });
    }

    previousCount.current = nextCount;
    setUnreadCount(nextCount);
    setLatestAlert(nextAlert);
  }, []);

  useEffect(() => {
    void load(false);

    const interval = window.setInterval(() => void load(true), POLL_INTERVAL_MS);
    const onFocus = () => void load(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load(true);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const realtime = supabase
      .channel("admin-live-chat-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_notifications" },
        () => void load(true),
      )
      .subscribe();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void load(false);
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(realtime);
    };
  }, [load]);

  if (!isAdmin || unreadCount < 1) return null;

  return (
    <a
      href={liveChatHref(latestAlert)}
      className="fixed z-[69] right-3 top-[calc(4.25rem+env(safe-area-inset-top))] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-emerald-400/60 bg-card/95 p-3 shadow-2xl backdrop-blur md:right-5 md:top-20"
      aria-label={`Open Live Chat — ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
    >
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <MessageSquareText size={19} />
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            <BellRing size={13} className="animate-pulse" /> Buyer waiting in Live Chat
          </span>
          <span className="mt-1 block truncate text-sm font-medium">{latestAlert?.title || "Live chat waiting"}</span>
          <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-foreground/65">
            {latestAlert?.body || "Tap to open the conversation and reply."}
          </span>
          <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Tap to reply now</span>
        </span>
      </div>
    </a>
  );
}
