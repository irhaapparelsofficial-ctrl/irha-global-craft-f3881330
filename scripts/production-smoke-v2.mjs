import { readFile } from "node:fs/promises";

const BASE = (process.env.IRHA_BASE_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const EXPECTED_RELEASE = process.env.IRHA_EXPECTED_RELEASE || "frontend-live-2026-07-13-r11";
const EXPECTED_RELEASE_TEXT = process.env.IRHA_EXPECTED_RELEASE_TEXT || "IRHA_FRONTEND_LIVE_2026_07_13_R11";
const EXPECTED_PROJECT_ID = process.env.IRHA_EXPECTED_PROJECT_ID || "da72a40a-7df3-44c3-a72d-f180d9ffcd25";
const EXPECTED_SUPABASE_PROJECT_ID = process.env.IRHA_EXPECTED_SUPABASE_PROJECT_ID || "pvzjiozismyxqrzmtfbi";
const EXPECTED_REPOSITORY = process.env.IRHA_EXPECTED_REPOSITORY || "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";
const EXPECTED_ORIGIN = (process.env.IRHA_EXPECTED_ORIGIN || "https://www.irhaapparels.com").replace(/\/$/, "");

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
  url.searchParams.set("__irha_smoke", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  let last = "unknown error";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": userAgent,
          "cache-control": "no-cache, no-store, max-age=0",
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

function readPublicKey(envText) {
  const match = envText.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=["']?([^"'\n]+)["']?$/m);
  return match?.[1]?.trim() || "";
}

async function verifyTargetBackend() {
  const envText = await readFile(".env", "utf8");
  const publicKey = readPublicKey(envText);
  assert(publicKey, "frontend publishable Supabase key is missing");

  const backendBase = `https://${EXPECTED_SUPABASE_PROJECT_ID}.supabase.co`;
  const catalogueResponse = await fetch(
    `${backendBase}/rest/v1/categories?select=id&is_published=eq.true&limit=1`,
    {
      headers: {
        apikey: publicKey,
        Authorization: `Bearer ${publicKey}`,
        "cache-control": "no-store",
      },
      signal: AbortSignal.timeout(20_000),
    },
  );
  assert(catalogueResponse.ok, `owner Supabase catalogue REST failed: HTTP ${catalogueResponse.status}`);
  const categories = await catalogueResponse.json();
  assert(Array.isArray(categories) && categories.length > 0, "owner Supabase has no readable published categories");

  for (const functionName of ["public-lead-gateway", "chat"]) {
    const response = await fetch(`${backendBase}/functions/v1/${functionName}`, {
      method: "OPTIONS",
      headers: {
        Origin: EXPECTED_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,apikey",
      },
      signal: AbortSignal.timeout(20_000),
    });
    assert(response.status === 204 || response.ok, `${functionName} CORS/health probe failed: HTTP ${response.status}`);
  }

  const gatewayValidation = await fetch(`${backendBase}/functions/v1/public-lead-gateway`, {
    method: "POST",
    headers: {
      Origin: EXPECTED_ORIGIN,
      "Content-Type": "application/json",
      apikey: publicKey,
    },
    body: JSON.stringify({ action: "health_probe" }),
    signal: AbortSignal.timeout(20_000),
  });
  assert(gatewayValidation.status === 400, `public lead gateway validation contract changed: HTTP ${gatewayValidation.status}`);
}

async function main() {
  const build = JSON.parse((await fetchText("/build.json")).text);
  assert(build.release === EXPECTED_RELEASE, `live build release mismatch: ${build.release}`);
  assert(build.release_text === EXPECTED_RELEASE_TEXT, `live build release text mismatch: ${build.release_text}`);
  assert(build.lovable_project_id === EXPECTED_PROJECT_ID, `custom domain is attached to wrong Lovable project: ${build.lovable_project_id || "missing"}`);
  assert(build.supabase_project_id === EXPECTED_SUPABASE_PROJECT_ID, `production runtime is attached to wrong Supabase project: ${build.supabase_project_id || "missing"}`);
  assert(build.repository === EXPECTED_REPOSITORY, `production repository mismatch: ${build.repository || "missing"}`);
  assert(String(build.expected_origin || "").replace(/\/$/, "") === EXPECTED_ORIGIN, `production origin mismatch: ${build.expected_origin || "missing"}`);
  assert(build.source_branch === "main", `production source branch mismatch: ${build.source_branch || "missing"}`);
  assert(build.deployment_policy === "latest-main-only", `deployment policy mismatch: ${build.deployment_policy || "missing"}`);

  try {
    const release = (await fetchText("/release.txt")).text;
    const releaseOk =
      release.includes(EXPECTED_RELEASE_TEXT) &&
      release.includes(`Lovable Project: ${EXPECTED_PROJECT_ID}`) &&
      release.includes(`Repository: ${EXPECTED_REPOSITORY}`) &&
      release.includes(`Production Origin: ${EXPECTED_ORIGIN}`) &&
      release.includes(`Supabase Project: ${EXPECTED_SUPABASE_PROJECT_ID}`) &&
      release.includes("Deployment Policy: latest-main-only");
    if (!releaseOk) {
      console.warn("WARN release.txt is stale; build.json remains the authoritative deployment identity.");
    }
  } catch (error) {
    console.warn(`WARN release.txt unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const [name, userAgent] of agents) {
    const home = await fetchText("/", userAgent);
    assert(home.status === 200, `${name} homepage did not return HTTP 200`);
    assert(home.text.includes('id="root"'), `${name} homepage is missing the application root`);
    assert(/<title>[^<]*Irha Apparels/i.test(home.text), `${name} homepage title does not identify Irha Apparels`);
    for (const term of forbidden) {
      assert(!home.text.toLowerCase().includes(term.toLowerCase()), `${name} contains legacy claim: ${term}`);
    }
  }

  const essentialRoutes = [
    "/products",
    "/products/all",
    "/products/bavarian-trachten-wear",
    "/products/bavarian-trachten-wear/men",
    "/products/bavarian-trachten-wear/women/dirndl-dresses",
    "/products/bavarian-trachten-wear/kids/girls-dirndl",
    "/products/sportswear/team-club/football-kits",
    "/products/streetwear-activewear/unisex/hoodies-sweatshirts",
    "/products/leisure-nightwear/family-hospitality/robes-bathrobes",
    "/intl/de/products/bavarian-trachten-wear/men/short-lederhosen",
    "/intl/fr/products/bavarian-trachten-wear/women/dirndl-dresses",
    "/intl/es/products/sportswear/team-club/football-kits",
    "/products/bavarian-trachten-wear/mens-trachten/short-lederhosen",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-dresses",
    "/products/bavarian-trachten-wear/traditional-dirndl-dress",
    "/catalogue",
    "/buyer-trust",
    "/factory-video-call",
    "/resources",
    "/faq",
    "/inquiry",
    "/repeat-order",
    "/contact",
    "/auth",
    "/admin",
  ];

  for (const routePath of essentialRoutes) {
    const page = await fetchText(routePath);
    assert(page.status === 200, `${routePath} did not return HTTP 200`);
    assert(page.text.includes('id="root"'), `${routePath} did not return the Lovable application shell`);
  }

  const sitemap = (await fetchText("/sitemap.xml")).text;
  for (const routePath of ["/de", "/sustainability", "/shipping-returns", "/blog", "/journal", "/seo-indexing", "/products/all"]) {
    assert(!sitemap.includes(`<loc>${BASE}${routePath}</loc>`), `sitemap contains quarantined or duplicate route ${routePath}`);
  }
  for (const routePath of [
    "/products",
    "/products/bavarian-trachten-wear",
    "/products/bavarian-trachten-wear/men",
    "/products/bavarian-trachten-wear/women/dirndl-dresses",
    "/products/bavarian-trachten-wear/kids/girls-dirndl",
    "/products/sportswear/team-club/football-kits",
    "/products/streetwear-activewear/unisex/hoodies-sweatshirts",
    "/intl/de/products/bavarian-trachten-wear/men/short-lederhosen",
    "/intl/fr/products/bavarian-trachten-wear/women/dirndl-dresses",
    "/intl/es/products/sportswear/team-club/football-kits",
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

  const productImage = await fetchResponse("/product-media/traditional-lederhosen/01-hero-front.webp");
  assert(productImage.headers.get("content-type")?.startsWith("image/") === true, "verified Lederhosen hero did not return an image content type");

  await verifyTargetBackend();

  console.log(
    `PASS production smoke for ${BASE}: release=${EXPECTED_RELEASE} lovable=${EXPECTED_PROJECT_ID} supabase=${EXPECTED_SUPABASE_PROJECT_ID} repository=${EXPECTED_REPOSITORY}`,
  );
}

main().catch((error) => {
  console.error("FAIL production smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
