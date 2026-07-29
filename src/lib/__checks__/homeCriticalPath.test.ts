import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync("src/pages/Home.tsx", "utf8");
const categorySource = readFileSync("src/components/sections/HomeCategoryUniverse.tsx", "utf8");
const resolverSource = readFileSync("src/hooks/useCanonicalCategoryMedia.ts", "utf8");
const layoutSource = readFileSync("src/components/layout/Layout.tsx", "utf8");
const deferredSource = readFileSync("src/components/performance/ViewportDeferred.tsx", "utf8");
const settingsSource = readFileSync("src/hooks/useSiteSettings.ts", "utf8");
const mobileCtaSource = readFileSync("src/components/sections/StickyMobileCTA.tsx", "utf8");

describe("homepage critical-path performance contract", () => {
  it("keeps the hero and capability proof synchronous while viewport-gating below-fold sections", () => {
    expect(homeSource).toContain('import HeroCarousel from "@/components/HeroCarousel"');
    expect(homeSource).toContain('import CapabilityStrip from "@/components/sections/CapabilityStrip"');
    expect(homeSource).toContain('import ViewportDeferred from "@/components/performance/ViewportDeferred"');
    expect(homeSource).toContain('const HomeCategoryUniverse = lazy(() => import("@/components/sections/HomeCategoryUniverse"))');
    expect(homeSource).toContain('const HomeManufacturingEditorial = lazy(() => import("@/components/sections/HomeManufacturingEditorial"))');
    expect(homeSource).toContain('const ProcessTimeline = lazy(() => import("@/components/sections/ProcessTimeline"))');
    expect(homeSource).toContain('const BuyerDecisionSection = lazy(() => import("@/components/sections/BuyerDecisionSection"))');
    expect(homeSource).toContain('const StartProgramCTA = lazy(() => import("@/components/sections/StartProgramCTA"))');
    expect(homeSource.match(/<ViewportDeferred/g)?.length).toBeGreaterThanOrEqual(5);
    expect(homeSource).toContain("[content-visibility:auto]");
    expect(deferredSource).toContain("IntersectionObserver");
    expect(deferredSource).toContain('rootMargin = "200px 0px"');
  });

  it("does not request the full Supabase catalogue tree on the homepage", () => {
    expect(categorySource).not.toContain("usePublicCatalogTree");
    expect(categorySource).not.toContain("usePublicCatalog");
    expect(categorySource).toContain("Made-to-order program");
    expect(categorySource).toContain("MAIN_CATEGORY_SLUGS.map");
    expect(categorySource).toContain("useCanonicalCategoryMedia");
    expect(resolverSource).toContain("useHomepageMedia");
  });

  it("gates footer and both support channels by interaction or a bounded fallback", () => {
    expect(layoutSource).toContain('const Footer = lazy(() => import("./Footer"))');
    expect(layoutSource).toContain('const loadGuide = () => import("@/components/LiveChat")');
    expect(layoutSource).toContain('const loadHumanLiveChat = () => import("@/components/HumanLiveChat")');
    expect(layoutSource).toContain('const InternalLinksBlock = lazy(() => import("@/components/content/InternalLinksBlock")');
    expect(layoutSource).toContain('<ViewportDeferred minHeight={520} rootMargin="600px 0px" fallbackDelayMs={30_000}>');
    expect(layoutSource).toContain('window.addEventListener("pointerdown", activate');
    expect(layoutSource).toContain("window.setTimeout(activate, 8_000)");
    expect(layoutSource).toContain("guideModuleReadyRef");
    expect(layoutSource).toContain("humanModuleReadyRef");
    expect(layoutSource).toContain("replayingRef");
    expect(layoutSource).toContain("<StickyMobileCTA />");
  });

  it("keeps mobile quote and support actions immediate without CMS or Supabase reads", () => {
    expect(mobileCtaSource).not.toContain("useSiteSettings");
    expect(mobileCtaSource).toContain('"/inquiry?intent=rfq"');
    expect(mobileCtaSource).toContain("irha:open-irha-guide");
    expect(mobileCtaSource).toContain("AI guide + human team");
  });

  it("dynamically imports the CMS client and delays public settings fetches", () => {
    expect(settingsSource).not.toContain('import { supabase } from "@/integrations/supabase/client"');
    expect(settingsSource).toContain('await import("@/integrations/supabase/client")');
    expect(settingsSource).toContain('window.location.pathname.startsWith("/admin") ? 0 : 8_000');
    expect(settingsSource).toContain("enabled,");
  });
});
