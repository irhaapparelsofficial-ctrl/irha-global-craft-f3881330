const BASE = (process.env.IRHA_BASE_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const EXPECTED_RELEASE = process.env.IRHA_EXPECTED_RELEASE || "frontend-live-2026-07-12-r10";
const EXPECTED_RELEASE_TEXT = process.env.IRHA_EXPECTED_RELEASE_TEXT || "IRHA_FRONTEND_LIVE_2026_07_12_R10";
const TIMEOUT_MINUTES = Number(process.env.IRHA_PROPAGATION_MINUTES || "20");
const INTERVAL_MS = 20_000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(path) {
  const url = new URL(path, BASE);
  url.searchParams.set("__irha_release_probe", Date.now().toString());
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "cache-control": "no-cache, no-store, max-age=0",
        pragma: "no-cache",
      },
      signal: AbortSignal.timeout(30_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      text: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      url: url.toString(),
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probe() {
  const [build, release, home] = await Promise.all([
    fetchText("/build.json"),
    fetchText("/release.txt"),
    fetchText("/"),
  ]);

  let parsedBuild = null;
  try {
    parsedBuild = JSON.parse(build.text);
  } catch {
    parsedBuild = null;
  }

  const buildOk = build.ok && parsedBuild?.release === EXPECTED_RELEASE;
  const releaseOk = release.ok && release.text.includes(EXPECTED_RELEASE_TEXT);
  const homeOk = home.ok && home.text.includes(EXPECTED_RELEASE);

  return {
    ready: buildOk && releaseOk && homeOk,
    buildOk,
    releaseOk,
    homeOk,
    buildStatus: build.status,
    releaseStatus: release.status,
    homeStatus: home.status,
    buildRelease: parsedBuild?.release || null,
    homeUrl: home.url,
    errors: [build.error, release.error, home.error].filter(Boolean),
  };
}

function diagnosis(result) {
  if (result.buildOk && result.releaseOk && !result.homeOk) {
    return "Static release files are current but homepage HTML is stale. The custom domain/CDN is serving an older index.html. Re-publish the latest synced commit and verify the custom domain is attached to this Lovable project.";
  }
  if (!result.buildOk && !result.releaseOk && !result.homeOk) {
    return "The custom domain is serving an older deployment or a different project. Verify the domain attachment in Lovable project settings before publishing again.";
  }
  return "Production is partially updated. Wait for propagation, then verify the Lovable custom-domain attachment and publish state.";
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MINUTES * 60_000;
  let attempt = 0;
  let latest = null;

  while (Date.now() <= deadline) {
    attempt += 1;
    latest = await probe();
    console.log(
      `release probe ${attempt}: build=${latest.buildOk} release=${latest.releaseOk} homepage=${latest.homeOk} ` +
      `statuses=${latest.buildStatus}/${latest.releaseStatus}/${latest.homeStatus} buildRelease=${latest.buildRelease || "missing"}`,
    );

    if (latest.ready) {
      console.log(`PASS production release propagated for ${BASE} (${EXPECTED_RELEASE})`);
      return;
    }

    if (Date.now() + INTERVAL_MS > deadline) break;
    await wait(INTERVAL_MS);
  }

  console.error("FAIL production release did not propagate before timeout");
  console.error(diagnosis(latest || {}));
  console.error(JSON.stringify(latest, null, 2));
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
