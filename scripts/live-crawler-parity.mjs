const BASE = (process.env.IRHA_BASE_URL || "https://irhaapparels.com").replace(/\/$/, "");
const ALIAS = (process.env.IRHA_ALIAS_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function retryable(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function request(
  path,
  {
    base = BASE,
    redirect = "follow",
    userAgent = BROWSER_UA,
    attempts = 5,
    cacheBust = true,
  } = {},
) {
  const url = new URL(path, `${base}/`);
  if (cacheBust) {
    url.searchParams.set("__irha_live_check", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  let lastError = "unknown error";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect,
        headers: {
          "user-agent": userAgent,
          "cache-control": "no-cache, no-store, max-age=0",
          pragma: "no-cache",
        },
        signal: AbortSignal.timeout(25_000),
      });

      if (!retryable(response.status) || attempt === attempts) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === attempts) break;
    }

    const delay = Math.min(attempt * 1_000, 4_000);
    console.warn(`WARN retry ${attempt}/${attempts} for ${url.origin}${url.pathname}: ${lastError}`);
    await wait(delay);
  }

  throw new Error(`${url.origin}${url.pathname} failed after ${attempts} attempts: ${lastError}`);
}

async function read(path, options = {}) {
  const response = await request(path, options);
  const text = await response.text();
  return { response, text };
}

