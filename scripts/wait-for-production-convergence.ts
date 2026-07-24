import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export type ProductionConvergenceState =
  | "verified_match"
  | "deployment_propagating"
  | "identity_missing"
  | "identity_unverified"
  | "invalid_build_json"
  | "http_error"
  | "request_error";

export type ProductionConvergenceObservation = {
  state: ProductionConvergenceState;
  sourceCommit: string;
  sourceIdentityState: string;
  detail: string;
};

export type ProductionConvergenceOptions = {
  origin: string;
  expectedSha: string;
  attempts?: number;
  intervalMs?: number;
  requestTimeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (delayMs: number) => Promise<void>;
  log?: (message: string) => void;
};

function normalizeSha(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  return SHA_PATTERN.test(normalized) ? normalized : "";
}

export function classifyBuildIdentity(
  payload: unknown,
  expectedSha: string,
): ProductionConvergenceObservation {
  const normalizedExpected = normalizeSha(expectedSha);
  if (!normalizedExpected) {
    throw new Error(`Invalid expected production SHA: ${expectedSha}`);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      state: "invalid_build_json",
      sourceCommit: "",
      sourceIdentityState: "",
      detail: "build.json did not contain a JSON object",
    };
  }

  const record = payload as Record<string, unknown>;
  const sourceCommit = normalizeSha(record.source_commit);
  const sourceIdentityState =
    typeof record.source_identity_state === "string"
      ? record.source_identity_state.trim().toLowerCase()
      : "";

  if (!sourceCommit) {
    return {
      state: "identity_missing",
      sourceCommit: "",
      sourceIdentityState,
      detail: "build.json is missing a valid source_commit",
    };
  }

  if (sourceIdentityState !== "verified") {
    return {
      state: "identity_unverified",
      sourceCommit,
      sourceIdentityState,
      detail: `build.json source_identity_state is ${sourceIdentityState || "missing"}`,
    };
  }

  if (sourceCommit !== normalizedExpected) {
    return {
      state: "deployment_propagating",
      sourceCommit,
      sourceIdentityState,
      detail: `production serves ${sourceCommit} instead of ${normalizedExpected}`,
    };
  }

  return {
    state: "verified_match",
    sourceCommit,
    sourceIdentityState,
    detail: `production serves exact verified commit ${normalizedExpected}`,
  };
}

export async function waitForProductionConvergence({
  origin,
  expectedSha,
  attempts = 45,
  intervalMs = 8_000,
  requestTimeoutMs = 35_000,
  fetchImpl = fetch,
  sleep = (delayMs) => new Promise((resolveSleep) => setTimeout(resolveSleep, delayMs)),
  log = console.log,
}: ProductionConvergenceOptions): Promise<ProductionConvergenceObservation> {
  const normalizedOrigin = origin.replace(/\/$/, "");
  const normalizedExpected = normalizeSha(expectedSha);
  if (!normalizedExpected) throw new Error(`Invalid expected production SHA: ${expectedSha}`);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 120) {
    throw new Error(`Invalid convergence attempt count: ${attempts}`);
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > 60_000) {
    throw new Error(`Invalid convergence interval: ${intervalMs}`);
  }

  let lastObservation: ProductionConvergenceObservation = {
    state: "request_error",
    sourceCommit: "",
    sourceIdentityState: "",
    detail: "production convergence was not checked",
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const cacheBust = `${normalizedExpected.slice(0, 12)}-${attempt}-${Date.now()}`;
    const url = `${normalizedOrigin}/build.json?route_parity_release_check=${cacheBust}`;

    try {
      const response = await fetchImpl(url, {
        redirect: "follow",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      const body = await response.text();
      if (response.status !== 200) {
        lastObservation = {
          state: "http_error",
          sourceCommit: "",
          sourceIdentityState: "",
          detail: `build.json returned HTTP ${response.status}: ${body.slice(0, 300)}`,
        };
      } else {
        try {
          lastObservation = classifyBuildIdentity(JSON.parse(body), normalizedExpected);
        } catch (error) {
          lastObservation = {
            state: "invalid_build_json",
            sourceCommit: "",
            sourceIdentityState: "",
            detail: `build.json could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
    } catch (error) {
      lastObservation = {
        state: "request_error",
        sourceCommit: "",
        sourceIdentityState: "",
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    log(
      `[production-convergence] attempt ${attempt}/${attempts} state=${lastObservation.state} ` +
        `source=${lastObservation.sourceCommit || "missing"} identity=${lastObservation.sourceIdentityState || "missing"} ` +
        `detail=${lastObservation.detail}`,
    );

    if (lastObservation.state === "verified_match") return lastObservation;
    if (attempt < attempts) await sleep(intervalMs);
  }

  throw new Error(
    `Production did not converge to ${normalizedExpected} after ${attempts} attempts. ` +
      `Last state=${lastObservation.state}; source=${lastObservation.sourceCommit || "missing"}; ` +
      `identity=${lastObservation.sourceIdentityState || "missing"}; detail=${lastObservation.detail}`,
  );
}

async function main() {
  const expectedSha = process.env.EXPECTED_SOURCE_SHA || process.env.SOURCE_SHA || "";
  const origin = process.env.CRAWL_ORIGIN || "https://irhaapparels.com";
  const attempts = Number(process.env.PRODUCTION_CONVERGENCE_ATTEMPTS || "45");
  const intervalMs = Number(process.env.PRODUCTION_CONVERGENCE_INTERVAL_MS || "8000");

  const observation = await waitForProductionConvergence({
    origin,
    expectedSha,
    attempts,
    intervalMs,
  });

  console.log(
    `Exact production convergence verified: source=${observation.sourceCommit} identity=${observation.sourceIdentityState}`,
  );
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (executedPath && import.meta.url === executedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
