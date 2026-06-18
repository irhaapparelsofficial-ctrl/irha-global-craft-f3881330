import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Per-tab session id so admin dashboard can group views into visits.
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

export default function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const pageLocation = window.location.href;
    const pagePath = pathname + search;

    // Google Analytics (legacy)
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_location: pageLocation,
        page_path: pagePath,
        send_to: "G-RV39YH4CPF",
      });
    }

    // Skip admin/auth pages from analytics
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return;

    // Log to our own DB for the admin dashboard
    void supabase.from("page_views").insert({
      path: pagePath,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
    });
  }, [pathname, search]);

  return null;
}

