import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import {
  claimOneTimeAssetRecovery,
  isRecoverableAssetError,
} from "@/lib/appRuntimeIncident";
import "./index.css";

const CACHE_HEAL_KEY = "irha:cache-heal-version";
const CACHE_HEAL_VERSION = "2026-08-11-v5";
const INITIAL_ROUTE_PRELOAD_TIMEOUT_MS = 1_800;
const OWNER_PUSH_WORKER_PATH = "/irha-owner-sw.js";
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

function isOwnerPushRegistration(registration: ServiceWorkerRegistration) {
  const scriptUrl =
    registration.active?.scriptURL ??
    registration.waiting?.scriptURL ??
    registration.installing?.scriptURL ??
    "";

  try {
    return new URL(scriptUrl).pathname === OWNER_PUSH_WORKER_PATH;
  } catch {
    return scriptUrl.includes(OWNER_PUSH_WORKER_PATH);
  }
}

async function clearLegacyClientCaches() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => !isOwnerPushRegistration(registration))
        .map((registration) => registration.unregister()),
    );
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

async function healLegacyClientCacheOnce() {
  let alreadyHealed = false;
  try {
    alreadyHealed = localStorage.getItem(CACHE_HEAL_KEY) === CACHE_HEAL_VERSION;
  } catch {
    // Storage can be unavailable in hardened/privacy contexts. Run the cleanup
    // for this navigation rather than leaving an obsolete worker in control.
  }

  if (alreadyHealed) return;

  try {
    await clearLegacyClientCaches();
  } finally {
    try {
      localStorage.setItem(CACHE_HEAL_KEY, CACHE_HEAL_VERSION);
    } catch {
      // Buyer rendering must not depend on storage availability.
    }
  }
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

function installVitePreloadRecovery() {
  window.addEventListener("vite:preloadError", (event) => {
    const preloadEvent = event as Event & { payload?: unknown };
    const payload = preloadEvent.payload;
    const error = payload instanceof Error
      ? payload
      : new Error(typeof payload === "string" ? payload : "Failed to preload application asset");
    const route = window.location.pathname || "/";

    if (!isRecoverableAssetError(error) || !claimOneTimeAssetRecovery(route)) return;

    preloadEvent.preventDefault();
    void clearLegacyClientCaches().finally(() => {
      window.location.reload();
    });
  });
}

async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Irha application root is missing");

  // Legacy service workers and Cache Storage must be retired before any route
  // chunk is requested. Otherwise an old client can request a hashed chunk from
  // a release that Cloudflare Pages has already replaced.
  await healLegacyClientCacheOnce();

  // The static route shell remains available to no-script clients and crawlers,
  // but critical CSS hides it as soon as JavaScript is detected. While the first
  // route chunk downloads, buyers see the current branded boot frame rather than
  // an obsolete page that React later replaces.
  const initialRoute = preloadInitialRoute(normalizedPathname());
  if (initialRoute) {
    await Promise.race([
      initialRoute.catch(() => undefined),
      delay(INITIAL_ROUTE_PRELOAD_TIMEOUT_MS),
    ]);
  }

  createRoot(rootElement).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
}

installVitePreloadRecovery();
void bootstrap();
