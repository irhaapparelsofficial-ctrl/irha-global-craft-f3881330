import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CheckCircle2, Loader2, Smartphone, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type NotificationConfig = {
  ok: boolean;
  vapid_public_key: string | null;
  push_supported: boolean;
  active_subscriptions: number;
  email_provider_configured: boolean;
};

type BackendSubscription = {
  enabled: boolean;
  last_success_at: string | null;
  last_error: string | null;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
  userAgentData?: { platform?: string };
};

type HealthState =
  | "ACTIVE"
  | "NEEDS SETUP"
  | "BLOCKED BY BROWSER"
  | "INSTALL ADMIN TO HOME SCREEN";

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function sameApplicationServerKey(subscription: PushSubscription, vapidPublicKey: string) {
  const applied = subscription.options?.applicationServerKey;
  if (!applied) return false;
  const appliedBytes = new Uint8Array(applied as ArrayBuffer);
  let expectedBytes: Uint8Array;
  try {
    expectedBytes = base64UrlToUint8Array(vapidPublicKey);
  } catch {
    return false;
  }
  if (appliedBytes.length !== expectedBytes.length) return false;
  for (let index = 0; index < appliedBytes.length; index += 1) {
    if (appliedBytes[index] !== expectedBytes[index]) return false;
  }
  return true;
}


