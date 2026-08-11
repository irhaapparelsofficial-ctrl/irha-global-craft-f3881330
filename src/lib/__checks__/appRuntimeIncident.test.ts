import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimOneTimeAssetRecovery,
  isRecoverableAssetError,
  reportRuntimeIncident,
  sanitizeRuntimeErrorMessage,
} from "../appRuntimeIncident";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

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
      name: "SyntaxError",
      message: "Importing binding name 'r' is not found.",
    })).toBe(true);
    expect(isRecoverableAssetError({
      name: "SyntaxError",
      message: "The requested module does not provide an export named 'r'",
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

  it("reports through the public Edge gateway without loading the app client", async () => {
    const secret = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJK";
    const mockedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        "https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/report-app-incident",
      );
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toMatch(/^sb_publishable_/);
      expect(headers.get("authorization")).toMatch(/^Bearer sb_publishable_/);
      expect(headers.get("content-type")).toBe("application/json");

      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body._incident_id).toBe("IRHA-QATEST02-ABC123");
      expect(body._route).toBe("/products");
      expect(body._error_message).toBe("Chunk failed [redacted]");
      expect(String(init?.body)).not.toContain(secret);
      return new Response("true", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = mockedFetch as unknown as typeof fetch;

    await expect(reportRuntimeIncident({
      incidentId: "IRHA-QATEST02-ABC123",
      route: "/products",
      errorName: "ChunkLoadError",
      errorMessage: `Chunk failed ${secret}`,
    })).resolves.toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

describe("runtime incident integration contract", () => {
  it("wires the app boundary to the public reporter", () => {
    const boundary = readFileSync("src/components/AppErrorBoundary.tsx", "utf8");
    const reporter = readFileSync("src/lib/appRuntimeIncident.ts", "utf8");
    expect(boundary).toContain("reportRuntimeIncident");
    expect(boundary).toContain("claimOneTimeAssetRecovery");
    expect(boundary).toContain("Copy ref");
    expect(reporter).toContain("/functions/v1/report-app-incident");
    expect(reporter).not.toContain("/rest/v1/rpc/record_public_app_incident");
    expect(reporter).not.toContain('import("@/integrations/supabase/client")');
    expect(reporter).toContain("authorization");
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
    const serviceGrant = readFileSync(
      "supabase/migrations/20260716030000_allow_service_role_runtime_incident_reporting.sql",
      "utf8",
    );
    expect(serviceGrant).toContain("TO anon, authenticated, service_role");
    expect(migration).toContain("'system'");
  });
});
