import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "irha_cookie_consent_v1";

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem("irha:sid");
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem("irha:sid", s);
    }
    return s;
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

export default function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return;
    if (!hasAnalyticsConsent()) return;

    const pageLocation = window.location.href;
    const pagePath = pathname + search;

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
  }, [pathname, search]);

  return null;
}
