import { writeFileSync } from "node:fs";

const projectId = (process.env.SUPABASE_PROJECT_ID || "").trim();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const sourceSha = (process.env.SOURCE_SHA || "").trim();
const evidencePath = process.env.SUPABASE_AUTH_EVIDENCE_PATH || "/tmp/supabase-auth-security-evidence.json";
const managementApi = "https://api.supabase.com";

function required(value, label) {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

async function authConfig(method = "GET", body) {
  const response = await fetch(`${managementApi}/v1/projects/${projectId}/config/auth`, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text.slice(0, 1000) };
  }
  if (!response.ok) {
    throw new Error(`Supabase Auth config ${method} failed (${response.status}): ${JSON.stringify(payload).slice(0, 2000)}`);
  }
  return payload;
}

function publicEvidence(config) {
  return {
    password_hibp_enabled: config?.password_hibp_enabled === true,
    password_min_length: Number.isFinite(config?.password_min_length) ? config.password_min_length : null,
  };
}

async function main() {
  required(projectId, "SUPABASE_PROJECT_ID");
  required(accessToken, "SUPABASE_ACCESS_TOKEN");
  required(sourceSha, "SOURCE_SHA");

  const before = await authConfig();
  let changed = false;

  if (before?.password_hibp_enabled !== true) {
    await authConfig("PATCH", { password_hibp_enabled: true });
    changed = true;
  }

  const after = await authConfig();
  if (after?.password_hibp_enabled !== true) {
    throw new Error("Supabase leaked-password protection was not enabled after reconciliation");
  }

  const evidence = {
    schema_version: 1,
    project_id: projectId,
    source_sha: sourceSha,
    reconciled_at: new Date().toISOString(),
    changed,
    before: publicEvidence(before),
    after: publicEvidence(after),
    parity: "verified",
  };
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Supabase Auth security parity verified: leaked-password protection enabled; changed=${changed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
