import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "irha_cookie_consent_v1";
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;
export const OPEN_COOKIE_SETTINGS_EVENT = "irha:open-cookie-settings";

const EU_EEA_UK = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB",
]);

type Categories = { analytics: boolean; ads: boolean };
type Consent = { categories: Categories; ts: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const applyConsent = (c: Categories) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.ads ? "granted" : "denied",
    ad_user_data: c.ads ? "granted" : "denied",
    ad_personalization: c.ads ? "granted" : "denied",
  });
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
    /* ignore */
  }
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  // Re-open from footer link / anywhere
  useEffect(() => {
    const open = () => {
      const stored = readStored();
      if (stored) {
        setAnalytics(stored.categories.analytics);
        setAds(stored.categories.ads);
      }
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  // Initial mount: apply prior choice, or default to showing the compact banner.
  // No client-side geo lookup — CORS-prone third-party calls removed.
  // Locale is a cheap heuristic: EU/UK locales get the banner, others auto-grant analytics.
  useEffect(() => {
    const stored = readStored();
    if (stored) {
      applyConsent(stored.categories);
      return;
    }
    const lang = (navigator.language || "").toUpperCase();
    const region = lang.split("-")[1] || "";
    const isEuLocale = EU_EEA_UK.has(region);
    if (isEuLocale || !region) {
      setVisible(true);
    } else {
      const c = { analytics: true, ads: false };
      save(c);
      applyConsent(c);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const c = { analytics: true, ads: true };
    save(c); applyConsent(c); setVisible(false); setCustomizing(false);
  }, []);

  const rejectAll = useCallback(() => {
    const c = { analytics: false, ads: false };
    save(c); applyConsent(c); setVisible(false); setCustomizing(false);
  }, []);

  const savePrefs = useCallback(() => {
    const c = { analytics, ads };
    save(c); applyConsent(c); setVisible(false); setCustomizing(false);
  }, [analytics, ads]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] w-full bg-black text-white shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:py-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="text-sm leading-relaxed text-white md:flex-1">
          <p>
            We use cookies to improve your experience and analyze site traffic. By clicking Accept,
            you consent to our use of cookies. See{" "}
            <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-white/80">
              Privacy Policy
            </Link>
            .
          </p>

          {customizing && (
            <div className="mt-3 grid gap-2 rounded-md border border-white/15 bg-white/5 p-3 text-xs sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 opacity-70">
                <span>Essential <span className="text-white/50">(always on)</span></span>
                <input type="checkbox" checked readOnly className="h-4 w-4 accent-[#16a34a]" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Analytics</span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="h-4 w-4 accent-[#16a34a]"
                />
              </label>
              <label className="flex items-center justify-between gap-3 sm:col-span-2">
                <span>Advertising</span>
                <input
                  type="checkbox"
                  checked={ads}
                  onChange={(e) => setAds(e.target.checked)}
                  className="h-4 w-4 accent-[#16a34a]"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {!customizing ? (
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="text-xs text-white/70 underline underline-offset-2 hover:text-white sm:order-first sm:mr-2"
            >
              Customize
            </button>
          ) : (
            <button
              type="button"
              onClick={savePrefs}
              className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Save Preferences
            </button>
          )}
          <button
            type="button"
            onClick={rejectAll}
            className="rounded-md border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
