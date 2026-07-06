const BASE = process.env.IRHA_BASE_URL || "https://www.irhaapparels.com";
const RELEASE = "gate4-2026-07-06-r6";
const RELEASE_TXT = "IRHA_GATE4_RELEASE_2026_07_06_R6";
const forbidden = ["Since 2014", "MOQ 50", "45-day delivery", "45-Day Production", "reply within 12 hours"];
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
      if (response.ok) return { text, url: response.url };
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
  for (const path of ["/de", "/faq", "/sustainability", "/shipping-returns", "/blog", "/journal"]) {
    assert(!sitemap.includes(`<loc>${BASE}${path}`), `sitemap contains quarantined route ${path}`);
  }

  for (const path of ["/products", "/catalogue", "/inquiry", "/contact", "/admin"]) {
    await fetchText(path);
  }

  console.log(`PASS production smoke for ${BASE}`);
}

main().catch((error) => {
  console.error("FAIL production smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
