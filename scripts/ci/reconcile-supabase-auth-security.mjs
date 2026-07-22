import { writeFileSync } from "node:fs";

const projectId = (process.env.SUPABASE_PROJECT_ID || "").trim();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const sourceSha = (process.env.SOURCE_SHA || "").trim();
const evidencePath = process.env.SUPABASE_AUTH_EVIDENCE_PATH || "/tmp/supabase-auth-security-evidence.json";
const managementApi = "https://api.supabase.com";

class ManagementApiError extends Error {
  constructor(method, status, payload) {
    super(`Supabase Auth config ${method} failed (${status})`);
    this.name = "ManagementApiError";
    this.method = method;
    this.status = status;
    this.payload = payload;
  }
}

function required(value, label) {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

function redactText(value) {
  return String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/(access[_-]?token|refresh[_-]?token|client[_-]?secret|smtp[_-]?pass|password)\s*[:=]\s*[^,}\s]+/gi, "$1=[REDACTED]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[REDACTED]")
    .slice(0, 800);
}

function safeErrorPayload(payload) {
  if (!payload || typeof payload !== "object") return redactText(payload);
  const safe = {};
  for (const key of ["message", "error", "error_code", "code", "hint", "detail"]) {
    if (payload[key] !== undefined && payload[key] !== null) {
      safe[key] = redactText(payload[key]);
    }
  }
  if (Object.keys(safe).length === 0) safe.message = "Management API returned a non-public error payload";
  return safe;
}

function classifyError(error) {
  if (!(error instanceof ManagementApiError)) {
    return { category: "runtime_error", blocked_reason: null };
  }

  const safePayload = safeErrorPayload(error.payload);
  const text = `${error.message} ${JSON.stringify(safePayload)}`.toLowerCase();
  const planRequired =
    error.status === 402 ||
    (error.status === 403 && /(pro plan|paid plan|upgrade|billing|not available on.*plan|feature.*plan)/i.test(text)) ||
    /(pro plan|paid plan|upgrade.*plan|feature.*available.*plan)/i.test(text);

  if (planRequired) return { category: "external_plan_limit", blocked_reason: "supabase_pro_plan_required" };
  if (error.status === 401 || error.status === 403) {
    return { category: "management_api_permission", blocked_reason: null };
  }
  if (error.status === 400 && /(password_hibp_enabled|unknown field|additional propert|invalid field)/i.test(text)) {
    return { category: "management_api_contract", blocked_reason: null };
  }
  return { category: "management_api_error", blocked_reason: null };
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
    payload = { message: redactText(text) };
  }
  if (!response.ok) throw new ManagementApiError(method, response.status, payload);
  return payload;
}

function publicEvidence(config) {
  return {
    password_hibp_enabled: config?.password_hibp_enabled === true,
    password_min_length: Number.isFinite(config?.password_min_length) ? config.password_min_length : null,
  };
}

function writeEvidence(value) {
  writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  required(projectId, "SUPABASE_PROJECT_ID");
  required(accessToken, "SUPABASE_ACCESS_TOKEN");
  required(sourceSha, "SOURCE_SHA");

  let before = null;
  try {
    before = await authConfig();
    let changed = false;

    if (before?.password_hibp_enabled !== true) {
      await authConfig("PATCH", { password_hibp_enabled: true });
      changed = true;
    }

    const after = await authConfig();
    if (after?.password_hibp_enabled !== true) {
      throw new Error("Supabase leaked-password protection was not enabled after reconciliation");
    }

    writeEvidence({
      schema_version: 2,
      project_id: projectId,
      source_sha: sourceSha,
      reconciled_at: new Date().toISOString(),
      changed,
      before: publicEvidence(before),
      after: publicEvidence(after),
      parity: "verified",
      category: "enabled",
      blocked_reason: null,
    });
    console.log(`AUTH_SECURITY_RESULT=verified changed=${changed}`);
  } catch (error) {
    const classification = classifyError(error);
    const status = error instanceof ManagementApiError ? error.status : null;
    const method = error instanceof ManagementApiError ? error.method : null;
    const safePayload = error instanceof ManagementApiError ? safeErrorPayload(error.payload) : null;
    const safeMessage = redactText(error instanceof Error ? error.message : error);
    const parity = classification.blocked_reason ? "blocked" : "failed";

    writeEvidence({
      schema_version: 2,
      project_id: projectId,
      source_sha: sourceSha,
      reconciled_at: new Date().toISOString(),
      changed: false,
      before: before ? publicEvidence(before) : null,
      after: null,
      parity,
      category: classification.category,
      blocked_reason: classification.blocked_reason,
      error: {
        method,
        status,
        message: safeMessage,
        payload: safePayload,
      },
    });

    console.error(`AUTH_SECURITY_RESULT=${parity} category=${classification.category} status=${status ?? "n/a"} message=${safeMessage}`);
    process.exitCode = classification.blocked_reason ? 2 : 1;
  }
}

await main();
