import { describe, expect, it } from "vitest";
import {
  BUILD_FINGERPRINT_ALGORITHM,
  computeBuildFingerprintFromEntries,
  createBuildManifest,
  extractMetaContent,
  injectSourceIdentityMetas,
  normalizeBuildFingerprint,
  normalizeCommitSha,
  resolveSourceIdentity,
} from "../../../scripts/release-identity";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_C = "c".repeat(40);
const FINGERPRINT_A = "d".repeat(64);

describe("release source identity", () => {
  it("normalizes exact hexadecimal commit and fingerprint identities", () => {
    expect(normalizeCommitSha(`  ${SHA_A.toUpperCase()}  `)).toBe(SHA_A);
    expect(normalizeCommitSha("abc123")).toBeNull();
    expect(normalizeCommitSha("g".repeat(40))).toBeNull();
    expect(normalizeBuildFingerprint(FINGERPRINT_A.toUpperCase())).toBe(FINGERPRINT_A);
    expect(normalizeBuildFingerprint("abc123")).toBeNull();
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

  it("creates a manifest preserving the release contract and deterministic fingerprint", () => {
    const identity = resolveSourceIdentity({ GITHUB_SHA: SHA_A }, () => null);
    const manifest = createBuildManifest(
      {
        release: "frontend-live-2026-07-13-r11",
        expected_origin: "https://irhaapparels.com",
      },
      identity,
      FINGERPRINT_A,
      "2026-07-14T10:00:00.000Z",
    );

    expect(manifest).toEqual({
      release: "frontend-live-2026-07-13-r11",
      expected_origin: "https://irhaapparels.com",
      source_commit: SHA_A,
      source_commit_short: SHA_A.slice(0, 12),
      built_at: "2026-07-14T10:00:00.000Z",
      source_identity_state: "verified",
      build_fingerprint: FINGERPRINT_A,
      build_fingerprint_algorithm: BUILD_FINGERPRINT_ALGORITHM,
    });
  });

  it("injects one identity and fingerprint set into built HTML", () => {
    const identity = resolveSourceIdentity({ GITHUB_SHA: SHA_B }, () => null);
    const source = `<!doctype html><html><head>\n<meta name="x-irha-source-commit" content="stale" />\n<meta name="x-irha-source-identity-state" content="unverified" />\n<meta name="x-irha-build-fingerprint" content="stale" />\n</head><body></body></html>`;
    const output = injectSourceIdentityMetas(source, identity, FINGERPRINT_A);

    expect(extractMetaContent(output, "x-irha-source-commit")).toBe(SHA_B);
    expect(extractMetaContent(output, "x-irha-source-identity-state")).toBe("verified");
    expect(extractMetaContent(output, "x-irha-build-fingerprint")).toBe(FINGERPRINT_A);
    expect(extractMetaContent(output, "x-irha-build-fingerprint-algorithm")).toBe("sha256");
    expect(output.match(/name="x-irha-source-commit"/g)).toHaveLength(1);
    expect(output.match(/name="x-irha-source-identity-state"/g)).toHaveLength(1);
    expect(output.match(/name="x-irha-build-fingerprint"/g)).toHaveLength(1);
    expect(output).not.toContain("content=\"stale\"");
  });

  it("produces the same fingerprint across hosts despite identity metadata and file order", () => {
    const htmlA = `<!doctype html><html><head><meta name="x-irha-source-commit" content="${SHA_A}" /><meta name="x-irha-source-identity-state" content="verified" /></head><body>Irha</body></html>`;
    const htmlB = `<!doctype html><html><head><meta name="x-irha-source-commit" content="unverified" /><meta name="x-irha-source-identity-state" content="unverified" /><meta name="x-irha-build-fingerprint" content="${FINGERPRINT_A}" /><meta name="x-irha-build-fingerprint-algorithm" content="sha256" /></head><body>Irha</body></html>`;

    const first = computeBuildFingerprintFromEntries([
      { path: "assets/app.js", content: "console.log('irha')" },
      { path: "index.html", content: htmlA },
      { path: "build.json", content: '{"built_at":"host-a"}' },
    ]);
    const second = computeBuildFingerprintFromEntries([
      { path: "build.json", content: '{"built_at":"host-b"}' },
      { path: "index.html", content: htmlB },
      { path: "assets/app.js", content: "console.log('irha')" },
    ]);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the fingerprint when deployable content or its path changes", () => {
    const original = computeBuildFingerprintFromEntries([
      { path: "assets/app.js", content: "one" },
      { path: "index.html", content: "<html><head></head><body>Irha</body></html>" },
    ]);
    const contentChanged = computeBuildFingerprintFromEntries([
      { path: "assets/app.js", content: "two" },
      { path: "index.html", content: "<html><head></head><body>Irha</body></html>" },
    ]);
    const pathChanged = computeBuildFingerprintFromEntries([
      { path: "assets/main.js", content: "one" },
      { path: "index.html", content: "<html><head></head><body>Irha</body></html>" },
    ]);

    expect(contentChanged).not.toBe(original);
    expect(pathChanged).not.toBe(original);
  });
});
