const BASE = process.env.IRHA_BASE_URL || "https://www.irhaapparels.com";
const EXPECTED_RELEASE = "frontend-live-2026-07-12-r9";
const EXPECTED_RELEASE_TEXT = "IRHA_FRONTEND_LIVE_2026_07_12_R9";

const forbidden = [
  "Since 2014",
  "MOQ 50",
  "45-day delivery",
  "45-Day Production",
  "reply within 12 hours",
  "respond within 4 working hours",
  "within 24 h",
];

const agents = [
  ["browser", "Mozilla/5.0 Chrome/126 Safari/537.36"],
  ["googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1)"],
  ["bingbot", "Mozilla/5.0 (compatible; bingbot/2.0)"],
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchResponse(path, userAgent = agents[0][1]) {
  const url = new URL(path, BASE);
  url.searchParams.set("__irha_smoke", Date.now().toString());
  let last = "unknown error";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": userAgent,
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
        signal: AbortSignal.timeout(25_000),
      });
      if (response.ok) return response;
      last = `HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await wait(attempt * 750);
  }

  throw new Error(`${url} failed after retries: ${last}`);
}

async function fetchText(path, userAgent = agents[0][1]) {
  const response = await fetchResponse(path, userAgent);
  return { text: await response.text(), url: response.url, status: response.status };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const build = JSON.parse((await fetchText("/build.json")).text);
  assert(build.release === EXPECTED_RELEASE, `live build release mismatch: ${build.release}`);

  const release = (await fetchText("/release.txt")).text;
  assert(release.includes(EXPECTED_RELEASE_TEXT), "live release text mismatch");

  for (const [name, userAgent] of agents) {
    const home = await fetchText("/", userAgent);
    assert(home.status === 200, `${name} homepage did not return HTTP 200`);
    assert(home.text.includes('id="root"'), `${name} homepage is missing the application root`);
    assert(home.text.includes(EXPECTED_RELEASE), `${name} homepage is missing release r9`);
    for (const term of forbidden) {
      assert(
        !home.text.toLowerCase().includes(term.toLowerCase()),
        `${name} contains legacy claim: ${term}`,
      );
    }
  }

  const essentialRoutes = [
    "/products",
    "/products/bavarian-trachten-wear",
    "/products/bavarian-trachten-wear/mens-trachten/short-lederhosen",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-dresses",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-blouses",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-aprons",
    "/products/bavarian-trachten-wear/traditional-dirndl-dress",
    "/products/bavarian-trachten-wear/dirndl-blouse",
    "/products/bavarian-trachten-wear/dirndl-apron",
    "/catalogue",
    "/buyer-trust",
    "/factory-video-call",
    "/resources",
    "/faq",
    "/inquiry",
    "/repeat-order",
    "/contact",
    "/admin",
  ];

  for (const routePath of essentialRoutes) {
    const page = await fetchText(routePath);
    assert(page.status === 200, `${routePath} did not return HTTP 200`);
    assert(page.text.includes('id="root"'), `${routePath} did not return the Lovable application shell`);
  }

  const sitemap = (await fetchText("/sitemap.xml")).text;
  for (const routePath of ["/de", "/sustainability", "/shipping-returns", "/blog", "/journal", "/seo-indexing"]) {
    assert(!sitemap.includes(`<loc>${BASE}${routePath}</loc>`), `sitemap contains quarantined route ${routePath}`);
  }
  for (const routePath of [
    "/products",
    "/products/bavarian-trachten-wear",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-dresses",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-blouses",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-aprons",
    "/buyer-trust",
    "/factory-video-call",
    "/resources",
    "/faq",
    "/inquiry",
    "/repeat-order",
  ]) {
    assert(sitemap.includes(`<loc>${BASE}${routePath}</loc>`), `sitemap is missing live route ${routePath}`);
  }

  const robots = (await fetchText("/robots.txt")).text;
  assert(robots.includes(`Sitemap: ${BASE}/sitemap.xml`), "robots.txt sitemap declaration missing");
  assert(robots.includes("Disallow: /admin"), "robots.txt must block admin crawling");
  assert(robots.includes("Disallow: /auth"), "robots.txt must block auth crawling");

  const productImage = await fetchResponse(
    "/product-media/traditional-lederhosen/01-hero-front.webp",
  );
  assert(
    productImage.headers.get("content-type")?.startsWith("image/") === true,
    "verified Lederhosen hero did not return an image content type",
  );

  console.log(`PASS production smoke for ${BASE} (${EXPECTED_RELEASE})`);
}

main().catch((error) => {
  console.error("FAIL production smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
