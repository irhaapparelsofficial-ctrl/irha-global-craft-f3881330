import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabasePublishableKey, supabaseRuntimeUrl } from "@/integrations/supabase/client";
import {
  normalizeCanonicalPath,
  trackCommercialEvent,
  VISITOR_RATE_TOKEN_KEY,
  VISITOR_SESSION_KEY,
} from "@/lib/commercialMeasurement";

type VisitorContext = {
  countryCode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

const ARRIVAL_KEY_PREFIX = "irha:site-visitor-arrived:";
const CHAT_OPEN_EVENT = "irha:human-chat-opened";
const PROGRAMMATIC_CHAT_OPEN_EVENT = "irha:open-human-chat";
const HEARTBEAT_INTERVAL_MS = 45_000;

function readSessionId() {
  try {
    const existing = sessionStorage.getItem(VISITOR_SESSION_KEY);
    if (existing) return existing;
    const created = `site-${crypto.randomUUID()}`;
    sessionStorage.setItem(VISITOR_SESSION_KEY, created);
    return created;
  } catch {
    return `site-${crypto.randomUUID()}`;
  }
}

function readRateToken() {
  try { return sessionStorage.getItem(VISITOR_RATE_TOKEN_KEY); } catch { return null; }
}

function writeRateToken(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return;
  try { sessionStorage.setItem(VISITOR_RATE_TOKEN_KEY, value); } catch { /* non-fatal */ }
}

function arrivalWasSent(sessionId: string) {
  try { return sessionStorage.getItem(`${ARRIVAL_KEY_PREFIX}${sessionId}`) === "1"; } catch { return false; }
}

function markArrivalSent(sessionId: string) {
  try { sessionStorage.setItem(`${ARRIVAL_KEY_PREFIX}${sessionId}`, "1"); } catch { /* server dedupe remains authoritative */ }
}

function referrerHost() {
  if (!document.referrer) return null;
  try { return new URL(document.referrer).hostname || null; } catch { return null; }
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
  return !pathname.startsWith("/admin") && !pathname.startsWith("/auth") && !pathname.startsWith("/seo-indexing");
}

function controlLabel(control: HTMLElement) {
  return `${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${control.textContent || ""}`
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isLiveChatLauncher(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const control = target.closest<HTMLElement>("button,a");
  if (!control) return false;
  const label = controlLabel(control);
  return label.includes("live chat") && (label.includes("open") || label.includes("chat with"));
}

function classifyCommercialClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const control = target.closest<HTMLElement>("a,button");
  if (!control) return null;
  const label = controlLabel(control);
  const href = control instanceof HTMLAnchorElement ? control.href : "";
  let host: string | null = null;
  try { host = href ? new URL(href, window.location.origin).hostname : null; } catch { host = null; }

  if (/wa\.me|whatsapp\.com/i.test(href)) return { event: "whatsapp_click" as const, kind: "whatsapp", host };
  if (/^mailto:/i.test(href)) return { event: "email_click" as const, kind: "email", host: null };
  if (label.includes("sample")) return { event: "sample_cta_click" as const, kind: "sample", host };
  if (label.includes("quote") || label.includes("rfq")) return { event: "quote_cta_click" as const, kind: "quote", host };
  if (label.includes("inquir") || label.includes("contact us") || label.includes("get in touch")) {
    return { event: "inquiry_cta_click" as const, kind: "inquiry", host };
  }
  return null;
}

export default function SiteVisitorTracker() {
  const { pathname, search } = useLocation();
  const sessionIdRef = useRef(readSessionId());
  const contextRef = useRef<VisitorContext | null>(null);
  const lastHeartbeatRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const formStartPathsRef = useRef(new Set<string>());

  const report = useCallback(async (action: "arrive" | "heartbeat" | "chat_open", force = false) => {
    if (!shouldTrack(window.location.pathname)) return;
    if (!force && action === "heartbeat" && Date.now() - lastHeartbeatRef.current < HEARTBEAT_INTERVAL_MS) return;
    if (inFlightRef.current) return inFlightRef.current;

    const operation = (async () => {
      const context = contextRef.current ?? await readEdgeContext();
      contextRef.current = context;
      const currentPath = normalizeCanonicalPath(window.location.pathname);
      const payload = {
        action,
        visitorSessionId: sessionIdRef.current,
        rateLimitToken: readRateToken(),
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
      const responseBody = await response.json().catch(() => ({})) as { rateLimitToken?: unknown; dropped?: unknown };
      writeRateToken(responseBody.rateLimitToken);
      if (action === "arrive" && responseBody.dropped !== "limiter_unavailable") markArrivalSent(sessionIdRef.current);
      lastHeartbeatRef.current = Date.now();
    })().catch(() => {
      // Presence tracking must never interrupt the buyer experience.
    });

    inFlightRef.current = operation;
    try { await operation; } finally { inFlightRef.current = null; }
  }, []);

  useEffect(() => {
    if (!shouldTrack(pathname)) return;
    if (!arrivalWasSent(sessionIdRef.current)) void report("arrive", true);
    else void report("heartbeat", true);
    void trackCommercialEvent("page_view");
  }, [pathname, search, report]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void report("heartbeat");
    };
    const onChatOpen = () => void report("chat_open", true);
    const onDocumentClick = (event: MouseEvent) => {
      if (isLiveChatLauncher(event.target)) void report("chat_open", true);
      const commercial = classifyCommercialClick(event.target);
      if (commercial) {
        void trackCommercialEvent(commercial.event, {
          cta_location: normalizeCanonicalPath(window.location.pathname),
          link_kind: commercial.kind,
          link_host: commercial.host,
        });
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("form")) return;
      const path = normalizeCanonicalPath(window.location.pathname);
      if (formStartPathsRef.current.has(path)) return;
      formStartPathsRef.current.add(path);
      void trackCommercialEvent("rfq_start", { cta_location: path, link_kind: "form_focus" });
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void report("heartbeat");
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("focusin", onFocusIn, true);
    window.addEventListener(CHAT_OPEN_EVENT, onChatOpen);
    window.addEventListener(PROGRAMMATIC_CHAT_OPEN_EVENT, onChatOpen);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener(CHAT_OPEN_EVENT, onChatOpen);
      window.removeEventListener(PROGRAMMATIC_CHAT_OPEN_EVENT, onChatOpen);
    };
  }, [report]);

  return null;
}
