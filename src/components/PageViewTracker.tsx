import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "irha_cookie_consent_v1";

function getSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem("irha:sid");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("irha:sid", sessionId);
    }
    return sessionId;
  } catch {
    return "anon";
  }
}

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { categories?: { analytics?: boolean } };
    return parsed?.categories?.analytics === true;
  } catch {
    return false;
  }
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

export default function PageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pagePath = normalizePath(pathname);
    if (pagePath.startsWith("/admin") || pagePath.startsWith("/auth")) return;
    if (!hasAnalyticsConsent()) return;

    const pageLocation = `${window.location.origin}${pagePath}`;

    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_location: pageLocation,
        page_path: pagePath,
        send_to: "G-RV39YH4CPF",
      });
    }

    void supabase.from("page_views").insert({
      path: pagePath,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
    });
  }, [pathname]);

  return null;
}
