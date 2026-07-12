const PRIMARY = (process.env.IRHA_PRIMARY_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const ALIASES = (process.env.IRHA_DOMAIN_ALIASES || "https://irhaapparels.com")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);
const EXPECTED_RELEASE = process.env.IRHA_EXPECTED_RELEASE || "frontend-live-2026-07-12-r10";
const EXPECTED_PROJECT_ID = process.env.IRHA_EXPECTED_PROJECT_ID || "da72a40a-7df3-44c3-a72d-f180d9ffcd25";
const EXPECTED_REPOSITORY = process.env.IRHA_EXPECTED_REPOSITORY || "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(origin, path) {
  const url = new URL(path, origin);
  url.searchParams.set("__irha_domain_probe", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "cache-control": "no-cache, no-store, max-age=0",
      pragma: "no-cache",
      "user-agent": "Irha-Domain-Consistency/2.0",
    },
    signal: AbortSignal.timeout(30_000),
  });
  return {
    status: response.status,
    finalUrl: response.url,
    body: await response.text(),
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function inspectBuild(build) {
  return {
    release: build?.release === EXPECTED_RELEASE,
    project: build?.lovable_project_id === EXPECTED_PROJECT_ID,
    repository: build?.repository === EXPECTED_REPOSITORY,
    branch: build?.source_branch === "main",
    policy: build?.deployment_policy === "latest-main-only",
  };
}

function buildIdentityOk(source) {
  return Object.values(source).every(Boolean);
}

function canonicalOrigin(body) {
  const match = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (!match) return null;
  try {
    return new URL(match[1]).origin;
  } catch {
    return null;
  }
}

async function inspectOrigin(origin) {
  const [home, buildResponse] = await Promise.all([
    fetchText(origin, "/"),
    fetchText(origin, "/build.json"),
  ]);
  const build = parseJson(buildResponse.body);
  return {
    origin,
    home,
    buildResponse,
    build,
    source: inspectBuild(build),
  };
}

async function verifyPrimary() {
  const result = await inspectOrigin(PRIMARY);
  assert(result.home.status === 200, `Primary domain ${PRIMARY} returned HTTP ${result.home.status}`);
  assert(result.home.body.includes('id="root"'), `Primary domain ${PRIMARY} is missing the application root`);
  assert(result.buildResponse.status === 200, `Primary build identity returned HTTP ${result.buildResponse.status}`);
  assert(
    buildIdentityOk(result.source),
    `Primary domain ${PRIMARY} is not serving the approved build identity: ${JSON.stringify(result.source)}`,
  );
  return result;
}

async function verifyAlias(alias, primary) {
  const result = await inspectOrigin(alias);
  const finalOrigin = new URL(result.home.finalUrl).origin;
  const primaryOrigin = new URL(PRIMARY).origin;
  const redirectedToPrimary = finalOrigin === primaryOrigin;
  const canonicalToPrimary = canonicalOrigin(result.home.body) === primaryOrigin;
  const servesApprovedBuild = buildIdentityOk(result.source);

  assert(result.home.status === 200, `Domain alias ${alias} returned HTTP ${result.home.status}`);
  assert(
    redirectedToPrimary || servesApprovedBuild,
    `DOMAIN DEPLOYMENT MISMATCH: ${alias} neither redirects to ${PRIMARY} nor serves the approved build identity. final=${result.home.finalUrl} source=${JSON.stringify(result.source)}`,
  );

  if (!redirectedToPrimary && !canonicalToPrimary) {
    console.warn(
      `WARN ${alias} serves the approved deployment but raw HTML has no static canonical. Rendered SEO audit remains authoritative for canonical verification.`,
    );
  }

  if (servesApprovedBuild) {
    assert(
      result.build?.release === primary.build?.release &&
        result.build?.lovable_project_id === primary.build?.lovable_project_id &&
        result.build?.repository === primary.build?.repository,
      `DOMAIN BUILD MISMATCH: ${alias} and ${PRIMARY} do not expose the same deployment identity`,
    );
  }

  console.log(
    `PASS alias ${alias}: final=${result.home.finalUrl} redirectedToPrimary=${redirectedToPrimary} ` +
      `approvedBuild=${servesApprovedBuild} canonicalToPrimary=${canonicalToPrimary}`,
  );
}

async function main() {
  const primary = await verifyPrimary();
  console.log(`PASS primary ${PRIMARY}: final=${primary.home.finalUrl}`);
  for (const alias of ALIASES) await verifyAlias(alias, primary);
  console.log(`PASS production domain consistency: primary=${PRIMARY} aliases=${ALIASES.join(",")}`);
}

main().catch((error) => {
  console.error("FAIL production domain consistency");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
