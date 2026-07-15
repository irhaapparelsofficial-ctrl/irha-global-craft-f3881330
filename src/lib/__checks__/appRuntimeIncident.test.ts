import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  claimOneTimeAssetRecovery,
  isRecoverableAssetError,
  sanitizeRuntimeErrorMessage,
} from "../appRuntimeIncident";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("runtime incident safety", () => {
  it("redacts long token-like values before reporting", () => {
    const secret = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJK";
    const message = sanitizeRuntimeErrorMessage(`Chunk failed ${secret}`);
    expect(message).toBe("Chunk failed [redacted]");
    expect(message).not.toContain(secret);
  });

  it("recognizes stale or unavailable dynamic application assets", () => {
    expect(isRecoverableAssetError({
      name: "ChunkLoadError",
      message: "Loading chunk 42 failed",
    })).toBe(true);
    expect(isRecoverableAssetError({
      name: "TypeError",
      message: "Failed to fetch dynamically imported module",
    })).toBe(true);
    expect(isRecoverableAssetError({
      name: "TypeError",
      message: "Cannot read properties of undefined",
    })).toBe(false);
  });

  it("allows only one automatic reload during the recovery window", () => {
    const storage = new MemoryStorage();
    expect(claimOneTimeAssetRecovery("/products", 1_000, storage)).toBe(true);
    expect(claimOneTimeAssetRecovery("/products", 2_000, storage)).toBe(false);
    expect(claimOneTimeAssetRecovery("/products", 1_000 + 5 * 60 * 1000, storage)).toBe(true);
  });
});

describe("runtime incident integration contract", () => {
  it("wires the app boundary to the public reporter", () => {
    const boundary = readFileSync("src/components/AppErrorBoundary.tsx", "utf8");
    expect(boundary).toContain("reportRuntimeIncident");
    expect(boundary).toContain("claimOneTimeAssetRecovery");
    expect(boundary).toContain("Copy ref");
  });

  it("keeps incident rows private and the public reporter rate limited", () => {
    const migration = readFileSync(
      "supabase/migrations/20260716020000_add_public_app_runtime_incident_reporting.sql",
      "utf8",
    );
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON TABLE public.app_runtime_incidents FROM anon, authenticated");
    expect(migration).toContain("'report_app_error', 900, 3");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.record_public_app_incident");
    expect(migration).toContain("'system'");
  });
});
