import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "@/integrations/supabase/ownerRuntime";

const RECOVERY_TTL_MS = 5 * 60 * 1000;
const RECOVERY_PREFIX = "irha:recoverable-asset-error:";
const INCIDENT_REPORT_URL = `${OWNER_SUPABASE_URL}/functions/v1/report-app-incident`;

export type RuntimeIncidentPayload = {
  incidentId: string;
  route: string;
  errorName: string;
  errorMessage?: string | null;
  componentStack?: string | null;
  userAgent?: string | null;
  sourceSha?: string | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function sanitizeRuntimeErrorMessage(value: unknown, max = 1000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[A-Za-z0-9_.-]{32,}/g, "[redacted]")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function isRecoverableAssetError(error: Pick<Error, "name" | "message">): boolean {
  const text = `${error.name} ${error.message}`.toLowerCase();
  return [
    "chunkloaderror",
    "loading chunk",
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed",
    "failed to load module script",
    "is not a valid javascript mime type",
    "expected a javascript-or-wasm module script",
    "mime type of \"text/html\"",
    "mime type: text/html",
    "disallowed mime type",
  ].some((needle) => text.includes(needle));
}

export function claimOneTimeAssetRecovery(
  route: string,
  now = Date.now(),
  storage?: StorageLike,
): boolean {
  try {
    const target = storage ?? window.sessionStorage;
    const key = `${RECOVERY_PREFIX}${route || "/"}`;
    const stored = target.getItem(key);
    const previous = stored === null ? Number.NaN : Number(stored);
    if (Number.isFinite(previous) && now - previous < RECOVERY_TTL_MS) return false;
    target.setItem(key, String(now));
    return true;
  } catch {
    return false;
  }
}

export async function reportRuntimeIncident(payload: RuntimeIncidentPayload): Promise<boolean> {
  try {
    const response = await fetch(INCIDENT_REPORT_URL, {
      method: "POST",
      headers: {
        apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        _incident_id: payload.incidentId,
        _route: payload.route || "/",
        _error_name: payload.errorName || "Error",
        _error_message: sanitizeRuntimeErrorMessage(payload.errorMessage),
        _component_stack: sanitizeRuntimeErrorMessage(payload.componentStack, 4000),
        _user_agent: sanitizeRuntimeErrorMessage(payload.userAgent, 500),
        _source_sha: payload.sourceSha ?? null,
      }),
    });
    if (!response.ok) return false;
    return (await response.json().catch(() => false)) === true;
  } catch {
    return false;
  }
}
