import { readFile } from "node:fs/promises";

const EXPECTED = {
  release: "frontend-live-2026-07-13-r11",
  releaseText: "IRHA_FRONTEND_LIVE_2026_07_13_R11",
  projectId: "da72a40a-7df3-44c3-a72d-f180d9ffcd25",
  supabaseProjectId: "pvzjiozismyxqrzmtfbi",
  repository: "irhaapparelsofficial-ctrl/irha-global-craft-f3881330",
  origin: "https://irhaapparels.com",
  alias: "https://www.irhaapparels.com",
  branch: "main",
  policy: "latest-main-only",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function text(path) {
  return readFile(path, "utf8");
}

async function main() {
  const [
    buildRaw,
    release,
    index,
    headers,
    workflow,
    waitScript,
    domainScript,
    smokeScript,
    envFile,
    supabaseConfig,
    supabaseClient,
    ownerRuntime,
  ] = await Promise.all([
    text("public/build.json"),
    text("public/release.txt"),
    text("index.html"),
    text("public/_headers"),
    text(".github/workflows/production-smoke.yml"),
    text("scripts/wait-for-production-release.mjs"),
    text("scripts/verify-production-domains.mjs"),
    text("scripts/production-smoke-v2.mjs"),
    text(".env"),
    text("supabase/config.toml"),
    text("src/integrations/supabase/client.ts"),
    text("src/integrations/supabase/ownerRuntime.ts"),
  ]);

  const build = JSON.parse(buildRaw);
  assert(build.release === EXPECTED.release, "build.json release mismatch");
  assert(build.release_text === EXPECTED.releaseText, "build.json release_text mismatch");
  assert(build.lovable_project_id === EXPECTED.projectId, "build.json Lovable project mismatch");
  assert(build.supabase_project_id === EXPECTED.supabaseProjectId, "build.json Supabase project mismatch");
  assert(build.repository === EXPECTED.repository, "build.json repository mismatch");
  assert(build.source_branch === EXPECTED.branch, "build.json source branch mismatch");
  assert(String(build.expected_origin || "").replace(/\/$/, "") === EXPECTED.origin, "build.json production origin mismatch");
  assert(build.deployment_policy === EXPECTED.policy, "build.json deployment policy mismatch");

  const requiredReleaseLines = [
    EXPECTED.releaseText,
    `Lovable Project: ${EXPECTED.projectId}`,
    `Repository: ${EXPECTED.repository}`,
    `Production Origin: ${EXPECTED.origin}`,
    `Supabase Project: ${EXPECTED.supabaseProjectId}`,
    `Deployment Policy: ${EXPECTED.policy}`,
  ];
  for (const line of requiredReleaseLines) {
    assert(release.includes(line), `release.txt missing: ${line}`);
  }

  const requiredMeta = [
    `name="x-irha-release" content="${EXPECTED.release}"`,
    `name="x-irha-project-id" content="${EXPECTED.projectId}"`,
    `name="x-irha-supabase-project-id" content="${EXPECTED.supabaseProjectId}"`,
    `name="x-irha-repository" content="${EXPECTED.repository}"`,
    `name="x-irha-deployment-policy" content="${EXPECTED.policy}"`,
  ];
  for (const marker of requiredMeta) {
    assert(index.includes(marker), `index.html missing deployment marker: ${marker}`);
  }

  for (const route of ["/build.json", "/release.txt", "/"]) {
    const routeIndex = headers.indexOf(`\n${route}\n`);
    assert(routeIndex >= 0, `_headers missing explicit rule for ${route}`);
    const block = headers.slice(routeIndex, routeIndex + 180);
    assert(block.includes("Cache-Control: no-store"), `_headers must disable stale caching for ${route}`);
  }

  for (const source of [waitScript, smokeScript]) {
    for (const value of [
      EXPECTED.projectId,
      EXPECTED.supabaseProjectId,
      EXPECTED.repository,
      EXPECTED.origin,
      EXPECTED.policy,
    ]) {
      assert(source.includes(value), `production verifier missing source identity: ${value}`);
    }
  }

  const requiredWorkflowLines = [
    `default: ${EXPECTED.origin}`,
    `IRHA_EXPECTED_ORIGIN: ${EXPECTED.origin}`,
    `IRHA_PRIMARY_URL: ${EXPECTED.origin}`,
    `IRHA_DOMAIN_ALIASES: ${EXPECTED.alias}`,
    `default: ${EXPECTED.release}`,
    `default: ${EXPECTED.releaseText}`,
  ];
  for (const line of requiredWorkflowLines) {
    assert(workflow.includes(line), `production-smoke workflow missing or stale: ${line}`);
  }
  assert(
    !workflow.includes(`IRHA_EXPECTED_ORIGIN: ${EXPECTED.alias}`) &&
      !workflow.includes(`IRHA_PRIMARY_URL: ${EXPECTED.alias}`),
    "production-smoke workflow incorrectly treats www as canonical primary",
  );
  assert(
    domainScript.includes(`IRHA_PRIMARY_URL || "${EXPECTED.origin}"`) &&
      domainScript.includes(`IRHA_DOMAIN_ALIASES || "${EXPECTED.alias}"`) &&
      domainScript.includes(EXPECTED.release),
    "domain verifier defaults are not aligned to apex R11 production",
  );

  for (const source of [supabaseConfig, ownerRuntime]) {
    assert(source.includes(EXPECTED.supabaseProjectId), "runtime Supabase configuration is not locked to owner project");
    assert(!source.includes("mlefxgyaqoisvdmoiapq"), "immutable runtime source references Lovable Cloud");
  }
  assert(
    ownerRuntime.includes(`OWNER_SUPABASE_URL = "https://${EXPECTED.supabaseProjectId}.supabase.co"`),
    "immutable owner Supabase URL mismatch",
  );
  assert(
    ownerRuntime.includes("OWNER_SUPABASE_PUBLISHABLE_KEY"),
    "immutable owner publishable key is missing",
  );
  assert(
    !ownerRuntime.includes("service_role") && !ownerRuntime.includes("SERVICE_ROLE"),
    "service-role material must never be present in the frontend runtime",
  );
  assert(
    !supabaseClient.includes("import.meta.env") &&
      supabaseClient.includes("OWNER_SUPABASE_PROJECT_ID") &&
      supabaseClient.includes("OWNER_SUPABASE_URL") &&
      supabaseClient.includes("OWNER_SUPABASE_PUBLISHABLE_KEY"),
    "frontend client must use only immutable owner runtime constants",
  );
  assert(
    !supabaseClient.includes("mlefxgyaqoisvdmoiapq"),
    "frontend client references Lovable Cloud",
  );

  const managedEnvAligned =
    envFile.includes(`VITE_SUPABASE_URL="https://${EXPECTED.supabaseProjectId}.supabase.co"`) &&
    !envFile.includes("mlefxgyaqoisvdmoiapq");
  if (!managedEnvAligned) {
    console.warn("WARN Lovable-managed .env differs; immutable owner runtime remains authoritative.");
  }

  console.log(
    `PASS deployment source lock: release=${EXPECTED.release} lovable=${EXPECTED.projectId} supabase=${EXPECTED.supabaseProjectId} repository=${EXPECTED.repository} origin=${EXPECTED.origin}`,
  );
}

main().catch((error) => {
  console.error("FAIL deployment source lock");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
