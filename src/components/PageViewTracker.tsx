import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ANALYTICS_CONSENT_EVENT } from "@/components/CookieConsent";

const CONSENT_KEY = "irha_cookie_consent_v1";

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

    const trackPageView = () => {
      if (!hasAnalyticsConsent() || typeof window.gtag !== "function") return;

      window.gtag("event", "page_view", {
        page_location: `${window.location.origin}${pagePath}`,
        page_path: pagePath,
        send_to: "G-RV39YH4CPF",
      });
    };

    trackPageView();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, trackPageView);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, trackPageView);
  }, [pathname]);

  return null;
}
