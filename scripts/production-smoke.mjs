import { createHash } from "node:crypto";

const BASE = process.env.IRHA_BASE_URL || "https://www.irhaapparels.com";
const APEX = process.env.IRHA_APEX_URL || "https://irhaapparels.com";
const RELEASE = "gate4-2026-07-06-r6";
const RELEASE_TXT = "IRHA_GATE4_RELEASE_2026_07_06_R6";

const forbidden = [
  "Since 2014",
  "MOQ 50",
  "45-day delivery",
  "45-Day Production",
  "reply within 12 hours",
  "OEKO-TEX® 100",
  "BSCI Audited",
  "ISO 9001:2015",
  "SEDEX Member",
];

const agents = {
  browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  aiCrawler: "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
};

async function get(path, { base = BASE, userAgent = agents.browser, cacheBust = false } = {}) {
  const url = new URL(path, base);
  if (cacheBust) url.searchParams.set("__irha_smoke", Date.now().toString());

  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": userAgent,
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return { requestedUrl: url.toString(), url: res.url, text, headers: res.headers, status: res.status };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeHtml(html) {
  return html
    .replace(/__irha_smoke=\d+/g, "__irha_smoke=TIMESTAMP")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(html) {
  return createHash("sha256").update(normalizeHtml(html)).digest("hex").slice(0, 16);
}

function assertNoLegacyClaims(label, text) {
  for (const term of forbidden) {
    assert(!text.toLowerCase().includes(term.toLowerCase()), `${label} contains forbidden legacy claim: ${term}`);
  }
}

async function main() {
  const release = await get("/release.txt", { cacheBust: true });
  assert(release.text.includes(RELEASE_TXT), `release.txt is not ${RELEASE_TXT}`);

  const build = await get("/build.json", { cacheBust: true });
  const buildJson = JSON.parse(build.text);
  assert(buildJson.release === RELEASE, `build.json release is ${buildJson.release || "missing"}`);

  const htmlByAgent = new Map();
  for (const [name, userAgent] of Object.entries(agents)) {
    const home = await get("/", { userAgent, cacheBust: true });
    assert(home.text.includes(RELEASE), `${name} homepage HTML does not contain release marker ${RELEASE}`);
    assertNoLegacyClaims(`${name} homepage`, home.text);
    htmlByAgent.set(name, home.text);
  }

  const fingerprints = Object.fromEntries(
    Array.from(htmlByAgent.entries()).map(([name, html]) => [name, fingerprint(html)]),
  );
  const uniqueFingerprints = new Set(Object.values(fingerprints));
  assert(
    uniqueFingerprints.size === 1,
    `crawler/browser split-brain detected: ${JSON.stringify(fingerprints)}`,
  );

  const apex = await get("/", { base: APEX, cacheBust: true });
  assert(
    new URL(apex.url).hostname === new URL(BASE).hostname,
    `apex domain did not resolve to canonical host: final=${apex.url}`,
  );

  const sitemap = await get("/sitemap.xml", { cacheBust: true });
  for (const path of ["/de", "/faq", "/sustainability", "/shipping-returns", "/blog", "/journal"]) {
    assert(!sitemap.text.includes(`<loc>${BASE}${path}`), `sitemap still contains quarantined route ${path}`);
  }

  for (const path of ["/", "/products", "/catalogue", "/inquiry", "/contact", "/admin"]) {
    await get(path, { cacheBust: true });
  }

  console.log(`PASS production smoke for ${BASE}`);
  console.log(`release=${RELEASE}`);
  console.log(`fingerprint=${Object.values(fingerprints)[0]}`);
  console.log(`agents=${Object.keys(agents).join(",")}`);
}

main().catch((error) => {
  console.error("FAIL production smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
