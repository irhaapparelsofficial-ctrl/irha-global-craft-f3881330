const BASE = process.env.IRHA_BASE_URL || "https://www.irhaapparels.com";
const FUNCTIONS_BASE = process.env.IRHA_FUNCTIONS_URL || "https://mlefxgyaqoisvdmoiapq.supabase.co/functions/v1";
const RELEASE = "frontend-qa-2026-07-12-r8";
const RELEASE_TXT = "IRHA_FRONTEND_QA_2026_07_12_R8";
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

async function fetchText(path, userAgent = agents[0][1]) {
  const url = new URL(path, BASE);
  url.searchParams.set("__irha_smoke", Date.now().toString());
  let last = "unknown error";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": userAgent, "cache-control": "no-cache", pragma: "no-cache" },
        signal: AbortSignal.timeout(25000),
      });
      const text = await response.text();
      if (response.ok) return { text, url: response.url, status: response.status };
      last = `HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await wait(attempt * 750);
  }

  throw new Error(`${url} failed after retries: ${last}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function postGateway(payload) {
  const response = await fetch(`${FUNCTIONS_BASE}/public-lead-gateway`, {
    method: "POST",
    redirect: "follow",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      "cache-control": "no-cache",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });
  return { response, text: await response.text() };
}

async function verifyLeadGateway() {
  const invalidAction = await postGateway({ action: "production_smoke_invalid_action", payload: {} });
  assert(invalidAction.response.status === 400, `public-lead-gateway expected HTTP 400, received ${invalidAction.response.status}: ${invalidAction.text.slice(0, 300)}`);
  assert(invalidAction.text.toLowerCase().includes("unsupported action"), "public-lead-gateway response did not prove the expected function version");

  const invalidUpload = await postGateway({
    action: "create_upload",
    payload: {
      filename: "production-smoke.exe",
      mime: "application/octet-stream",
      size: 128,
      purpose: "inquiry",
      form_started_at: Date.now() - 2000,
      website: "",
    },
  });
  assert(invalidUpload.response.status === 400, `invalid upload metadata expected HTTP 400, received ${invalidUpload.response.status}: ${invalidUpload.text.slice(0, 300)}`);
  assert(invalidUpload.text.toLowerCase().includes("only pdf"), "invalid upload metadata was not rejected by the expected file policy");
}

async function main() {
  const release = await fetchText("/release.txt");
  assert(release.text.includes(RELEASE_TXT), "release marker mismatch");

  const build = JSON.parse((await fetchText("/build.json")).text);
  assert(build.release === RELEASE, "build release mismatch");

  for (const [name, ua] of agents) {
    const home = await fetchText("/", ua);
    assert(home.text.includes(RELEASE), `${name} missing release marker`);
    for (const term of forbidden) {
      assert(!home.text.toLowerCase().includes(term.toLowerCase()), `${name} contains legacy claim: ${term}`);
    }
  }

  const sitemap = (await fetchText("/sitemap.xml")).text;
  for (const path of ["/de", "/sustainability", "/shipping-returns", "/blog", "/journal", "/seo-indexing"]) {
    assert(!sitemap.includes(`<loc>${BASE}${path}</loc>`), `sitemap contains quarantined route ${path}`);
  }
  for (const path of ["/buyer-trust", "/factory-video-call", "/resources", "/faq", "/inquiry", "/repeat-order"]) {
    assert(sitemap.includes(`<loc>${BASE}${path}</loc>`), `sitemap is missing live buyer route ${path}`);
  }

  const robots = (await fetchText("/robots.txt")).text;
  assert(robots.includes(`Sitemap: ${BASE}/sitemap.xml`), "robots.txt sitemap declaration missing");
  assert(robots.includes("Disallow: /admin"), "robots.txt must block admin crawling");
  assert(robots.includes("Disallow: /auth"), "robots.txt must block auth crawling");

  for (const path of [
    "/products",
    "/catalogue",
    "/buyer-trust",
    "/factory-video-call",
    "/resources",
    "/faq",
    "/inquiry",
    "/repeat-order",
    "/contact",
    "/admin",
  ]) {
    await fetchText(path);
  }

  await verifyLeadGateway();
  console.log(`PASS production smoke for ${BASE}`);
}

main().catch((error) => {
  console.error("FAIL production smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
