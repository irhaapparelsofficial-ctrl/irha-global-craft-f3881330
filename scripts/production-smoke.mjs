const BASE = process.env.IRHA_BASE_URL || "https://www.irhaapparels.com";
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

async function get(path) {
  const url = new URL(path, BASE).toString();
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "IrhaProductionSmoke/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return { url: res.url, text, headers: res.headers };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const release = await get("/release.txt");
  assert(release.text.includes(RELEASE_TXT), `release.txt is not ${RELEASE_TXT}`);

  const build = await get("/build.json");
  const buildJson = JSON.parse(build.text);
  assert(buildJson.release === RELEASE, `build.json release is ${buildJson.release || "missing"}`);

  const home = await get("/");
  assert(home.text.includes(RELEASE), `homepage HTML does not contain release marker ${RELEASE}`);
  for (const term of forbidden) {
    assert(!home.text.toLowerCase().includes(term.toLowerCase()), `homepage contains forbidden legacy claim: ${term}`);
  }

  const sitemap = await get("/sitemap.xml");
  for (const path of ["/de", "/faq", "/sustainability", "/shipping-returns", "/blog", "/journal"]) {
    assert(!sitemap.text.includes(`<loc>${BASE}${path}`), `sitemap still contains quarantined route ${path}`);
  }

  for (const path of ["/", "/products", "/catalogue", "/inquiry", "/contact", "/admin"]) {
    await get(path);
  }

  console.log(`PASS production smoke for ${BASE}`);
  console.log(`release=${RELEASE}`);
}

main().catch((error) => {
  console.error("FAIL production smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
