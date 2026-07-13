import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AdminBuyerActionsLauncher from "@/components/admin/AdminBuyerActionsLauncher";
import "./index.css";

const CACHE_HEAL_KEY = "irha:cache-heal-version";
const CACHE_HEAL_VERSION = "2026-07-13-v2";

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

void healLegacyClientCacheOnce();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Irha application root is missing");

// The build ships an honest progressive-enhancement shell for no-JS crawlers.
// Remove it before React renders the same public experience interactively.
rootElement.replaceChildren();

createRoot(rootElement).render(
  <>
    <App />
    <AdminBuyerActionsLauncher />
  </>,
);
