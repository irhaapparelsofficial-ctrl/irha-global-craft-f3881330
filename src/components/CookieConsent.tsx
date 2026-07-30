import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";

const STORAGE_KEY = "irha_cookie_consent_v1";
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;
const GOOGLE_ANALYTICS_ID = "G-RV39YH4CPF";
const GOOGLE_ADS_ID = "AW-18279003993";
const GOOGLE_TAG_SCRIPT_ID = "irha-google-tag-loader";

export const OPEN_COOKIE_SETTINGS_EVENT = "irha:open-cookie-settings";
export const ANALYTICS_CONSENT_EVENT = "irha:analytics-consent-changed";

type Categories = { analytics: boolean; ads: boolean };
type Consent = { categories: Categories; ts: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __irhaGtagBootstrapped?: boolean;
    __irhaGoogleAnalyticsConfigured?: boolean;
    __irhaGoogleAdsConfigured?: boolean;
  }
}

const applyConsent = (categories: Categories) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: categories.analytics ? "granted" : "denied",
    ad_storage: categories.ads ? "granted" : "denied",
    ad_user_data: categories.ads ? "granted" : "denied",
    ad_personalization: categories.ads ? "granted" : "denied",
  });
};

const ensureGoogleTags = (categories: Categories) => {
  if ((!categories.analytics && !categories.ads) || typeof window.gtag !== "function") return;
  if (!window.__irhaGtagBootstrapped) {
    window.gtag("js", new Date());
    window.__irhaGtagBootstrapped = true;
  }
  if (categories.analytics && !window.__irhaGoogleAnalyticsConfigured) {
    window.gtag("config", GOOGLE_ANALYTICS_ID, { send_page_view: false });
    window.__irhaGoogleAnalyticsConfigured = true;
  }
  if (categories.ads && !window.__irhaGoogleAdsConfigured) {
    window.gtag("config", GOOGLE_ADS_ID);
    window.__irhaGoogleAdsConfigured = true;
  }
  if (!document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${categories.analytics ? GOOGLE_ANALYTICS_ID : GOOGLE_ADS_ID}`;
    document.head.appendChild(script);
  }
};

const applyAndLoad = (categories: Categories) => {
  applyConsent(categories);
  ensureGoogleTags(categories);
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
};

const readStored = (): Consent | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (!parsed?.ts || Date.now() - parsed.ts > SIX_MONTHS_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const save = (categories: Categories) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, ts: Date.now() }));
  } catch {
    // Storage can be unavailable in restricted browsing modes.
  }
};

export default function CookieConsent() {
  const [initialConsent] = useState<Consent | null>(() => readStored());
  const [visible, setVisible] = useState(() => initialConsent === null);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(() => initialConsent?.categories.analytics ?? false);
  const [ads, setAds] = useState(() => initialConsent?.categories.ads ?? false);

  useEffect(() => {
    document.documentElement.dataset.cookieConsentOpen = visible ? "true" : "false";
    return () => { delete document.documentElement.dataset.cookieConsentOpen; };
  }, [visible]);

  useEffect(() => {
    const open = () => {
      const stored = readStored();
      setAnalytics(stored?.categories.analytics ?? false);
      setAds(stored?.categories.ads ?? false);
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  useEffect(() => {
    if (initialConsent) {
      applyAndLoad(initialConsent.categories);
      return;
    }
    applyConsent({ analytics: false, ads: false });
  }, [initialConsent]);

  const close = useCallback(() => {
    setVisible(false);
    setCustomizing(false);
  }, []);

  const acceptAll = useCallback(() => {
    const categories = { analytics: true, ads: true };
    save(categories);
    applyAndLoad(categories);
    close();
  }, [close]);

  const rejectAll = useCallback(() => {
    const categories = { analytics: false, ads: false };
    save(categories);
    applyConsent(categories);
    window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
    close();
  }, [close]);

  const savePrefs = useCallback(() => {
    const categories = { analytics, ads };
    save(categories);
    applyAndLoad(categories);
    close();
  }, [analytics, ads, close]);

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      aria-live="polite"
      className="relative z-[100] mx-auto mt-[calc(5.25rem+env(safe-area-inset-top))] w-[calc(100%-1.25rem)] max-w-[620px] overflow-hidden rounded-xl border border-white/20 bg-black/95 text-white shadow-[0_18px_70px_rgba(0,0,0,.72)] backdrop-blur-xl"
    >
      <div className="p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="font-sans text-xs font-semibold text-white sm:text-sm">
              Optional cookies
            </h2>
            <p id="cookie-consent-description" className="mt-0.5 text-[10px] leading-4 text-white/70 sm:text-[11px] sm:leading-5">
              Analytics and advertising remain off until accepted. Essential cookies are always on.{" "}
              <Link to="/privacy-policy" className="text-white/90 underline underline-offset-2 hover:text-primary">Privacy</Link>
            </p>
          </div>
          {customizing && (
            <button type="button" onClick={() => setCustomizing(false)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-white/60 hover:text-white" aria-label="Close cookie preferences">
              <X size={14} />
            </button>
          )}
        </div>

        {customizing && (
          <div className="mt-2 grid gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1.5 text-[11px]">
            <label className="flex min-h-9 items-center justify-between gap-3 rounded-md px-2 text-white/50">
              <span>Essential · always on</span>
              <input type="checkbox" checked readOnly aria-label="Essential cookies always on" className="h-4 w-4 accent-[#d5ad4d]" />
            </label>
            <label className="flex min-h-9 items-center justify-between gap-3 rounded-md px-2 hover:bg-white/5">
              <span>Analytics</span>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="h-4 w-4 accent-[#d5ad4d]" />
            </label>
            <label className="flex min-h-9 items-center justify-between gap-3 rounded-md px-2 hover:bg-white/5">
              <span>Advertising</span>
              <input type="checkbox" checked={ads} onChange={(event) => setAds(event.target.checked)} className="h-4 w-4 accent-[#d5ad4d]" />
            </label>
          </div>
        )}

        <div className="mt-2 grid grid-cols-[1fr_1.15fr] gap-2">
          <button type="button" onClick={rejectAll} className="min-h-10 rounded-md border border-white/25 px-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/90 transition hover:border-white/50 hover:bg-white/5 sm:text-[10px]">
            Essential only
          </button>
          <button type="button" onClick={customizing ? savePrefs : acceptAll} className="min-h-10 rounded-md bg-gradient-gold px-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary-foreground transition hover:shadow-gold sm:text-[10px]">
            {customizing ? "Save choices" : "Accept optional"}
          </button>
        </div>

        {!customizing && (
          <button type="button" onClick={() => setCustomizing(true)} className="mt-1 inline-flex min-h-7 w-full items-center justify-center gap-1 text-[9px] font-medium text-white/50 hover:text-white">
            Settings <ChevronDown size={11} />
          </button>
        )}
      </div>
    </section>
  );
}
