import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "irha_cookie_consent_v1";
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const EU_EEA_UK = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB",
]);

type Consent = { choice: "accepted" | "rejected"; ts: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const updateConsent = (granted: boolean) => {
  if (typeof window.gtag !== "function") return;
  const v = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
    analytics_storage: v,
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

const save = (choice: "accepted" | "rejected") => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, ts: Date.now() }));
  } catch {
    /* ignore */
  }
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      updateConsent(stored.choice === "accepted");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (!res.ok) throw new Error("geo");
        const data = await res.json();
        const country = String(data?.country_code || data?.country || "").toUpperCase();
        if (!cancelled && EU_EEA_UK.has(country)) setVisible(true);
      } catch {
        // Geo failed — fail safe: show banner so consent is captured.
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accept = () => {
    save("accepted");
    updateConsent(true);
    setVisible(false);
  };

  const reject = () => {
    save("rejected");
    updateConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] w-full bg-black text-white"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:py-5 md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="text-sm leading-relaxed text-white">
          We use cookies to improve your experience. By clicking Accept, you consent to cookies. See{" "}
          <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-white/80">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reject}
            className="rounded-md border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
