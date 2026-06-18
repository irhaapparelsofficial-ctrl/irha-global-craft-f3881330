// Post-build: notify Google, Bing and IndexNow that the sitemap changed.
// Failures are logged but never fail the build — pings are best-effort.

const HOST = "www.irhaapparels.com";
const SITEMAP = `https://${HOST}/sitemap.xml`;
const INDEXNOW_KEY = "19d2833c43fe6e05e2a4416f65a53cdc";

async function tryFetch(label, url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(10_000) });
    console.log(`[ping] ${label} → ${res.status}`);
  } catch (e) {
    console.log(`[ping] ${label} → ${(e && e.message) || e}`);
  }
}

async function main() {
  // Google's /ping was deprecated in 2023 but still accepts; harmless if 404.
  await tryFetch("Google", `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`);
  await tryFetch("Bing", `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`);

  // IndexNow — modern protocol consumed by Bing, Yandex, Seznam, Naver.
  // Submit the sitemap URL itself as a "changed" signal.
  await tryFetch("IndexNow", "https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: [SITEMAP, `https://${HOST}/`],
    }),
  });
}

main().catch((e) => {
  console.log("[ping] fatal", e);
  process.exit(0); // never block the build
});
