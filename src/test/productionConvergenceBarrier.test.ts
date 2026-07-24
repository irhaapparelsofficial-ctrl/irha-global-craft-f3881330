import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyBuildIdentity,
  waitForProductionConvergence,
} from "../../scripts/wait-for-production-convergence";

const EXPECTED_SHA = "9407644564af227eab0ea61e00d5e8c97a436efb";
const PREVIOUS_SHA = "b5bf60a06a7fd15cb9d97d4991e11166c4da75da";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("production convergence barrier", () => {
  it("accepts only the exact verified production commit", () => {
    expect(
      classifyBuildIdentity(
        {
          source_commit: EXPECTED_SHA,
          source_identity_state: "verified",
        },
        EXPECTED_SHA,
      ),
    ).toMatchObject({
      state: "verified_match",
      sourceCommit: EXPECTED_SHA,
      sourceIdentityState: "verified",
    });
  });

  it("classifies an older verified deployment as still propagating", () => {
    expect(
      classifyBuildIdentity(
        {
          source_commit: PREVIOUS_SHA,
          source_identity_state: "verified",
        },
        EXPECTED_SHA,
      ),
    ).toMatchObject({
      state: "deployment_propagating",
      sourceCommit: PREVIOUS_SHA,
      sourceIdentityState: "verified",
    });
  });

  it("rejects missing or unverified build identity", () => {
    expect(classifyBuildIdentity({}, EXPECTED_SHA).state).toBe("identity_missing");
    expect(
      classifyBuildIdentity(
        {
          source_commit: EXPECTED_SHA,
          source_identity_state: "unverified",
        },
        EXPECTED_SHA,
      ).state,
    ).toBe("identity_unverified");
  });

  it("waits through an older deployment and succeeds only after exact convergence", async () => {
    const responses = [
      jsonResponse({ source_commit: PREVIOUS_SHA, source_identity_state: "verified" }),
      jsonResponse({ source_commit: EXPECTED_SHA, source_identity_state: "verified" }),
    ];
    const fetchImpl = vi.fn(async () => responses.shift() ?? responses.at(-1)!);
    const sleep = vi.fn(async () => undefined);

    const result = await waitForProductionConvergence({
      origin: "https://irhaapparels.com",
      expectedSha: EXPECTED_SHA,
      attempts: 2,
      intervalMs: 0,
      fetchImpl: fetchImpl as typeof fetch,
      sleep,
      log: () => undefined,
    });

    expect(result.state).toBe("verified_match");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("accepts the authorized 180-attempt release window and rejects larger values", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ source_commit: EXPECTED_SHA, source_identity_state: "verified" }),
    );

    await expect(
      waitForProductionConvergence({
        origin: "https://irhaapparels.com",
        expectedSha: EXPECTED_SHA,
        attempts: 180,
        intervalMs: 0,
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async () => undefined,
        log: () => undefined,
      }),
    ).resolves.toMatchObject({ state: "verified_match", sourceCommit: EXPECTED_SHA });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await expect(
      waitForProductionConvergence({
        origin: "https://irhaapparels.com",
        expectedSha: EXPECTED_SHA,
        attempts: 181,
        intervalMs: 0,
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async () => undefined,
        log: () => undefined,
      }),
    ).rejects.toThrow("Invalid convergence attempt count: 181");
  });

  it("fails closed when production never reaches the triggering commit", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ source_commit: PREVIOUS_SHA, source_identity_state: "verified" }),
    );

    await expect(
      waitForProductionConvergence({
        origin: "https://irhaapparels.com",
        expectedSha: EXPECTED_SHA,
        attempts: 2,
        intervalMs: 0,
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async () => undefined,
        log: () => undefined,
      }),
    ).rejects.toThrow(`Production did not converge to ${EXPECTED_SHA}`);
  });

  it("keeps convergence and generated redirect parity ahead of the live crawl", () => {
    const workflow = readFileSync(
      resolve(".github/workflows/production-route-parity.yml"),
      "utf8",
    );
    const barrier = workflow.indexOf("- name: Wait for exact production convergence");
    const redirectStep = workflow.indexOf(
      "- name: Generate exact production catalogue and redirect manifests",
      barrier,
    );
    const redirectGeneration = workflow.indexOf(
      "npx tsx scripts/generate-buyer-ready-redirects.ts",
      redirectStep,
    );
    const crawl = workflow.indexOf("- name: Run complete live production crawl", redirectGeneration);

    expect(barrier).toBeGreaterThan(-1);
    expect(redirectStep).toBeGreaterThan(barrier);
    expect(redirectGeneration).toBeGreaterThan(redirectStep);
    expect(crawl).toBeGreaterThan(redirectGeneration);
    expect(workflow).toContain("EXPECTED_SOURCE_SHA");
    expect(workflow).toContain("PRODUCTION_CONVERGENCE_ATTEMPTS");
  });

  it("allows enough time for main Quality Gate and authorized Cloudflare deployment", () => {
    const workflow = readFileSync(
      resolve(".github/workflows/production-route-parity.yml"),
      "utf8",
    );
    const attempts = Number(
      workflow.match(/PRODUCTION_CONVERGENCE_ATTEMPTS:\s*"(\d+)"/)?.[1] ?? "0",
    );
    const intervalMs = Number(
      workflow.match(/PRODUCTION_CONVERGENCE_INTERVAL_MS:\s*"(\d+)"/)?.[1] ?? "0",
    );
    const totalWindowMs = attempts * intervalMs;

    expect(attempts).toBeGreaterThanOrEqual(180);
    expect(intervalMs).toBeGreaterThanOrEqual(8_000);
    expect(totalWindowMs).toBeGreaterThanOrEqual(24 * 60 * 1_000);
    expect(totalWindowMs).toBeLessThan(60 * 60 * 1_000);
  });
});
