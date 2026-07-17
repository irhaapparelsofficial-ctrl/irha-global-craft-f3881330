import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabasePublishableKey, supabaseRuntimeUrl } from "@/integrations/supabase/client";

type VisitorContext = {
  countryCode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

const SESSION_KEY = "irha:site-visitor-session";
const ARRIVAL_KEY_PREFIX = "irha:site-visitor-arrived:";
const CHAT_OPEN_EVENT = "irha:human-chat-opened";
const HEARTBEAT_INTERVAL_MS = 45_000;

function readSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = `site-${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `site-${crypto.randomUUID()}`;
  }
}

function arrivalWasSent(sessionId: string) {
  try {
    return sessionStorage.getItem(`${ARRIVAL_KEY_PREFIX}${sessionId}`) === "1";
  } catch {
    return false;
  }
}

function markArrivalSent(sessionId: string) {
  try {
    sessionStorage.setItem(`${ARRIVAL_KEY_PREFIX}${sessionId}`, "1");
  } catch {
    // Server-side dedupe still prevents duplicate owner alerts.
  }
}

function referrerHost() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname || null;
  } catch {
    return null;
  }
}

function deviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
}

async function readEdgeContext(): Promise<VisitorContext> {
  const fallback: VisitorContext = {
    countryCode: null,
    country: null,
    region: null,
    city: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  };

  try {
    const response = await fetch("/api/visitor-context", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return fallback;
    const body = await response.json() as Partial<VisitorContext>;
    return {
      countryCode: body.countryCode || null,
      country: body.country || null,
      region: body.region || null,
      city: body.city || null,
      timezone: body.timezone || fallback.timezone,
    };
  } catch {
    return fallback;
  }
}

function shouldTrack(pathname: string) {
  return !pathname.startsWith("/admin") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/seo-indexing");
}

export default function SiteVisitorTracker() {
  const { pathname, search } = useLocation();
  const sessionIdRef = useRef(readSessionId());
  const contextRef = useRef<VisitorContext | null>(null);
  const lastHeartbeatRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const report = useCallback(async (action: "arrive" | "heartbeat" | "chat_open", force = false) => {
    if (!shouldTrack(window.location.pathname)) return;
    if (!force && action === "heartbeat" && Date.now() - lastHeartbeatRef.current < HEARTBEAT_INTERVAL_MS) return;
    if (inFlightRef.current) return inFlightRef.current;

    const operation = (async () => {
      const context = contextRef.current ?? await readEdgeContext();
      contextRef.current = context;
      const currentPath = `${window.location.pathname}${window.location.search}`.slice(0, 500);
      const payload = {
        action,
        visitorSessionId: sessionIdRef.current,
        countryCode: context.countryCode,
        country: context.country,
        region: context.region,
        city: context.city,
        timezone: context.timezone,
        language: navigator.language || null,
        entryPath: currentPath,
        currentPath,
        referrerHost: referrerHost(),
        deviceType: deviceType(),
        viewportWidth: window.innerWidth,
      };

      const response = await fetch(`${supabaseRuntimeUrl}/functions/v1/site-visitor`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabasePublishableKey}`,
          apikey: supabasePublishableKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) return;
      if (action === "arrive") markArrivalSent(sessionIdRef.current);
      lastHeartbeatRef.current = Date.now();
    })().catch(() => {
      // Visitor tracking must never interrupt the buyer experience.
    });

    inFlightRef.current = operation;
    try {
      await operation;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!shouldTrack(pathname)) return;
    if (!arrivalWasSent(sessionIdRef.current)) {
      void report("arrive", true);
      return;
    }
    void report("heartbeat", true);
  }, [pathname, search, report]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void report("heartbeat");
    };
    const onChatOpen = () => void report("chat_open", true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void report("heartbeat");
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(CHAT_OPEN_EVENT, onChatOpen);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(CHAT_OPEN_EVENT, onChatOpen);
    };
  }, [report]);

  return null;
}
