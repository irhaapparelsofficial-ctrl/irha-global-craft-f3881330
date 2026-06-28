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

type Geo = { country?: string | null; city?: string | null; region?: string | null };

async function getGeo(): Promise<Geo> {
  try {
    const cached = sessionStorage.getItem("irha:geo");
    if (cached) return JSON.parse(cached) as Geo;
    // Free, no-key IP geolocation. Falls back gracefully on failure.
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return {};
    const j = await res.json();
    const geo: Geo = {
      country: j.country_name || j.country || null,
      city: j.city || null,
      region: j.region || null,
    };
    try { sessionStorage.setItem("irha:geo", JSON.stringify(geo)); } catch { /* ignore */ }
    return geo;
  } catch {
    return {};
  }
}

export default function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const pageLocation = window.location.href;
    const pagePath = pathname + search;

    // Google Analytics 4 + Google Ads
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_location: pageLocation,
        page_path: pagePath,
        send_to: "G-RV39YH4CPF",
      });
    }

    // Skip admin/auth pages from analytics
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return;

    // Log to our own DB for the admin dashboard (with geo on first hit of session).
    void (async () => {
      const geo = await getGeo();
      await supabase.from("page_views").insert({
        path: pagePath,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        session_id: getSessionId(),
        country: geo.country ?? null,
        city: geo.city ?? null,
        region: geo.region ?? null,
      });
    })();
  }, [pathname, search]);

  return null;
}
