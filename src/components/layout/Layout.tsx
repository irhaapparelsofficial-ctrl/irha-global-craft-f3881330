import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingActions from "./FloatingActions";
import FloatingSocialRail from "./FloatingSocialRail";
import LiveChat from "@/components/LiveChat";
import StickyMobileCTA from "@/components/sections/StickyMobileCTA";
import OccasionBanner from "@/components/OccasionBanner";
import InternalLinksBlock from "@/components/content/InternalLinksBlock";

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
        className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 outline-none"
      >
        {children}
      </main>
      <InternalLinksBlock />
      <Footer />
      <FloatingActions />
      <FloatingSocialRail />
      <LiveChat />
      <StickyMobileCTA />
    </div>
  );
}
