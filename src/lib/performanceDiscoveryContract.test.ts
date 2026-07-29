import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/App.tsx", "utf8");
const mainSource = readFileSync("src/main.tsx", "utf8");
const adminRuntimeSource = readFileSync("src/components/admin/AdminRuntime.tsx", "utf8");
const heroSource = readFileSync("src/components/HeroCarousel.tsx", "utf8");
const indexSource = readFileSync("index.html", "utf8");
const packageSource = readFileSync("package.json", "utf8");
const cleanupSource = readFileSync("scripts/remove-home-lcp-preload-from-route-shells.mjs", "utf8");

describe("public performance and discovery contract", () => {
  it("keeps home, buyer-intent content and admin tools out of the initial public bundle", () => {
    expect(appSource).toContain('const Home = lazy(() => import("./pages/Home"))');
    expect(appSource).toContain('const AdminRuntime = lazy(() => import("@/components/admin/AdminRuntime"))');
    expect(appSource).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(appSource).not.toContain('import AdminOutreachCommandCenter from');
    expect(mainSource).not.toContain("AdminOutreachCommandCenter");
    expect(adminRuntimeSource).not.toContain("<AdminOutreachCommandCenter />");
    expect(appSource).not.toContain('import { SEO_BUYER_INTENT_LANDING_PAGES }');
    expect(appSource).toContain('<Route path="/de/:buyerIntentSlug" element={<BuyerIntentLandingPage />} />');
    expect(appSource).toContain('<Route path="/:buyerIntentSlug" element={<BuyerIntentLandingPage />} />');
  });

  it("assigns high priority to one LCP image and lazy-loads secondary hero and crest media", () => {
    expect(heroSource.match(/loading="eager"/g)).toHaveLength(1);
    expect(heroSource.match(/fetchPriority="high"/g)).toHaveLength(1);
    expect(heroSource.match(/loading="lazy"/g)).toHaveLength(2);
    expect(heroSource.match(/fetchPriority="low"/g)).toHaveLength(1);
    expect(heroSource).toContain("SECONDARY_PROGRAMS.map");
    expect(heroSource).toContain('data-card-brand="irha-official-crest"');
    expect(heroSource).toContain('slug: "streetwear-activewear"');
    expect(heroSource).toContain('slug: "leisure-nightwear"');
  });

  it("preloads the generated homepage LCP thumbnail without leaking it into route shells", () => {
    expect(indexSource).toContain("data-irha-home-lcp");
    expect(indexSource).toContain("/thumbnails/product-media/distressed-brown-short-lederhosen/01-hero-front.webp.webp");
    expect(indexSource).not.toContain('href="/thumbnails/product-media/distressed-brown-short-lederhosen/01-hero-front.webp"');
    expect(packageSource).toContain("remove-home-lcp-preload-from-route-shells.mjs");
    expect(cleanupSource).toContain("if (file === ROOT_INDEX) continue");
    expect(cleanupSource).toContain("HOME_LCP_PRELOAD");
  });

  it("gives Google direct static links to the Germany transaction pages", () => {
    expect(indexSource).toContain('/de/bekleidungshersteller-deutschland');
    expect(indexSource).toContain('/de/sportbekleidung-hersteller');
    expect(indexSource).toContain('/de/lederbekleidung-hersteller');
  });
});
