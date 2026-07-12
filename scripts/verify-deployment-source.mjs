import { readFile } from "node:fs/promises";

const EXPECTED = {
  release: "frontend-live-2026-07-13-r11",
  releaseText: "IRHA_FRONTEND_LIVE_2026_07_13_R11",
  projectId: "da72a40a-7df3-44c3-a72d-f180d9ffcd25",
  supabaseProjectId: "pvzjiozismyxqrzmtfbi",
  repository: "irhaapparelsofficial-ctrl/irha-global-craft-f3881330",
  origin: "https://www.irhaapparels.com",
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
    waitScript,
    smokeScript,
    envFile,
    supabaseConfig,
    supabaseClient,
  ] = await Promise.all([
    text("public/build.json"),
    text("public/release.txt"),
    text("index.html"),
    text("public/_headers"),
    text("scripts/wait-for-production-release.mjs"),
    text("scripts/production-smoke-v2.mjs"),
    text(".env"),
    text("supabase/config.toml"),
    text("src/integrations/supabase/client.ts"),
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

  for (const source of [envFile, supabaseConfig, supabaseClient]) {
    assert(source.includes(EXPECTED.supabaseProjectId), "runtime Supabase configuration is not locked to owner project");
  }
  assert(envFile.includes(`VITE_SUPABASE_URL="https://${EXPECTED.supabaseProjectId}.supabase.co"`), ".env owner Supabase URL mismatch");
  assert(!envFile.includes("mlefxgyaqoisvdmoiapq"), ".env still references Lovable Cloud runtime database");

  console.log(
    `PASS deployment source lock: release=${EXPECTED.release} lovable=${EXPECTED.projectId} supabase=${EXPECTED.supabaseProjectId} repository=${EXPECTED.repository} origin=${EXPECTED.origin}`,
  );
}

main().catch((error) => {
  console.error("FAIL deployment source lock");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
