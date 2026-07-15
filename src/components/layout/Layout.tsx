import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import Navbar from "./Navbar";
import OccasionBanner from "@/components/OccasionBanner";

const Footer = lazy(() => import("./Footer"));
const FloatingActions = lazy(() => import("./FloatingActions"));
const HumanLiveChat = lazy(() => import("@/components/HumanLiveChat"));
const StickyMobileCTA = lazy(() => import("@/components/sections/StickyMobileCTA"));
const InternalLinksBlock = lazy(() => import("@/components/content/InternalLinksBlock"));

function DeferredPageChrome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <Suspense fallback={null}>
        <InternalLinksBlock />
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <FloatingActions />
        <HumanLiveChat />
        <StickyMobileCTA />
      </Suspense>
    </>
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
      <DeferredPageChrome />
    </div>
  );
}
