import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Navbar from "./Navbar";
import OccasionBanner from "@/components/OccasionBanner";
import StickyMobileCTA from "@/components/sections/StickyMobileCTA";
import ViewportDeferred from "@/components/performance/ViewportDeferred";

const Footer = lazy(() => import("./Footer"));
const FloatingActions = lazy(() => import("./FloatingActions"));
const HumanLiveChat = lazy(() => import("@/components/HumanLiveChat"));
const InternalLinksBlock = lazy(() => import("@/components/content/InternalLinksBlock"));

const OPEN_HUMAN_CHAT_EVENT = "irha:open-human-chat";

function DeferredSupportRuntime() {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const pendingOpenRef = useRef(false);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    const activate = () => setReady(true);
    const openChat = () => {
      if (readyRef.current) return;
      pendingOpenRef.current = true;
      setReady(true);
    };

    window.addEventListener(OPEN_HUMAN_CHAT_EVENT, openChat);
    window.addEventListener("pointerdown", activate, { passive: true, once: true });
    window.addEventListener("keydown", activate, { once: true });
    const fallback = window.setTimeout(activate, 8_000);

    return () => {
      window.removeEventListener(OPEN_HUMAN_CHAT_EVENT, openChat);
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!ready || !pendingOpenRef.current) return;
    pendingOpenRef.current = false;
    const replay = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(OPEN_HUMAN_CHAT_EVENT));
    }, 0);
    return () => window.clearTimeout(replay);
  }, [ready]);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <FloatingActions />
      <HumanLiveChat />
    </Suspense>
  );
}

function DeferredFooterChrome() {
  return (
    <ViewportDeferred minHeight={520} rootMargin="600px 0px" fallbackDelayMs={30_000}>
      <Suspense fallback={<div aria-hidden className="min-h-[420px]" />}>
        <InternalLinksBlock />
        <Footer />
      </Suspense>
    </ViewportDeferred>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-background focus:text-gold focus:border focus:border-gold focus:px-4 focus:py-3 focus:text-xs focus:uppercase focus:tracking-[0.18em]"
      >
        Skip to main content
      </a>
      <OccasionBanner />
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0 outline-none"
      >
        {children}
      </main>
      <DeferredFooterChrome />
      <StickyMobileCTA />
      <DeferredSupportRuntime />
    </div>
  );
}
