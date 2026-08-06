import { describe, expect, it } from "vitest";
import {
  claimOneTimeAssetRecovery,
  isRecoverableAssetError,
} from "./appRuntimeIncident";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("release-boundary asset recovery", () => {
  it.each([
    "Failed to fetch dynamically imported module: https://irhaapparels.com/assets/OldPage-abc.js",
    "'text/html' is not a valid JavaScript MIME type.",
    "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of \"text/html\".",
    "Importing a module script failed.",
  ])("recognizes recoverable stale-asset failures: %s", (message) => {
    expect(isRecoverableAssetError(new TypeError(message))).toBe(true);
  });

  it("allows one automatic reload per route inside the recovery window", () => {
    const storage = memoryStorage();
    const startedAt = 1_000_000;

    expect(claimOneTimeAssetRecovery("/products", startedAt, storage)).toBe(true);
    expect(claimOneTimeAssetRecovery("/products", startedAt + 1_000, storage)).toBe(false);
    expect(claimOneTimeAssetRecovery("/factory-video-call", startedAt + 1_000, storage)).toBe(true);
    expect(claimOneTimeAssetRecovery("/products", startedAt + 5 * 60 * 1000 + 1, storage)).toBe(true);
  });
});
