import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync("src/pages/Home.tsx", "utf8");
const categorySource = readFileSync("src/components/sections/HomeCategoryUniverse.tsx", "utf8");
const layoutSource = readFileSync("src/components/layout/Layout.tsx", "utf8");

describe("homepage critical-path performance contract", () => {
  it("keeps the hero and capability proof synchronous while splitting below-fold sections", () => {
    expect(homeSource).toContain('import HeroCarousel from "@/components/HeroCarousel"');
    expect(homeSource).toContain('import CapabilityStrip from "@/components/sections/CapabilityStrip"');
    expect(homeSource).toContain('const HomeCategoryUniverse = lazy(() => import("@/components/sections/HomeCategoryUniverse"))');
    expect(homeSource).toContain('const HomeManufacturingEditorial = lazy(() => import("@/components/sections/HomeManufacturingEditorial"))');
    expect(homeSource).toContain('const ProcessTimeline = lazy(() => import("@/components/sections/ProcessTimeline"))');
    expect(homeSource).toContain('const BuyerDecisionSection = lazy(() => import("@/components/sections/BuyerDecisionSection"))');
    expect(homeSource).toContain('const StartProgramCTA = lazy(() => import("@/components/sections/StartProgramCTA"))');
    expect(homeSource).toContain("[content-visibility:auto]");
  });

  it("does not request the full Supabase catalogue tree on the homepage", () => {
    expect(categorySource).not.toContain("usePublicCatalogTree");
    expect(categorySource).not.toContain("usePublicCatalog");
    expect(categorySource).toContain("Made-to-order program");
    expect(categorySource).toContain("PROGRAMS.map");
  });

  it("defers noncritical footer and support chrome until after first paint", () => {
    expect(layoutSource).toContain('const Footer = lazy(() => import("./Footer"))');
    expect(layoutSource).toContain('const HumanLiveChat = lazy(() => import("@/components/HumanLiveChat"))');
    expect(layoutSource).toContain('const InternalLinksBlock = lazy(() => import("@/components/content/InternalLinksBlock"))');
    expect(layoutSource).toContain("window.setTimeout(() => setReady(true), 250)");
    expect(layoutSource).toContain("<DeferredPageChrome />");
  });
});
