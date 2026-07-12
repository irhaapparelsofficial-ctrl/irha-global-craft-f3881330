const BASE = (process.env.IRHA_BASE_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const EXPECTED_RELEASE = process.env.IRHA_EXPECTED_RELEASE || "frontend-live-2026-07-12-r10";
const EXPECTED_RELEASE_TEXT = process.env.IRHA_EXPECTED_RELEASE_TEXT || "IRHA_FRONTEND_LIVE_2026_07_12_R10";
const EXPECTED_PROJECT_ID = process.env.IRHA_EXPECTED_PROJECT_ID || "da72a40a-7df3-44c3-a72d-f180d9ffcd25";
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
        "user-agent": "Irha-Deployment-Source-Lock/1.0",
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
  const buildRepositoryOk = build.ok && parsedBuild?.repository === EXPECTED_REPOSITORY;
  const buildOriginOk = build.ok && String(parsedBuild?.expected_origin || "").replace(/\/$/, "") === EXPECTED_ORIGIN;
  const buildPolicyOk = build.ok && parsedBuild?.deployment_policy === "latest-main-only";
  const buildOk = buildReleaseOk && buildProjectOk && buildRepositoryOk && buildOriginOk && buildPolicyOk;

  const releaseOk =
    release.ok &&
    release.text.includes(EXPECTED_RELEASE_TEXT) &&
    release.text.includes(`Lovable Project: ${EXPECTED_PROJECT_ID}`) &&
    release.text.includes(`Repository: ${EXPECTED_REPOSITORY}`) &&
    release.text.includes(`Production Origin: ${EXPECTED_ORIGIN}`) &&
    release.text.includes("Deployment Policy: latest-main-only");

  const homeReleaseOk = home.ok && home.text.includes(`name="x-irha-release" content="${EXPECTED_RELEASE}"`);
  const homeProjectOk = home.ok && home.text.includes(`name="x-irha-project-id" content="${EXPECTED_PROJECT_ID}"`);
  const homeRepositoryOk = home.ok && home.text.includes(`name="x-irha-repository" content="${EXPECTED_REPOSITORY}"`);
  const homePolicyOk = home.ok && home.text.includes('name="x-irha-deployment-policy" content="latest-main-only"');
  const homeOk = homeReleaseOk && homeProjectOk && homeRepositoryOk && homePolicyOk;

  return {
    ready: buildOk && releaseOk && homeOk,
    buildOk,
    buildReleaseOk,
    buildProjectOk,
    buildRepositoryOk,
    buildOriginOk,
    buildPolicyOk,
    releaseOk,
    homeOk,
    homeReleaseOk,
    homeProjectOk,
    homeRepositoryOk,
    homePolicyOk,
    buildStatus: build.status,
    releaseStatus: release.status,
    homeStatus: home.status,
    buildRelease: parsedBuild?.release || null,
    buildProjectId: parsedBuild?.lovable_project_id || null,
    buildRepository: parsedBuild?.repository || null,
    buildOrigin: parsedBuild?.expected_origin || null,
    homeUrl: home.url,
    errors: [build.error, release.error, home.error].filter(Boolean),
  };
}

function diagnosis(result) {
  if (!result.buildProjectOk || !result.homeProjectOk) {
    return `CUSTOM DOMAIN TARGET MISMATCH: ${BASE} is not serving Lovable project ${EXPECTED_PROJECT_ID}. Detach the domain from the old Lovable project, attach it to project ${EXPECTED_PROJECT_ID}, then publish latest main.`;
  }
  if (!result.buildRepositoryOk || !result.homeRepositoryOk) {
    return `SOURCE REPOSITORY MISMATCH: production is not serving ${EXPECTED_REPOSITORY}. Verify GitHub sync and publish latest main from the correct Lovable project.`;
  }
  if (!result.buildOriginOk) {
    return `PRODUCTION ORIGIN MISMATCH: build identity does not declare ${EXPECTED_ORIGIN}. Verify the custom-domain attachment before publishing.`;
  }
  if (result.buildOk && result.releaseOk && !result.homeOk) {
    return "Static identity files are current but homepage HTML is stale. Purge/re-publish the current Lovable project and verify the custom domain is attached to it.";
  }
  if (!result.buildOk && !result.releaseOk && !result.homeOk) {
    return `The custom domain is serving an older deployment or another project. Expected project ${EXPECTED_PROJECT_ID} and repository ${EXPECTED_REPOSITORY}.`;
  }
  return "Production identity is partially updated. Wait for propagation, then verify the custom-domain attachment and publish state.";
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MINUTES * 60_000;
  let attempt = 0;
  let latest = null;

  while (Date.now() <= deadline) {
    attempt += 1;
    latest = await probe();
    console.log(
      `source-lock probe ${attempt}: build=${latest.buildOk} release=${latest.releaseOk} homepage=${latest.homeOk} ` +
      `project=${latest.buildProjectOk && latest.homeProjectOk} repository=${latest.buildRepositoryOk && latest.homeRepositoryOk} ` +
      `statuses=${latest.buildStatus}/${latest.releaseStatus}/${latest.homeStatus} buildRelease=${latest.buildRelease || "missing"} ` +
      `buildProject=${latest.buildProjectId || "missing"}`,
    );

    if (latest.ready) {
      console.log(
        `PASS production source lock for ${BASE}: release=${EXPECTED_RELEASE} project=${EXPECTED_PROJECT_ID} repository=${EXPECTED_REPOSITORY}`,
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
