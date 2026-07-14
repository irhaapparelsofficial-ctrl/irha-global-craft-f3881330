import { describe, expect, it } from "vitest";
import {
  createBuildManifest,
  extractMetaContent,
  injectSourceIdentityMetas,
  normalizeCommitSha,
  resolveSourceIdentity,
} from "../../../scripts/release-identity";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_C = "c".repeat(40);

describe("release source identity", () => {
  it("normalizes exact hexadecimal commit identities", () => {
    expect(normalizeCommitSha(`  ${SHA_A.toUpperCase()}  `)).toBe(SHA_A);
    expect(normalizeCommitSha("abc123")).toBeNull();
    expect(normalizeCommitSha("g".repeat(40))).toBeNull();
  });

  it("uses the first valid environment identity in deterministic priority order", () => {
    const identity = resolveSourceIdentity(
      {
        GITHUB_SHA: "invalid",
        CF_PAGES_COMMIT_SHA: SHA_B,
        VERCEL_GIT_COMMIT_SHA: SHA_C,
      },
      () => SHA_A,
    );

    expect(identity).toEqual({
      sourceCommit: SHA_B,
      sourceCommitShort: SHA_B.slice(0, 12),
      sourceIdentityState: "verified",
    });
  });

  it("falls back to the checked-out Git head without inventing an identity", () => {
    expect(resolveSourceIdentity({}, () => SHA_C)).toEqual({
      sourceCommit: SHA_C,
      sourceCommitShort: SHA_C.slice(0, 12),
      sourceIdentityState: "verified",
    });

    expect(resolveSourceIdentity({}, () => null)).toEqual({
      sourceCommit: "unverified",
      sourceCommitShort: "unverified",
      sourceIdentityState: "unverified",
    });
  });

  it("creates a deterministic manifest while preserving the existing release contract", () => {
    const identity = resolveSourceIdentity({ GITHUB_SHA: SHA_A }, () => null);
    const manifest = createBuildManifest(
      {
        release: "frontend-live-2026-07-13-r11",
        expected_origin: "https://irhaapparels.com",
      },
      identity,
      "2026-07-14T10:00:00.000Z",
    );

    expect(manifest).toEqual({
      release: "frontend-live-2026-07-13-r11",
      expected_origin: "https://irhaapparels.com",
      source_commit: SHA_A,
      source_commit_short: SHA_A.slice(0, 12),
      built_at: "2026-07-14T10:00:00.000Z",
      source_identity_state: "verified",
    });
  });

  it("injects one crisp identity pair into built HTML and replaces stale values", () => {
    const identity = resolveSourceIdentity({ GITHUB_SHA: SHA_B }, () => null);
    const source = `<!doctype html><html><head>\n<meta name="x-irha-source-commit" content="stale" />\n<meta name="x-irha-source-identity-state" content="unverified" />\n</head><body></body></html>`;
    const output = injectSourceIdentityMetas(source, identity);

    expect(extractMetaContent(output, "x-irha-source-commit")).toBe(SHA_B);
    expect(extractMetaContent(output, "x-irha-source-identity-state")).toBe("verified");
    expect(output.match(/name="x-irha-source-commit"/g)).toHaveLength(1);
    expect(output.match(/name="x-irha-source-identity-state"/g)).toHaveLength(1);
    expect(output).not.toContain("content=\"stale\"");
  });
});
