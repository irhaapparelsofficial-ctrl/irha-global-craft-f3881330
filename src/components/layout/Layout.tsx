import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import OccasionBanner from "@/components/OccasionBanner";
import GermanLanguageSuggestion from "@/components/GermanLanguageSuggestion";
import StickyMobileCTA from "@/components/sections/StickyMobileCTA";
import ViewportDeferred from "@/components/performance/ViewportDeferred";
import TaxonomyIndexingGuard from "@/components/TaxonomyIndexingGuard";
import { getRouteLocale, SHARED_UI_COPY } from "@/lib/i18nFoundation";

const loadGuide = () => import("@/components/LiveChat");
const loadHumanLiveChat = () => import("@/components/HumanLiveChat");
const Footer = lazy(() => import("./Footer"));
const LiveChat = lazy(loadGuide);
const HumanLiveChat = lazy(loadHumanLiveChat);
const InternalLinksBlock = lazy(() => import("@/components/content/InternalLinksBlock"));

const OPEN_GUIDE_EVENT = "irha:open-irha-guide";
const OPEN_HUMAN_CHAT_EVENT = "irha:open-human-chat";

function DeferredSupportRuntime() {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const guideModuleReadyRef = useRef(false);
  const humanModuleReadyRef = useRef(false);
  const replayingRef = useRef(false);

  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => {
    const activate = () => setReady(true);
    const replay = (eventName: string) => {
      for (const delay of [50, 220]) window.setTimeout(() => {
        replayingRef.current = true;
        window.dispatchEvent(new CustomEvent(eventName));
        replayingRef.current = false;
      }, delay);
    };
    const openGuide = () => {
      if (replayingRef.current || (readyRef.current && guideModuleReadyRef.current)) return;
      void loadGuide().then(() => { guideModuleReadyRef.current = true; setReady(true); replay(OPEN_GUIDE_EVENT); }).catch(() => setReady(true));
    };
    const openHumanChat = () => {
      if (replayingRef.current || (readyRef.current && humanModuleReadyRef.current)) return;
      void loadHumanLiveChat().then(() => { humanModuleReadyRef.current = true; setReady(true); replay(OPEN_HUMAN_CHAT_EVENT); }).catch(() => setReady(true));
    };
    window.addEventListener(OPEN_GUIDE_EVENT, openGuide);
    window.addEventListener(OPEN_HUMAN_CHAT_EVENT, openHumanChat);
    window.addEventListener("pointerdown", activate, { passive: true, once: true });
    window.addEventListener("keydown", activate, { once: true });
    const fallback = window.setTimeout(activate, 8_000);
    return () => {
      window.removeEventListener(OPEN_GUIDE_EVENT, openGuide);
      window.removeEventListener(OPEN_HUMAN_CHAT_EVENT, openHumanChat);
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
      window.clearTimeout(fallback);
    };
  }, []);

  if (!ready) return null;
  return <Suspense fallback={null}><LiveChat /><HumanLiveChat /></Suspense>;
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
  const { pathname } = useLocation();
  const locale = getRouteLocale(pathname);
  const copy = SHARED_UI_COPY[locale];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-background focus:text-gold focus:border focus:border-gold focus:px-4 focus:py-3 focus:text-xs focus:uppercase focus:tracking-[0.18em]">
        {copy.skipToContent}
      </a>
      {locale === "en" && <OccasionBanner />}
      <Navbar />
      <GermanLanguageSuggestion />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 outline-none">
        {children}
      </main>
      <TaxonomyIndexingGuard />
      <DeferredFooterChrome />
      <StickyMobileCTA />
      <DeferredSupportRuntime />
    </div>
  );
}
