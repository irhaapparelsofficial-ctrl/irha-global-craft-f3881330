import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Inbox, MessageSquareText, Volume2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type OwnerAlert = {
  id: string;
  notification_type: string;
  source_type: string | null;
  source_id: string | null;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
};

type AlertKind = "live_chat" | "inquiry";

const db = supabase as any;
const POLL_INTERVAL_MS = 20_000;
const OWNER_VIEW_QUERY = "ownerView";
const OWNER_VIEW_INQUIRIES = "inquiries";
const SOUND_PREFERENCE_KEY = "irha-owner-alert-sound";

function alertKind(alert: OwnerAlert): AlertKind | null {
  if (alert.metadata?.channel === "human_live_chat") return "live_chat";
  if (alert.notification_type === "new_lead" && alert.source_type === "inquiry") return "inquiry";
  return null;
}

function liveChatEvent(alert: OwnerAlert) {
  return typeof alert.metadata?.event === "string" ? alert.metadata.event : "message";
}

function alertEventKey(alert: OwnerAlert) {
  if (alertKind(alert) === "live_chat") {
    const event = liveChatEvent(alert);
    if (event === "presence") {
      const presenceId = typeof alert.metadata?.presence_event_id === "string"
        ? alert.metadata.presence_event_id
        : alert.created_at;
      return `live_chat:${alert.id}:presence:${presenceId}`;
    }
    const messageId = typeof alert.metadata?.message_id === "string" ? alert.metadata.message_id : alert.updated_at;
    return `live_chat:${alert.id}:message:${messageId}`;
  }
  return `inquiry:${alert.id}`;
}

function alertHref(alert: OwnerAlert | null) {
  if (!alert) return "/admin";
  if (alertKind(alert) === "live_chat") {
    const sessionId = typeof alert.metadata?.session_id === "string" ? alert.metadata.session_id.trim() : "";
    return sessionId ? `/admin/live-chat?session=${encodeURIComponent(sessionId)}` : "/admin/live-chat";
  }
  return `/admin?${OWNER_VIEW_QUERY}=${OWNER_VIEW_INQUIRIES}`;
}

function normalizedButtonText(button: HTMLButtonElement) {
  return (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findAdminButtonByPrefixes(prefixes: string[]) {
  const normalizedPrefixes = prefixes.map((prefix) => prefix.toLowerCase());
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const text = normalizedButtonText(button);
    return normalizedPrefixes.some((prefix) => text.startsWith(prefix));
  }) ?? null;
}

function openInquiryWorkspaceFromCurrentAdminView() {
  const requestButton = findAdminButtonByPrefixes(["review new requests", "new requests"]);
  if (!requestButton) return false;
  requestButton.click();
  return true;
}

function requestedOwnerView() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(OWNER_VIEW_QUERY);
}