function isIos() {
  const navigatorWithPlatform = window.navigator as NavigatorWithStandalone;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (navigatorWithPlatform.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function isStandalone() {
  const browserNavigator = window.navigator as NavigatorWithStandalone;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(browserNavigator.standalone);
}

function platformLabel() {
  if (isIos()) return isStandalone() ? "ios-pwa" : "ios-safari";
  const browserNavigator = window.navigator as NavigatorWithStandalone;
  return browserNavigator.userAgentData?.platform || browserNavigator.platform || "web";
}

async function registerOwnerServiceWorker() {
  const registration = await navigator.serviceWorker.register("/irha-owner-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  try {
    await registration.update();
  } catch {
    // A failed update check must not discard an already-active worker.
  }
  return navigator.serviceWorker.ready;
}

async function syncBackendSubscription(subscription: PushSubscription) {
  const { data, error } = await supabase.functions.invoke("notification-dispatcher", {
    body: {
      action: "subscribe",
      subscription: subscription.toJSON(),
      platform: platformLabel(),
    },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Subscription failed");
  }
}

async function readBackendSubscription(userId: string, endpoint: string) {
  const { data, error } = await (supabase as any)
    .from("owner_push_subscriptions")
    .select("enabled,last_success_at,last_error")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as BackendSubscription | null;
}


export default function AdminPushNotificationSetup() {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [backendSubscription, setBackendSubscription] = useState<BackendSubscription | null>(null);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const activationInFlight = useRef(false);
  const supported = useMemo(() =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window,
  []);

  const load = useCallback(async () => {
    if (!window.location.pathname.startsWith("/admin")) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    setChecked(false);
    try {
      const { data, error } = await supabase.functions.invoke("notification-dispatcher", {
        body: { action: "config" },
      });
      const nextConfig = !error && data?.ok ? data as NotificationConfig : null;
      setConfig(nextConfig);

      if (!supported) {
        setSubscription(null);
        setBackendSubscription(null);
        setServiceWorkerActive(false);
        return;
      }

      const ready = await registerOwnerServiceWorker();
      setServiceWorkerActive(Boolean(ready.active));

      let localSubscription = await ready.pushManager.getSubscription();

      // A previous release retired every service worker while healing stale Vite
      // caches. The backend can keep accepting an old Apple endpoint even though
      // this Home Screen app no longer has a local PushSubscription to receive it.
      // If the owner already granted notification permission, repair that broken
      // local state silently; never prompt for permission outside a user gesture.
      if (
        !localSubscription &&
        nextConfig?.vapid_public_key &&
        Notification.permission === "granted" &&
        (!isIos() || isStandalone())
      ) {
        try {
          localSubscription = await ready.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(nextConfig.vapid_public_key),
          });
          await syncBackendSubscription(localSubscription);
        } catch {
          // Some browsers may still require a direct gesture to create a new
          // subscription. Keep the visible reconnect control as the safe fallback.
        }
      }

      setSubscription(localSubscription);
      if (!localSubscription) {
        setBackendSubscription(null);
        return;
      }

      let storedSubscription = await readBackendSubscription(userId, localSubscription.endpoint);

      // Repair the inverse drift too: the browser can retain a valid local
      // subscription while the server-side row is missing or disabled.
      if (!storedSubscription?.enabled && Notification.permission === "granted") {
        try {
          await syncBackendSubscription(localSubscription);
          storedSubscription = await readBackendSubscription(userId, localSubscription.endpoint);
        } catch {
          // Surface NEEDS SETUP below rather than hiding a failed backend sync.
        }
      }

      setBackendSubscription(storedSubscription);
    } finally {
      setChecked(true);
    }
  }, [supported]);

  useEffect(() => {
    void load();
  }, [load]);

  const health = useMemo<HealthState>(() => {
    if (typeof window === "undefined") return "NEEDS SETUP";
    if (isIos() && !isStandalone()) return "INSTALL ADMIN TO HOME SCREEN";
    if (!supported) return "BLOCKED BY BROWSER";
    if (Notification.permission === "denied") return "BLOCKED BY BROWSER";
    if (
      !config?.push_supported ||
      !config.vapid_public_key ||
      Notification.permission !== "granted" ||
      !serviceWorkerActive ||
      !subscription ||
      !backendSubscription?.enabled
    ) {
      return "NEEDS SETUP";
    }
    return "ACTIVE";
  }, [backendSubscription, config, serviceWorkerActive, subscription, supported]);

  const enable = useCallback(async () => {
    if (activationInFlight.current) return;

    if (isIos() && !isStandalone()) {
      setInteractionMessage("Open the installed Irha Admin Home Screen app to enable background alerts.");
      toast({
        title: "Install Irha Admin on this iPhone",
        description: "Safari Share button → Add to Home Screen → open Irha Admin from the new Home Screen icon → enable alerts there.",
      });
      return;
    }
    if (!supported) {
      setInteractionMessage("This browser does not expose the Web Push APIs required for owner alerts.");
      toast({
        title: "Push alerts are unavailable",
        description: "This browser does not expose the Web Push APIs required for owner alerts.",
        variant: "destructive",
      });
      return;
    }
    if (!config?.vapid_public_key) {
      setInteractionMessage("Push configuration is unavailable. Rechecking the alert connection.");
      toast({
        title: "Push configuration unavailable",
        description: "The server push configuration could not be loaded. The alert connection is being checked again.",
        variant: "destructive",
      });
      await load();
      return;
    }
    if (Notification.permission === "denied") {
      setInteractionMessage("Notifications are blocked in iPhone settings for Irha Admin.");
      toast({
        title: "Notifications are blocked",
        description: "Allow notifications for the installed Irha Admin app in iPhone notification settings, then reopen Admin.",
        variant: "destructive",
      });
      return;
    }

    activationInFlight.current = true;
    setBusy(true);
    setInteractionMessage("Tap received. Connecting this iPhone to owner alerts…");
    try {
      let permission = Notification.permission;
      if (permission !== "granted") {
        setInteractionMessage("Requesting iPhone notification permission…");
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        throw new Error(permission === "denied"
          ? "Notifications were blocked by iPhone settings."
          : "Notification permission was not granted.");
      }

      setInteractionMessage("Notification permission granted. Preparing the owner service worker…");
      const ready = await registerOwnerServiceWorker();
      setServiceWorkerActive(Boolean(ready.active));

      setInteractionMessage("Service worker ready. Checking the existing push subscription…");
      const existing = await ready.pushManager.getSubscription();
      let next: PushSubscription | null = null;

      if (existing) {
        const keyMatches = sameApplicationServerKey(existing, config.vapid_public_key);
        if (keyMatches) {
          setInteractionMessage("Existing subscription found. Re-syncing it with the server…");
          try {
            await syncBackendSubscription(existing);
            next = existing;
          } catch (syncError) {
            const reason = syncError instanceof Error ? syncError.message : "server rejected it";
            setInteractionMessage(`Existing subscription could not be re-synced (${reason}). Replacing it…`);
          }
        } else {
          setInteractionMessage("Existing subscription uses an old push key. Replacing it…");
        }

        if (!next) {
          try {
            await existing.unsubscribe();
          } catch {
            // An unsubscribe failure must not block creating a fresh subscription.
          }
        }
      }

      if (!next) {
        setInteractionMessage("Creating a fresh Apple push subscription…");
        next = await ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(config.vapid_public_key),
        });
        setInteractionMessage("Fresh subscription created. Saving this device…");
        await syncBackendSubscription(next);
      }

      setInteractionMessage("Device saved. Verifying the exact iPhone subscription…");
      await load();
      setInteractionMessage("Owner alerts are connected on this iPhone.");
      toast({
        title: "Owner alerts are active",
        description: "This device is connected for visitor, inquiry and live-chat background alerts.",
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Reconnect alerts from the installed Irha Admin app.";
      setInteractionMessage(message);
      toast({
        title: "Push alerts could not be enabled",
        description: message,
        variant: "destructive",
      });
    } finally {
      activationInFlight.current = false;
      setBusy(false);
    }
  }, [config, load, supported]);

  if (!checked) return null;

  const anotherDeviceConnected = (config?.active_subscriptions ?? 0) > 0 && health !== "ACTIVE";
  const active = health === "ACTIVE";
  const blocked = health === "BLOCKED BY BROWSER";
  const installRequired = health === "INSTALL ADMIN TO HOME SCREEN";
  const description = active
    ? "Service worker, notification permission and this exact device subscription are connected."
    : installRequired
      ? "Background alerts are not active on this iPhone. Add Irha Admin to Home Screen, open it there, then enable alerts."
      : blocked
        ? "This browser cannot currently receive background alerts. Admin realtime visitor alerts still work while Admin is open."
        : config
          ? "This device is not fully connected for background alerts. Reconnect it below."
          : "This device's background-alert connection could not be verified. Check again or reconnect alerts.";

  return (
    <aside className={`pointer-events-auto fixed inset-x-3 z-[110] mx-auto w-auto max-w-sm rounded-2xl border p-3 text-white shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-5 md:w-[22rem] ${active ? "bottom-[calc(9.25rem+env(safe-area-inset-bottom))] border-emerald-400/25 bg-[#07111f]/94 md:bottom-5" : "bottom-[calc(9.25rem+env(safe-area-inset-bottom))] border-gold/35 bg-[#0a0d12]/97 md:bottom-5"}`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-emerald-400/12 text-emerald-300" : "bg-gold/12 text-gold"}`}>
          {active ? <CheckCircle2 size={18} /> : installRequired ? <Smartphone size={18} /> : blocked ? <TriangleAlert size={18} /> : <BellRing size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">Alerts on this device</p>
          <p className={`mt-0.5 text-sm font-semibold ${active ? "text-emerald-300" : "text-gold"}`}>{health}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">{description}</p>
          {anotherDeviceConnected && (
            <p className="mt-2 text-[10px] leading-relaxed text-emerald-300">Another owner device is connected; this device still needs setup.</p>
          )}
          {interactionMessage && (
            <p className="mt-2 text-[10px] leading-relaxed text-white/70" role="status" aria-live="polite">
              {interactionMessage}
            </p>
          )}
        </div>
      </div>

      {!active && (
        <button
          type="button"
          data-owner-alert-setup-action="true"
          onTouchEnd={(event) => {
            event.preventDefault();
            void (config ? enable() : load());
          }}
          onClick={() => void (config ? enable() : load())}
          disabled={busy || (blocked && supported && Notification.permission === "denied")}
          className="pointer-events-auto relative z-[1] mt-3 min-h-11 w-full touch-manipulation select-none rounded-xl bg-gold px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#07111f] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ WebkitTapHighlightColor: "rgba(213, 173, 77, 0.22)" }}
        >
          {busy
            ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Connecting</span>
            : installRequired
              ? "Show iPhone install steps"
              : blocked && supported && Notification.permission === "denied"
                ? "Browser settings required"
                : config
                  ? subscription ? "Reconnect alerts" : "Enable alerts"
                  : "Check alert connection"}
        </button>
      )}
    </aside>
  );
}
