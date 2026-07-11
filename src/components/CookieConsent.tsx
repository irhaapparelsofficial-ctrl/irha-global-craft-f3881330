import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "irha_cookie_consent_v1";
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;
export const OPEN_COOKIE_SETTINGS_EVENT = "irha:open-cookie-settings";

type Categories = { analytics: boolean; ads: boolean };
type Consent = { categories: Categories; ts: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
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
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

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
    const stored = readStored();
    if (stored) {
      applyConsent(stored.categories);
      return;
    }
    applyConsent({ analytics: false, ads: false });
    setVisible(true);
  }, []);

  const acceptAll = useCallback(() => {
    const categories = { analytics: true, ads: true };
    save(categories);
    applyConsent(categories);
    setVisible(false);
    setCustomizing(false);
  }, []);

  const rejectAll = useCallback(() => {
    const categories = { analytics: false, ads: false };
    save(categories);
    applyConsent(categories);
    setVisible(false);
    setCustomizing(false);
  }, []);

  const savePrefs = useCallback(() => {
    const categories = { analytics, ads };
    save(categories);
    applyConsent(categories);
    setVisible(false);
    setCustomizing(false);
  }, [analytics, ads]);

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      aria-live="polite"
      className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+3.75rem)] z-[100] rounded-lg bg-black/95 text-white shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md"
    >
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <h2 id="cookie-consent-title" className="text-sm font-semibold text-white">Cookie choices</h2>
        <p id="cookie-consent-description" className="text-[13px] leading-snug text-white/90">
          We use optional analytics and advertising cookies only after your choice.{" "}
          <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>

        {customizing && (
          <div className="grid gap-1.5 rounded-md border border-white/15 bg-white/5 p-2.5 text-xs">
            <label className="min-h-10 flex items-center justify-between gap-3 opacity-70">
              <span>Essential <span className="text-white/50">(always on)</span></span>
              <input type="checkbox" checked readOnly aria-label="Essential cookies always on" className="h-5 w-5 accent-[#16a34a]" />
            </label>
            <label className="min-h-10 flex items-center justify-between gap-3">
              <span>Analytics</span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="h-5 w-5 accent-[#16a34a]"
              />
            </label>
            <label className="min-h-10 flex items-center justify-between gap-3">
              <span>Advertising</span>
              <input
                type="checkbox"
                checked={ads}
                onChange={(event) => setAds(event.target.checked)}
                className="h-5 w-5 accent-[#16a34a]"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="min-h-11 flex-1 rounded-md bg-[#16a34a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#15803d]"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={rejectAll}
            className="min-h-11 flex-1 rounded-md border border-white/40 px-3 py-2 text-xs font-medium text-white hover:bg-white/10"
          >
            Reject Optional
          </button>
          {!customizing ? (
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="min-h-11 inline-flex items-center px-2 text-[11px] text-white/70 underline underline-offset-2 hover:text-white"
            >
              Customize
            </button>
          ) : (
            <button
              type="button"
              onClick={savePrefs}
              className="min-h-11 inline-flex items-center px-2 text-[11px] text-white/90 underline underline-offset-2 hover:text-white"
            >
              Save Preferences
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