function clearRequestedOwnerView() {
  const url = new URL(window.location.href);
  url.searchParams.delete(OWNER_VIEW_QUERY);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function supportsDeviceAlerts() {
  return typeof window !== "undefined" && "Notification" in window;
}

export default function AdminLiveChatNotification() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [alerts, setAlerts] = useState<OwnerAlert[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    supportsDeviceAlerts() ? Notification.permission : "denied",
  );
  const [soundEnabled, setSoundEnabled] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem(SOUND_PREFERENCE_KEY) === "on",
  );
  const initialized = useRef(false);
  const seenEventKeys = useRef(new Set<string>());
  const collapseTimer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.32);
    } catch {
      // Visible toast and Web Push remain active when audio is unavailable.
    }
  }, [soundEnabled]);

  const announce = useCallback((alert: OwnerAlert) => {
    const kind = alertKind(alert);
    const presence = kind === "live_chat" && liveChatEvent(alert) === "presence";
    const title = presence
      ? "Live Chat visitor arrived"
      : kind === "live_chat"
        ? "New live-chat message"
        : "New buyer inquiry";
    const description = alert.body || (presence
      ? "A website visitor opened Live Chat."
      : kind === "live_chat"
        ? "A buyer is waiting in Live Chat."
        : "A new inquiry is waiting in Buyer Inbox.");

    toast({ title, description });
    playChime();

    const pageIsNotControlledByPushWorker = !("serviceWorker" in navigator) || !navigator.serviceWorker.controller;
    if (supportsDeviceAlerts() && Notification.permission === "granted" && pageIsNotControlledByPushWorker) {
      const notification = new Notification(title, {
        body: description,
        icon: "/favicon.ico",
        tag: alertEventKey(alert),
      });
      notification.onclick = () => {
        window.focus();
        window.location.assign(alertHref(alert));
        notification.close();
      };
    }

    const key = alertEventKey(alert);
    setExpandedKey(key);
    if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
    collapseTimer.current = window.setTimeout(() => setExpandedKey(null), 8_000);
  }, [playChime]);

  const load = useCallback(async (shouldAnnounce: boolean) => {
    if (!window.location.pathname.startsWith("/admin")) {
      setIsAdmin(false);
      setAlerts([]);
      initialized.current = false;
      seenEventKeys.current.clear();
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
    const { data, error } = await db
      .from("crm_notifications")
      .select("id,notification_type,source_type,source_id,title,body,status,created_at,updated_at,metadata")
      .eq("status", "unread")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) return;

    const relevant = ((data ?? []) as OwnerAlert[]).filter((alert) => alertKind(alert) !== null);
    const nextKeys = new Set(relevant.map(alertEventKey));

    if (initialized.current && shouldAnnounce) {
      relevant
        .filter((alert) => !seenEventKeys.current.has(alertEventKey(alert)))
        .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
        .forEach(announce);
    }

    initialized.current = true;
    seenEventKeys.current = nextKeys;
    setAlerts(relevant);
  }, [announce]);

  const enableDeviceAlerts = useCallback(async () => {
    if (!supportsDeviceAlerts()) {
      toast({
        title: "Device alerts are not supported here",
        description: "Realtime alerts will still appear inside the admin dashboard.",
      });
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") {
      toast({
        title: "Device alerts were not enabled",
        description: "Allow notifications in browser settings, then try again.",
      });
      return;
    }

    window.localStorage.setItem(SOUND_PREFERENCE_KEY, "on");
    setSoundEnabled(true);
    new Notification("Irha owner alerts enabled", {
      body: "New inquiries, visitor arrivals and live-chat messages will alert this device while your admin session is active.",
      icon: "/favicon.ico",
      tag: "irha-owner-alerts-enabled",
    });
    toast({
      title: "Owner alerts enabled",
      description: "Inquiry and live-chat visitor alerts are active on this device.",
    });
  }, []);

  useEffect(() => {
    void load(false);
    const interval = window.setInterval(() => void load(true), POLL_INTERVAL_MS);
    const onFocus = () => void load(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const unlockAudio = () => {
      if (!soundEnabled) return;
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContext.current = audioContext.current ?? new AudioContextClass();
        void audioContext.current.resume();
      } catch {
        // Audio is optional; visible and background alerts remain active.
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("visibilitychange", onVisibility);

    const realtime = supabase
      .channel("admin-owner-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_notifications" }, () => void load(true))
      .subscribe();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => void load(false));

    return () => {
      window.clearInterval(interval);
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("visibilitychange", onVisibility);
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(realtime);
    };
  }, [load, soundEnabled]);

  useEffect(() => {
    if (!isAdmin || requestedOwnerView() !== OWNER_VIEW_INQUIRIES) return;

    let attempts = 0;
    let inboxActivated = false;
    const tryOpen = () => {
      attempts += 1;
      if (openInquiryWorkspaceFromCurrentAdminView()) {
        clearRequestedOwnerView();
        return true;
      }
      if (!inboxActivated) {
        const inboxButton = findAdminButtonByPrefixes(["inbox"]);
        if (inboxButton) {
          inboxButton.click();
          inboxActivated = true;
        }
      }
      if (attempts >= 40) {
        clearRequestedOwnerView();
        toast({
          title: "Open Buyer Inbox",
          description: "Tap Inbox, then New Requests to review this inquiry.",
          variant: "destructive",
        });
        return true;
      }
      return false;
    };

    if (tryOpen()) return;
    const timer = window.setInterval(() => {
      if (tryOpen()) window.clearInterval(timer);
    }, 125);
    return () => window.clearInterval(timer);
  }, [isAdmin]);

  const counts = useMemo(() => ({
    liveChat: alerts.filter((alert) => alertKind(alert) === "live_chat").length,
    inquiries: alerts.filter((alert) => alertKind(alert) === "inquiry").length,
  }), [alerts]);
  const latestAlert = alerts[0] ?? null;
  const latestKind = latestAlert ? alertKind(latestAlert) : null;
  const latestKey = latestAlert ? alertEventKey(latestAlert) : null;
  const total = alerts.length;
  const expanded = Boolean(latestAlert && latestKey && expandedKey === latestKey);
  const dedicatedWorkspace = pathname.startsWith("/admin/live-chat") || pathname.startsWith("/admin/visitors");

  if (!isAdmin || total < 1 || dedicatedWorkspace) return null;

  const openLatest = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (latestKind !== "inquiry") return;
    event.preventDefault();
    if (!openInquiryWorkspaceFromCurrentAdminView()) window.location.assign(alertHref(latestAlert));
  };

  if (!expanded) {
    return (
      <a
        href={alertHref(latestAlert)}
        onClick={openLatest}
        className="touch-manipulation fixed right-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[65] inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/35 bg-[#0b0d11]/96 px-3 py-2 text-white shadow-xl backdrop-blur-xl md:right-5 md:top-20"
        aria-label={`Open owner alerts — ${total} unread`}
      >
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/12 text-gold">
          <BellRing size={16} />
          <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">{total > 99 ? "99+" : total}</span>
        </span>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 sm:inline">Owner inbox</span>
      </a>
    );
  }

  return (
    <aside className="fixed inset-x-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[65] mx-auto max-w-md rounded-2xl border border-gold/35 bg-[#0b0d11]/97 p-3 text-white shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-5 md:top-20 md:w-[25rem]" aria-live="polite">
      <button type="button" onClick={() => setExpandedKey(null)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white" aria-label="Collapse owner alert">
        <X size={15} />
      </button>
      <a href={alertHref(latestAlert)} onClick={openLatest} className="touch-manipulation flex items-start gap-3 pr-8">
        <span className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${latestKind === "live_chat" ? "bg-emerald-500/12 text-emerald-300" : "bg-gold/12 text-gold"}`}>
          {latestKind === "live_chat" ? <MessageSquareText size={18} /> : <Inbox size={18} />}
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{total > 99 ? "99+" : total}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-gold">New owner alert</span>
          <span className="mt-1 block truncate text-sm font-semibold">{latestAlert?.title}</span>
          <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-white/55">{latestAlert?.body}</span>
          <span className="mt-2 flex gap-3 text-[9px] font-semibold uppercase tracking-[0.11em]">
            {counts.liveChat > 0 && <span className="text-emerald-300">Chats {counts.liveChat}</span>}
            {counts.inquiries > 0 && <span className="text-gold">Inquiries {counts.inquiries}</span>}
            <span className="text-white/40">Open</span>
          </span>
        </span>
      </a>
      {permission !== "granted" && supportsDeviceAlerts() && (
        <button type="button" onClick={enableDeviceAlerts} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/8 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold">
          <Volume2 size={14} /> Enable device alerts
        </button>
      )}
    </aside>
  );
}
