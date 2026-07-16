import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Loader2, Smartphone } from "lucide-react";
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

export default function AdminPushNotificationSetup() {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const supported = useMemo(() =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window,
  []);

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
      setDismissed(true);
      toast({
        title: "Owner push alerts enabled",
        description: "Quote requests and human live-chat messages can now alert this device in the background.",
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
  }, [config, supported]);

  const test = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("notification-dispatcher", {
        body: { action: "test_push" },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Test failed");
      toast({ title: "Test alert sent", description: "A system notification should appear on this device." });
    } catch (error) {
      toast({
        title: "Test alert failed",
        description: error instanceof Error ? error.message : "Open notification settings and try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  if (!config || dismissed) return null;
  if (subscription && Notification.permission === "granted") {
    return (
      <aside className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[68] rounded-xl border border-emerald-400/35 bg-black/95 p-3 shadow-2xl md:bottom-5 md:right-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <CheckCircle2 size={16} /> Background owner alerts active
        </div>
        <button type="button" onClick={test} disabled={busy} className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold disabled:opacity-50">
          {busy ? "Sending…" : "Send test alert"}
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[68] w-[min(23rem,calc(100vw-1.5rem))] rounded-xl border border-gold/45 bg-black/95 p-4 text-white shadow-2xl md:bottom-5 md:right-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          {isIos() && !isStandalone() ? <Smartphone size={19} /> : <BellRing size={19} />}
        </span>
        <div>
          <p className="text-sm font-semibold">Enable real owner alerts</p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            {isIos() && !isStandalone()
              ? "Install Irha Admin from Safari to receive quote and live-chat alerts when the browser is closed."
              : "Receive quote and human live-chat notifications even when the admin tab is not open."}
          </p>
        </div>
      </div>
      <button type="button" onClick={enable} disabled={busy || !supported || !config.push_supported} className="mt-3 min-h-11 w-full rounded-lg bg-gold px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-background disabled:opacity-50">
        {busy ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Connecting</span> : isIos() && !isStandalone() ? "Show iPhone install steps" : "Enable background alerts"}
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="mt-2 w-full text-[10px] text-white/45">Not now</button>
    </aside>
  );
}
