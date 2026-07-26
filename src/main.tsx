import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";

const CACHE_HEAL_KEY = "irha:cache-heal-version";
const CACHE_HEAL_VERSION = "2026-07-13-v2";
const INITIAL_ROUTE_PRELOAD_TIMEOUT_MS = 1_800;
const CRITICAL_BUYER_INTENT_PATHS = new Set([
  "/de/bekleidungshersteller-deutschland",
  "/custom-sportswear-manufacturer-germany",
  "/de/sportbekleidung-hersteller",
  "/leather-apparel-manufacturer-germany",
  "/de/lederbekleidung-hersteller",
  "/fr/",
  "/fr/fabricant-vetements",
  "/fr/fabricant-vetements-sport",
  "/fr/fabricant-vetements-cuir",
  "/fr/fabrication-marque-blanche",
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
]);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

async function healLegacyClientCacheOnce() {
  let alreadyHealed = false;
  try {
    alreadyHealed = localStorage.getItem(CACHE_HEAL_KEY) === CACHE_HEAL_VERSION;
  } catch {
    // Storage can be unavailable in hardened/privacy contexts. In that rare case,
    // run the cleanup for this page load rather than risking a permanently stale client.
  }

  if (alreadyHealed) return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    try {
      localStorage.setItem(CACHE_HEAL_KEY, CACHE_HEAL_VERSION);
    } catch {
      // Ignore storage failures; the application must still render.
    }
  }
}

function scheduleLegacyClientCacheHeal() {
  const run = () => void healLegacyClientCacheOnce();
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(run, { timeout: 5_000 });
    return;
  }
  window.setTimeout(run, 3_000);
}

function normalizedPathname() {
  const pathname = window.location.pathname;
  if (pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return trimmed === "/fr" || trimmed === "/nl" || trimmed === "/de" ? `${trimmed}/` : trimmed;
}

function preloadInitialRoute(pathname: string): Promise<unknown> | null {
  if (pathname === "/") return import("./pages/Home");
  if (CRITICAL_BUYER_INTENT_PATHS.has(pathname)) {
    return import("./pages/BuyerIntentLandingPage");
  }
  return null;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function allowStaticShellPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Irha application root is missing");

  // Keep the route-specific static HTML visible while the critical page chunk
  // downloads. This avoids replacing useful content with a loading spinner and
  // lets the browser paint the crawler-ready H1 before React takes over.
  const initialRoute = preloadInitialRoute(normalizedPathname());
  if (initialRoute) {
    await Promise.race([
      initialRoute.catch(() => undefined),
      delay(INITIAL_ROUTE_PRELOAD_TIMEOUT_MS),
    ]);
  }
  await allowStaticShellPaint();

  rootElement.replaceChildren();
  createRoot(rootElement).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
  scheduleLegacyClientCacheHeal();
}

void bootstrap();
