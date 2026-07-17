import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Loader2, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type NotificationConfig = {
  ok: boolean;
  vapid_public_key: string | null;
  push_supported: boolean;
  active_subscriptions: number;
  email_provider_configured: boolean;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
  userAgentData?: { platform?: string };
};

const DISMISSED_KEY = "irha:push-setup-dismissed";

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
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

function wasDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AdminPushNotificationSetup() {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const supported = useMemo(() =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window,
  []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Session-only preference is optional.
    }
  }, []);

  const load = useCallback(async () => {
    if (!window.location.pathname.startsWith("/admin")) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const { data, error } = await supabase.functions.invoke("notification-dispatcher", {
      body: { action: "config" },
    });
    if (error || !data?.ok) return;
    setConfig(data as NotificationConfig);

    if (supported) {
      const registration = await navigator.serviceWorker.register("/irha-owner-sw.js", { scope: "/" });
      setSubscription(await registration.pushManager.getSubscription());
    }
  }, [supported]);

  useEffect(() => {
    void load();
  }, [load]);

  const enable = useCallback(async () => {
    if (!supported || !config?.vapid_public_key) return;
    if (isIos() && !isStandalone()) {
      toast({
        title: "Add Irha Admin to Home Screen",
        description: "On iPhone: Safari Share button → Add to Home Screen → open Irha Admin there, then enable alerts.",
      });
      return;
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");

      const registration = await navigator.serviceWorker.register("/irha-owner-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const next = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(config.vapid_public_key),
      });

      const { data, error } = await supabase.functions.invoke("notification-dispatcher", {
        body: {
          action: "subscribe",
          subscription: next.toJSON(),
          platform: platformLabel(),
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Subscription failed");
      setSubscription(next);
      dismiss();
      toast({
        title: "Owner alerts are active",
        description: "Visitor, inquiry and live-chat alerts will reach this device in the background.",
      });
    } catch (error) {
      toast({
        title: "Push alerts could not be enabled",
        description: error instanceof Error ? error.message : "Try again from the installed Irha Admin app.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [config, dismiss, supported]);

  if (!config || dismissed) return null;

  // Once the device is connected, do not keep a floating success card over the
  // owner workspace. The browser/OS notification permission is the durable state.
  if (subscription && Notification.permission === "granted") return null;

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[68] mx-auto w-auto max-w-sm rounded-2xl border border-gold/35 bg-[#0a0d12]/97 p-4 text-white shadow-2xl backdrop-blur-xl md:inset-x-auto md:bottom-5 md:right-5 md:w-[23rem]">
      <button type="button" onClick={dismiss} className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white" aria-label="Dismiss notification setup">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold">
          {isIos() && !isStandalone() ? <Smartphone size={19} /> : <BellRing size={19} />}
        </span>
        <div>
          <p className="text-sm font-semibold">Enable owner alerts on this device</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {isIos() && !isStandalone()
              ? "Install Irha Admin from Safari to receive alerts when the browser is closed."
              : "Receive new visitor, inquiry and live-chat alerts even when this screen is not open."}
          </p>
          {config.active_subscriptions > 0 && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">{config.active_subscriptions} other owner device{config.active_subscriptions === 1 ? "" : "s"} connected</p>
          )}
        </div>
      </div>
      <button type="button" onClick={enable} disabled={busy || !supported || !config.push_supported} className="mt-3 min-h-11 w-full rounded-xl bg-gold px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#07111f] disabled:opacity-50">
        {busy ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Connecting</span> : isIos() && !isStandalone() ? "Show iPhone install steps" : "Enable alerts"}
      </button>
    </aside>
  );
}
