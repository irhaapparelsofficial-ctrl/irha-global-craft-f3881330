import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingActions from "./FloatingActions";
import LiveChat from "@/components/LiveChat";
import StickyMobileCTA from "@/components/sections/StickyMobileCTA";
import OccasionBanner from "@/components/OccasionBanner";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <OccasionBanner />
      <Navbar />
      <main className="flex-1 pb-14 md:pb-0">{children}</main>
      <Footer />
      <FloatingActions />
      <LiveChat />
      <StickyMobileCTA />
    </div>
  );
}