function headerOrMetaSecurity(response, html) {
  const cspHeader = response.headers.get("content-security-policy") || "";
  const hasMetaCsp = /<meta\s+http-equiv=["']Content-Security-Policy["']/i.test(html);
  assert(cspHeader || hasMetaCsp, "homepage has neither a CSP response header nor the CSP meta fallback");

  const advisoryHeaders = [
    "x-content-type-options",
    "referrer-policy",
    "x-frame-options",
    "permissions-policy",
    "strict-transport-security",
  ];
  for (const name of advisoryHeaders) {
    if (!response.headers.get(name)) console.warn(`WARN live response header is absent: ${name}`);
  }
}

async function verifyRoute(path, expectedTitle, expectedCanonical) {
  const { response, text } = await read(path);
  assert(response.status === 200, `${path} returned HTTP ${response.status}`);
  assert(text.includes(`<title>${expectedTitle}</title>`), `${path} has an unexpected static title`);
  assert(
    text.includes(`<link rel="canonical" href="${BASE}${expectedCanonical}"`),
    `${path} has a missing or incorrect canonical`,
  );
  assert(text.includes(`data-irha-route-shell="${path}"`), `${path} is missing its static crawler-shell marker`);
  assert(!/Loading (product|page|collection|products)/i.test(text), `${path} exposes a loading-only crawler response`);
  console.log(`PASS route ${path}`);
}

async function verifyAlias() {
  const response = await request("/", { base: ALIAS, redirect: "manual", cacheBust: false });
  if ([301, 302, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");
    assert(location, `www alias returned HTTP ${response.status} without Location`);
    const target = new URL(location, `${ALIAS}/`);
    assert(target.origin === BASE, `www alias redirects to unexpected origin ${target.origin}`);
    console.log(`PASS alias redirect ${response.status}: ${ALIAS} -> ${target.origin}`);
    return;
  }

  assert(response.status === 200, `www alias returned unexpected HTTP ${response.status}`);
  console.warn("WARN www alias serves HTTP 200 instead of a server redirect; canonical tags remain authoritative");
}

async function verifyLegacyRedirect(from, to, canonical = to) {
  const response = await request(from, { redirect: "manual", cacheBust: false });
  if ([301, 302, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");
    assert(location, `${from} returned HTTP ${response.status} without Location`);
    const resolved = new URL(location, `${BASE}/`);
    const expected = new URL(to, `${BASE}/`);
    assert(
      `${resolved.pathname}${resolved.search}${resolved.hash}` ===
        `${expected.pathname}${expected.search}${expected.hash}`,
      `${from} redirects to ${resolved.pathname}${resolved.hash}, expected ${to}`,
    );
    console.log(`PASS server redirect ${from} -> ${to}`);
    return;
  }

  assert(response.status === 200, `${from} returned unexpected HTTP ${response.status}`);
  const html = await response.text();
  const canonicalUrl = new URL(canonical.split("#")[0], `${BASE}/`).toString();
  assert(/name=["']robots["']\s+content=["']noindex,follow["']/i.test(html), `${from} soft redirect lacks noindex,follow`);
  assert(html.includes(`href="${canonicalUrl}"`), `${from} soft redirect has an incorrect canonical`);
  assert(html.includes(`data-irha-static-redirect="${from}"`), `${from} soft redirect marker is missing`);
  assert(html.includes(to), `${from} soft redirect does not contain target ${to}`);
  console.log(`PASS static redirect ${from} -> ${to}`);
}

async function verifyRobotsAndSitemap() {
  const robotsResult = await read("/robots.txt");
  assert(robotsResult.response.status === 200, `robots.txt returned HTTP ${robotsResult.response.status}`);
  assert(robotsResult.text.includes(`Sitemap: ${BASE}/sitemap.xml`), "robots.txt has an incorrect sitemap declaration");
  assert(robotsResult.text.includes("Disallow: /admin"), "robots.txt must disallow /admin");
  assert(robotsResult.text.includes("Disallow: /auth"), "robots.txt must disallow /auth");

  const sitemapResult = await read("/sitemap.xml");
  assert(sitemapResult.response.status === 200, `sitemap.xml returned HTTP ${sitemapResult.response.status}`);
  const urlCount = (sitemapResult.text.match(/<url>/g) || []).length;
  assert(urlCount >= 50, `sitemap.xml contains only ${urlCount} URLs`);
  assert(
    sitemapResult.text.includes(`<loc>${BASE}</loc>`) || sitemapResult.text.includes(`<loc>${BASE}/</loc>`),
    "sitemap.xml is missing the canonical homepage",
  );
  assert(!sitemapResult.text.includes("https://www.irhaapparels.com"), "sitemap.xml contains non-canonical www URLs");
  assert(
    !sitemapResult.text.includes("d22ac15e-d657-4a4c-804c-fb8697ceb050"),
    "sitemap.xml contains the retired UUID product URL",
  );

  const lastmods = [...sitemapResult.text.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  if (lastmods.length > 0 && new Set(lastmods).size === 1) {
    console.warn(`WARN sitemap exposes one uniform lastmod date across ${lastmods.length} URLs`);
  }

  console.log(`PASS robots.txt and sitemap.xml (${urlCount} URLs)`);
}

async function main() {
  await verifyRoute(
    "/products/leisure-nightwear/plush-bathrobe-sleep-robe",
    "Plush Bathrobe Sleep Robe Manufacturer | Irha Apparels",
    "/products/leisure-nightwear/plush-bathrobe-sleep-robe",
  );
  await verifyRoute("/buyer-trust", "Buyer Trust Center | Irha Apparels", "/buyer-trust");
  await verifyRoute("/resources", "B2B Buyer Resources | Irha Apparels", "/resources");
  await verifyRoute("/faq", "Buyer FAQ | Irha Apparels", "/faq");

  await verifyAlias();
  await verifyLegacyRedirect("/buyer-trust-center", "/buyer-trust");
  await verifyLegacyRedirect("/buyer-trust-centre", "/buyer-trust");
  await verifyLegacyRedirect("/buyer-resources", "/resources");
  await verifyLegacyRedirect("/buyer-faq", "/faq");
  await verifyLegacyRedirect("/shipping-returns", "/resources#shipping-questions", "/resources");
  await verifyLegacyRedirect(
    "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe",
    "/products/leisure-nightwear/plush-bathrobe-sleep-robe",
  );

  await verifyRobotsAndSitemap();
  const home = await read("/");
  headerOrMetaSecurity(home.response, home.text);

  console.log(`PASS live crawler parity for ${BASE}`);
}

main().catch((error) => {
  console.error("FAIL live crawler parity");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
