const BASE = (process.env.IRHA_BASE_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const EXPECTED_RELEASE = process.env.IRHA_EXPECTED_RELEASE || "frontend-live-2026-07-13-r11";
const EXPECTED_RELEASE_TEXT = process.env.IRHA_EXPECTED_RELEASE_TEXT || "IRHA_FRONTEND_LIVE_2026_07_13_R11";
const EXPECTED_PROJECT_ID = process.env.IRHA_EXPECTED_PROJECT_ID || "da72a40a-7df3-44c3-a72d-f180d9ffcd25";
const EXPECTED_SUPABASE_PROJECT_ID = process.env.IRHA_EXPECTED_SUPABASE_PROJECT_ID || "pvzjiozismyxqrzmtfbi";
const EXPECTED_REPOSITORY = process.env.IRHA_EXPECTED_REPOSITORY || "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";
const EXPECTED_ORIGIN = (process.env.IRHA_EXPECTED_ORIGIN || "https://www.irhaapparels.com").replace(/\/$/, "");
const TIMEOUT_MINUTES = Number(process.env.IRHA_PROPAGATION_MINUTES || "20");
const INTERVAL_MS = 20_000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(path) {
  const url = new URL(path, BASE);
  url.searchParams.set("__irha_release_probe", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "cache-control": "no-cache, no-store, max-age=0",
        pragma: "no-cache",
        "user-agent": "Irha-Deployment-Source-Lock/3.0",
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

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function probe() {
  const [build, release, home] = await Promise.all([
    fetchText("/build.json"),
    fetchText("/release.txt"),
    fetchText("/"),
  ]);

  const parsedBuild = parseJson(build.text);
  const buildReleaseOk = build.ok && parsedBuild?.release === EXPECTED_RELEASE;
  const buildProjectOk = build.ok && parsedBuild?.lovable_project_id === EXPECTED_PROJECT_ID;
  const buildSupabaseOk = build.ok && parsedBuild?.supabase_project_id === EXPECTED_SUPABASE_PROJECT_ID;
  const buildRepositoryOk = build.ok && parsedBuild?.repository === EXPECTED_REPOSITORY;
  const buildOriginOk = build.ok && String(parsedBuild?.expected_origin || "").replace(/\/$/, "") === EXPECTED_ORIGIN;
  const buildPolicyOk = build.ok && parsedBuild?.deployment_policy === "latest-main-only";
  const buildBranchOk = build.ok && parsedBuild?.source_branch === "main";
  const buildOk =
    buildReleaseOk &&
    buildProjectOk &&
    buildSupabaseOk &&
    buildRepositoryOk &&
    buildOriginOk &&
    buildPolicyOk &&
    buildBranchOk;

  const releaseOk =
    release.ok &&
    release.text.includes(EXPECTED_RELEASE_TEXT) &&
    release.text.includes(`Lovable Project: ${EXPECTED_PROJECT_ID}`) &&
    release.text.includes(`Repository: ${EXPECTED_REPOSITORY}`) &&
    release.text.includes(`Production Origin: ${EXPECTED_ORIGIN}`) &&
    release.text.includes(`Supabase Project: ${EXPECTED_SUPABASE_PROJECT_ID}`) &&
    release.text.includes("Deployment Policy: latest-main-only");

  const homeReachable =
    home.ok &&
    home.status === 200 &&
    home.text.includes('id="root"') &&
    /<title>[^<]*Irha Apparels/i.test(home.text);

  const homeLegacyMetaPresent =
    home.text.includes(`name="x-irha-release" content="${EXPECTED_RELEASE}"`) &&
    home.text.includes(`name="x-irha-project-id" content="${EXPECTED_PROJECT_ID}"`) &&
    home.text.includes(`name="x-irha-supabase-project-id" content="${EXPECTED_SUPABASE_PROJECT_ID}"`) &&
    home.text.includes(`name="x-irha-repository" content="${EXPECTED_REPOSITORY}"`);

  return {
    ready: buildOk && homeReachable,
    buildOk,
    buildReleaseOk,
    buildProjectOk,
    buildSupabaseOk,
    buildRepositoryOk,
    buildOriginOk,
    buildPolicyOk,
    buildBranchOk,
    releaseOk,
    homeReachable,
    homeLegacyMetaPresent,
    buildStatus: build.status,
    releaseStatus: release.status,
    homeStatus: home.status,
    buildRelease: parsedBuild?.release || null,
    buildProjectId: parsedBuild?.lovable_project_id || null,
    buildSupabaseProjectId: parsedBuild?.supabase_project_id || null,
    buildRepository: parsedBuild?.repository || null,
    buildOrigin: parsedBuild?.expected_origin || null,
    homeUrl: home.url,
    errors: [build.error, release.error, home.error].filter(Boolean),
  };
}

function diagnosis(result) {
  if (!result.buildProjectOk) {
    return `CUSTOM DOMAIN TARGET MISMATCH: ${BASE} is not serving Lovable project ${EXPECTED_PROJECT_ID}.`;
  }
  if (!result.buildSupabaseOk) {
    return `RUNTIME BACKEND MISMATCH: production is not declaring owner Supabase project ${EXPECTED_SUPABASE_PROJECT_ID}.`;
  }
  if (!result.buildRepositoryOk) {
    return `SOURCE REPOSITORY MISMATCH: production is not serving ${EXPECTED_REPOSITORY}.`;
  }
  if (!result.buildOriginOk) {
    return `PRODUCTION ORIGIN MISMATCH: build identity does not declare ${EXPECTED_ORIGIN}.`;
  }
  if (!result.buildReleaseOk) {
    return `STALE RELEASE: expected ${EXPECTED_RELEASE}, received ${result.buildRelease || "missing"}.`;
  }
  if (!result.homeReachable) {
    return "Homepage did not return the expected Irha application shell.";
  }
  return "Production identity is partially updated. Wait for propagation and verify the custom-domain attachment.";
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MINUTES * 60_000;
  let attempt = 0;
  let latest = null;

  while (Date.now() <= deadline) {
    attempt += 1;
    latest = await probe();
    console.log(
      `source-lock probe ${attempt}: build=${latest.buildOk} homepage=${latest.homeReachable} ` +
        `releaseAdvisory=${latest.releaseOk} htmlMeta=${latest.homeLegacyMetaPresent} ` +
        `statuses=${latest.buildStatus}/${latest.releaseStatus}/${latest.homeStatus} ` +
        `buildRelease=${latest.buildRelease || "missing"} ` +
        `lovable=${latest.buildProjectId || "missing"} supabase=${latest.buildSupabaseProjectId || "missing"}`,
    );

    if (latest.ready) {
      if (!latest.releaseOk) {
        console.warn("WARN release.txt is stale or unavailable; build.json remains the authoritative deployment identity.");
      }
      if (!latest.homeLegacyMetaPresent) {
        console.warn("WARN Lovable did not expose custom x-irha HTML meta tags; build.json identity was verified instead.");
      }
      console.log(
        `PASS production source lock for ${BASE}: release=${EXPECTED_RELEASE} lovable=${EXPECTED_PROJECT_ID} supabase=${EXPECTED_SUPABASE_PROJECT_ID} repository=${EXPECTED_REPOSITORY}`,
      );
      return;
    }

    if (Date.now() + INTERVAL_MS > deadline) break;
    await wait(INTERVAL_MS);
  }

  console.error("FAIL production source identity did not propagate before timeout");
  console.error(diagnosis(latest || {}));
  console.error(JSON.stringify(latest, null, 2));
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
