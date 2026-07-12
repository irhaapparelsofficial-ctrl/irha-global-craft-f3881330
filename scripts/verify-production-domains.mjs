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

function marker(name, value) {
  return new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
}

async function fetchHtml(origin) {
  const url = new URL("/", origin);
  url.searchParams.set("__irha_domain_probe", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "cache-control": "no-cache, no-store, max-age=0",
      pragma: "no-cache",
      "user-agent": "Irha-Domain-Consistency/1.0",
    },
    signal: AbortSignal.timeout(30_000),
  });
  return {
    status: response.status,
    finalUrl: response.url,
    body: await response.text(),
  };
}

function inspectSource(body) {
  return {
    release: marker("x-irha-release", EXPECTED_RELEASE).test(body),
    project: marker("x-irha-project-id", EXPECTED_PROJECT_ID).test(body),
    repository: marker("x-irha-repository", EXPECTED_REPOSITORY).test(body),
    policy: marker("x-irha-deployment-policy", "latest-main-only").test(body),
  };
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

async function verifyPrimary() {
  const result = await fetchHtml(PRIMARY);
  const source = inspectSource(result.body);
  assert(result.status === 200, `Primary domain ${PRIMARY} returned HTTP ${result.status}`);
  assert(Object.values(source).every(Boolean), `Primary domain ${PRIMARY} is not serving the approved release/project/repository identity: ${JSON.stringify(source)}`);
  return result;
}

async function verifyAlias(alias) {
  const result = await fetchHtml(alias);
  const source = inspectSource(result.body);
  const finalOrigin = new URL(result.finalUrl).origin;
  const primaryOrigin = new URL(PRIMARY).origin;
  const redirectedToPrimary = finalOrigin === primaryOrigin;
  const canonicalToPrimary = canonicalOrigin(result.body) === primaryOrigin;

  assert(result.status === 200, `Domain alias ${alias} returned HTTP ${result.status}`);
  assert(
    redirectedToPrimary || Object.values(source).every(Boolean),
    `DOMAIN DEPLOYMENT MISMATCH: ${alias} is not redirecting to ${PRIMARY} and is not serving the approved source identity. final=${result.finalUrl} source=${JSON.stringify(source)}`,
  );
  assert(
    redirectedToPrimary || canonicalToPrimary,
    `DOMAIN SEO MISMATCH: ${alias} neither redirects to ${PRIMARY} nor declares a canonical on ${primaryOrigin}`,
  );

  console.log(
    `PASS alias ${alias}: final=${result.finalUrl} redirectedToPrimary=${redirectedToPrimary} canonicalToPrimary=${canonicalToPrimary}`,
  );
}

async function main() {
  const primary = await verifyPrimary();
  console.log(`PASS primary ${PRIMARY}: final=${primary.finalUrl}`);
  for (const alias of ALIASES) await verifyAlias(alias);
  console.log(`PASS production domain consistency: primary=${PRIMARY} aliases=${ALIASES.join(",")}`);
}

main().catch((error) => {
  console.error("FAIL production domain consistency");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
