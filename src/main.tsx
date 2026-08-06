import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import {
  claimOneTimeAssetRecovery,
  isRecoverableAssetError,
} from "@/lib/appRuntimeIncident";
import "./index.css";

const CACHE_HEAL_KEY = "irha:cache-heal-version";
const CACHE_HEAL_VERSION = "2026-07-29-v3";
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

type VitePreloadErrorEvent = Event & { payload?: unknown };

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
      // Buyer rendering must not depend on storage availability.
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

function errorFromUnknown(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  if (value && typeof value === "object" && "message" in value) {
    return new Error(String((value as { message?: unknown }).message ?? "Asset preload failed"));
  }
  return new Error("Asset preload failed");
}

function recoverStaleReleaseOnce(event: Event, error?: Error) {
  const route = normalizedPathname();
  if (error && !isRecoverableAssetError(error)) return false;
  if (!claimOneTimeAssetRecovery(route)) return false;

  event.preventDefault();
  window.location.reload();
  return true;
}

function installReleaseBoundaryRecovery() {
  window.addEventListener("vite:preloadError", (rawEvent) => {
    const event = rawEvent as VitePreloadErrorEvent;
    recoverStaleReleaseOnce(event, event.payload ? errorFromUnknown(event.payload) : undefined);
  });

  window.addEventListener("unhandledrejection", (event) => {
    recoverStaleReleaseOnce(event, errorFromUnknown(event.reason));
  });
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

async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Irha application root is missing");

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
  scheduleLegacyClientCacheHeal();
}

installReleaseBoundaryRecovery();
void bootstrap();
