import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Globe2 } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type VisitorNotification = {
  id: string;
  body: string;
  created_at: string;
  status: string;
  archived_at: string | null;
  metadata: unknown;
};

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isVisitorArrival(notification: VisitorNotification) {
  const metadata = metadataObject(notification.metadata);
  return metadata.channel === "site_visitor" && metadata.event === "arrival";
}

function visitorSessionId(notification: VisitorNotification) {
  const value = metadataObject(notification.metadata).visitor_session_id;
  return typeof value === "string" && value.trim() ? value : null;
}

function visitorUrl(notification: VisitorNotification) {
  const sessionId = visitorSessionId(notification);
  return sessionId
    ? `/admin/visitors?visitor=${encodeURIComponent(sessionId)}`
    : "/admin/visitors";
}

function relativeTime(value: string) {
  const elapsedMs = Date.now() - new Date(value).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return `${Math.floor(elapsedHours / 24)}d ago`;
}

export default function AdminVisitorPulse() {
  const [authorized, setAuthorized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestUnread, setLatestUnread] = useState<VisitorNotification | null>(null);
  const initialized = useRef(false);
  const loading = useRef(false);
  const seenNotificationIds = useRef(new Set<string>());

  const announce = useCallback((notification: VisitorNotification) => {
    if (seenNotificationIds.current.has(notification.id)) return;
    seenNotificationIds.current.add(notification.id);

    const url = visitorUrl(notification);
    toast({
      title: "New website visitor",
      description: `${notification.body} · ${relativeTime(notification.created_at)}`,
      action: (
        <ToastAction altText="Open visitor" onClick={() => window.location.assign(url)}>
          Open
        </ToastAction>
      ),
    });
  }, []);

  const load = useCallback(async (announceNew = false) => {
    if (loading.current || !window.location.pathname.startsWith("/admin")) return;
    loading.current = true;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setAuthorized(false);
        setUnreadCount(0);
        setLatestUnread(null);
        return;
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (role?.role !== "admin") {
        setAuthorized(false);
        setUnreadCount(0);
        setLatestUnread(null);
        return;
      }

      setAuthorized(true);
      const { data, error, count } = await (supabase as any)
        .from("crm_notifications")
        .select("id,body,created_at,status,archived_at,metadata", { count: "exact" })
        .eq("status", "unread")
        .is("archived_at", null)
        .contains("metadata", { channel: "site_visitor", event: "arrival" })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return;

      const rows = (data ?? []) as unknown as VisitorNotification[];
      if (initialized.current && announceNew) {
        rows
          .filter((notification) => !seenNotificationIds.current.has(notification.id))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .forEach(announce);
      } else if (!initialized.current) {
        rows.forEach((notification) => seenNotificationIds.current.add(notification.id));
      }

      initialized.current = true;
      setUnreadCount(count ?? rows.length);
      setLatestUnread(rows[0] ?? null);
    } finally {
      loading.current = false;
    }
  }, [announce]);

  useEffect(() => {
    void load(false);
    const interval = window.setInterval(() => void load(true), 30_000);
    const realtime = supabase
      .channel("admin-visitor-arrival-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_notifications" },
        (payload) => {
          const row = payload.new as VisitorNotification | undefined;
          if (
            payload.eventType === "INSERT" &&
            row &&
            row.status === "unread" &&
            row.archived_at === null &&
            isVisitorArrival(row)
          ) {
            announce(row);
          }
          void load(false);
        },
      )
      .subscribe();
    const authListener = supabase.auth.onAuthStateChange(() => {
      initialized.current = false;
      seenNotificationIds.current.clear();
      void load(false);
    });

    return () => {
      window.clearInterval(interval);
      authListener.data.subscription.unsubscribe();
      void supabase.removeChannel(realtime);
    };
  }, [announce, load]);

  if (!authorized || unreadCount === 0 || !latestUnread) return null;

  return (
    <a
      href={visitorUrl(latestUnread)}
      className="fixed bottom-[calc(5.35rem+env(safe-area-inset-bottom))] left-3 z-[67] inline-flex min-h-11 max-w-[calc(100vw-6rem)] items-center gap-2 rounded-full border border-gold/40 bg-[#07111f]/97 px-3 py-2 text-white shadow-xl backdrop-blur-xl transition hover:border-gold/70 md:bottom-[5.25rem] md:left-5"
      aria-label={`Open website visitor alerts — ${unreadCount} unread`}
    >
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">
        <Globe2 size={16} />
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[8px] font-bold text-[#07111f]">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-gold">
          <BellRing size={9} /> Visitor alerts
        </span>
        <span className="block truncate text-xs font-medium">{latestUnread.body}</span>
        <span className="block text-[9px] text-white/45">{relativeTime(latestUnread.created_at)} · {unreadCount} unread</span>
      </span>
    </a>
  );
}
