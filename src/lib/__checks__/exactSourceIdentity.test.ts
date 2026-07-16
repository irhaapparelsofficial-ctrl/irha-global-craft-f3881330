import { describe, expect, it } from "vitest";
import { preferExplicitSourceIdentity } from "../../../scripts/exact-source-identity";
import { resolveSourceIdentity } from "../../../scripts/release-identity";

const OLD_EVENT_SHA = "a".repeat(40);
const CURRENT_MAIN_SHA = "b".repeat(40);
const FALLBACK_GIT_SHA = "c".repeat(40);

describe("exact source release identity", () => {
  it("prefers SOURCE_SHA over a stale GitHub event SHA", () => {
    const env = preferExplicitSourceIdentity({
      GITHUB_SHA: OLD_EVENT_SHA,
      SOURCE_SHA: CURRENT_MAIN_SHA,
    });

    expect(resolveSourceIdentity(env, () => FALLBACK_GIT_SHA).sourceCommit).toBe(CURRENT_MAIN_SHA);
    expect(env.GITHUB_SHA).toBeUndefined();
    expect(env.SOURCE_COMMIT_SHA).toBe(CURRENT_MAIN_SHA);
  });

  it("prefers SOURCE_COMMIT_SHA over provider event identities", () => {
    const env = preferExplicitSourceIdentity({
      GITHUB_SHA: OLD_EVENT_SHA,
      CF_PAGES_COMMIT_SHA: OLD_EVENT_SHA,
      SOURCE_COMMIT_SHA: CURRENT_MAIN_SHA,
    });

    expect(resolveSourceIdentity(env, () => FALLBACK_GIT_SHA).sourceCommit).toBe(CURRENT_MAIN_SHA);
    expect(env.GITHUB_SHA).toBeUndefined();
    expect(env.CF_PAGES_COMMIT_SHA).toBeUndefined();
  });

  it("preserves the normal provider priority when no exact source was supplied", () => {
    const original = {
      GITHUB_SHA: OLD_EVENT_SHA,
      SOURCE_SHA: "invalid",
    };
    const env = preferExplicitSourceIdentity(original);

    expect(env).toBe(original);
    expect(resolveSourceIdentity(env, () => FALLBACK_GIT_SHA).sourceCommit).toBe(OLD_EVENT_SHA);
  });
});
