import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const WATCH_PATH = "/factory-capability-video";

describe("GP-4V-R1 factory video user-acceptance repair", () => {
  it("keeps the homepage poster-first without embedding or preloading the full MP4", () => {
    const homeSection = read("src/components/sections/HomeManufacturingEditorial.tsx");
    expect(homeSection).toContain("FactoryCapabilityPosterLink");
    expect(homeSection).not.toContain("<video");
    expect(homeSection).not.toContain("factory/irha-apparels-factory-capability-2026.mp4");
    expect(homeSection).not.toContain("autoPlay");
  });

  it("preserves the crawler fallback canonical and marks it for deterministic SPA cleanup", () => {
    const sourceIndex = read("index.html");
    const buildNormalizer = read("scripts/fix-boot-shell-semantics.mjs");
    const seo = read("src/components/SEO.tsx");

    expect(sourceIndex).toContain('<link rel="canonical" href="https://irhaapparels.com/" />');
    expect(buildNormalizer).toContain('const sourceFallbackCanonical = \'<link rel="canonical" href="https://irhaapparels.com/" />\'');
    expect(buildNormalizer).toContain('const markedFallbackCanonical = \'<link data-irha-fallback-seo="true" rel="canonical" href="https://irhaapparels.com/" />\'');
    expect(buildNormalizer).toContain("Static homepage fallback canonical was not marked exactly once for SPA cleanup");
    expect(seo).toContain("document.querySelectorAll('[data-irha-fallback-seo=\"true\"]')");
    expect(seo).not.toContain("document.querySelectorAll('meta[data-irha-fallback-seo=\"true\"]')");
  });

  it("registers one clean dedicated watch route before the generic buyer-intent catchall", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('const FactoryCapabilityVideo = lazy(() => import("./pages/FactoryCapabilityVideo"))');
    expect(app).toContain(`<Route path="${WATCH_PATH}" element={<FactoryCapabilityVideo />} />`);
    expect(app.indexOf(`path="${WATCH_PATH}"`)).toBeLessThan(app.indexOf('path="/:buyerIntentSlug"'));
  });

  it("publishes an indexable canonical watch-page content contract", () => {
    const page = read("src/pages/FactoryCapabilityVideo.tsx");
    const routeContent = read("src/lib/routeContent.mjs");
    expect(page).toContain('title="Factory Capability Video | Irha Apparels"');
    expect(page).toContain(`path={WATCH_PATH}`);
    expect(page).toContain(`canonical={WATCH_PATH}`);
    expect(page).toContain('>Inside the <span className="text-gold italic">Irha Apparels Factory</span></h1>');
    expect(page).toContain('<FactoryCapabilityPlayer preload="metadata" />');
    expect(routeContent).toContain(`"${WATCH_PATH}": route({`);
    expect(routeContent).toContain(`route: "${WATCH_PATH}"`);
    expect(routeContent).toContain('h1: "Inside the Irha Apparels Factory"');
    expect(routeContent).toContain('indexable: true');
  });

  it("moves buyer-facing watch navigation off the old manufacturing hash", () => {
    const buyerFacingSources = [
      read("src/components/factory/FactoryCapabilityMedia.tsx"),
      read("src/components/sections/HomeManufacturingEditorial.tsx"),
      read("src/pages/BuyerTrust.tsx"),
      read("src/pages/FactoryVideoCall.tsx"),
      read("src/pages/Manufacturing.tsx"),
      read("src/pages/FactoryCapabilityVideo.tsx"),
    ].join("\n");
    expect(buyerFacingSources).not.toContain("/manufacturing#factory-video");
    expect(buyerFacingSources).toContain(WATCH_PATH);
  });

  it("keeps recorded proof and live factory-call intent distinct", () => {
    const watchPage = read("src/pages/FactoryCapabilityVideo.tsx");
    const factoryCall = read("src/pages/FactoryVideoCall.tsx");
    expect(watchPage).toContain("Recorded proof");
    expect(watchPage).toContain("Live verification");
    expect(watchPage).toContain('to="/factory-video-call"');
    expect(factoryCall).toContain("Recorded factory overview and live factory verification are separate");
    expect(factoryCall).toContain('to="/factory-capability-video"');
    expect(factoryCall).not.toContain("No prerecorded or concept factory media is presented here as proof while genuine media is pending");
  });

  it("keeps native media controls while adding explicit play, fullscreen and theater fallbacks", () => {
    const media = read("src/components/factory/FactoryCapabilityMedia.tsx");
    expect(media).toContain("controls");
    expect(media).toContain("playsInline");
    expect(media).toContain("preload={preload}");
    expect(media).toContain("poster={FACTORY_CAPABILITY_POSTER_URL}");
    expect(media).toContain("width={910}");
    expect(media).toContain("height={512}");
    expect(media).toContain("await video.play()");
    expect(media).toContain("requestFullscreen");
    expect(media).toContain("webkitEnterFullscreen");
    expect(media).toContain("waitForFullscreenActivation");
    expect(media).toContain("enterTheaterMode");
    expect(media).toContain('data-testid="factory-video-fullscreen"');
    expect(media).toContain('data-testid="factory-video-theater"');
    expect(media).toContain("Exit Theater");
    expect(media).not.toContain("autoPlay");
  });

  it("uses a stable public MP4 and poster contract", () => {
    const media = read("src/components/factory/FactoryCapabilityMedia.tsx");
    expect(media).toContain("storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-2026.mp4");
    expect(media).toContain("storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-poster.webp");
    expect(media).toContain('<source src={FACTORY_CAPABILITY_VIDEO_URL} type="video/mp4" />');
    expect(media).toContain('FACTORY_CAPABILITY_DURATION = "PT1M15S"');
    expect(media).toContain('FACTORY_CAPABILITY_PUBLICATION_DATE = "2026-08-11"');
  });

  it("adds truthful VideoObject data to the dedicated watch page", () => {
    const page = read("src/pages/FactoryCapabilityVideo.tsx");
    expect(page).toContain('"@type": "VideoObject"');
    expect(page).toContain("thumbnailUrl: [FACTORY_CAPABILITY_POSTER_URL]");
    expect(page).toContain("uploadDate: FACTORY_CAPABILITY_PUBLICATION_DATE");
    expect(page).toContain("duration: FACTORY_CAPABILITY_DURATION");
    expect(page).toContain("contentUrl: FACTORY_CAPABILITY_VIDEO_URL");
    expect(page).not.toContain("embedUrl:");
  });

  it("includes the watch page and video metadata in the regular XML sitemap", () => {
    const sitemap = read("scripts/generate-sitemap.ts");
    expect(sitemap).toContain(`path: "${WATCH_PATH}"`);
    expect(sitemap).toContain('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"');
    expect(sitemap).toContain("<video:thumbnail_loc>");
    expect(sitemap).toContain("<video:content_loc>");
    expect(sitemap).toContain("<video:duration>");
  });

  it("runs live browser acceptance against the exact Pages production artifact while preserving apex canonicals", () => {
    const workflow = read(".github/workflows/gp4v-r1-video-acceptance.yml");
    const acceptance = read("scripts/ci/gp4v-r1-browser-acceptance.mjs");

    expect(workflow).toContain("BROWSER_ORIGIN: https://irha-apparels.pages.dev");
    expect(workflow).toContain("CANONICAL_ORIGIN: https://irhaapparels.com");
    expect(workflow).toContain("EXPECTED_SHA: ${{ github.event.workflow_run.head_sha }}");
    expect(workflow).not.toContain("TARGET_ORIGIN: https://irhaapparels.com");

    expect(acceptance).toContain('const BROWSER_ORIGIN = (process.env.BROWSER_ORIGIN || "https://irha-apparels.pages.dev")');
    expect(acceptance).toContain('const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || "https://irhaapparels.com")');
    expect(acceptance).toContain("verifyExactProductionArtifact");
    expect(acceptance).toContain("/build.json?gp4v_r1_acceptance=");
    expect(acceptance).toContain("build?.source_commit === EXPECTED_SHA");
    expect(acceptance).toContain("build?.source_identity_state === \"verified\"");
    expect(acceptance).toContain("build?.build_fingerprint");
    expect(acceptance).toContain("assertSingleCanonical");
    expect(acceptance).toContain("nodes.length === 1");
    expect(acceptance).toContain("`${CANONICAL_ORIGIN}${WATCH_PATH}`");
    expect(acceptance).toContain("`${CANONICAL_ORIGIN}${CALL_PATH}`");
  });

  it("enters deep SPA routes through buyer navigation and checks representative canonical ownership", () => {
    const acceptance = read("scripts/ci/gp4v-r1-browser-acceptance.mjs");
    expect(acceptance).toContain("enterWatchPageFromHomepage");
    expect(acceptance).toContain('page.goto(`${BROWSER_ORIGIN}/`');
    expect(acceptance).toContain("const watchLink = await findBuyerLink(page, WATCH_PATH, label)");
    expect(acceptance).toContain("watchLink.click()");
    expect(acceptance).toContain("const callLink = await findBuyerLink(page, CALL_PATH, label)");
    expect(acceptance).toContain("callLink.click()");
    expect(acceptance).toContain('const MANUFACTURING_PATH = "/manufacturing"');
    expect(acceptance).toContain('const BUYER_TRUST_PATH = "/buyer-trust"');
    expect(acceptance).toContain('const CATEGORY_PATH = "/products/sportswear"');
    expect(acceptance).toContain("representativeCanonicals");
    expect(acceptance).toContain("navigateSpaRoute(page, MANUFACTURING_PATH, label)");
    expect(acceptance).toContain("navigateSpaRoute(page, BUYER_TRUST_PATH, label)");
    expect(acceptance).toContain("navigateSpaRoute(page, CATEGORY_PATH, label)");
    expect(acceptance).toContain('navigationMode: "homepage-client-route"');
    expect(acceptance).toContain("webkitExitFullscreen");
    expect(acceptance).not.toContain('page.goto(`${BROWSER_ORIGIN}${WATCH_PATH}`');
    expect(acceptance).not.toContain('page.goto(`${BROWSER_ORIGIN}${CALL_PATH}`');
  });

  it("preserves the manufacturing authority route and canonical product route patterns", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('<Route path="/manufacturing" element={<Manufacturing />} />');
    expect(app).toContain('<Route path="/products/:categorySlug/:audienceSlug/:collectionSlug/:productSlug" element={<CanonicalProductRoute />} />');
    expect(app).toContain('<Route path="/products/:categorySlug/:audienceSlug/:collectionSlug" element={<CategoryTaxonomyPage />} />');
    expect(app).toContain('<Route path="/products/:categorySlug/:productSlug" element={<CategoryOrProductPage />} />');
  });
});
