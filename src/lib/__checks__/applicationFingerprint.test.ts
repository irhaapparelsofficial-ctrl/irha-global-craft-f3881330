import { describe, expect, it } from "vitest";
import {
  APPLICATION_FINGERPRINT_ALGORITHM,
  APPLICATION_FINGERPRINT_SCOPE,
  computeApplicationFingerprintFromEntries,
  isApplicationFingerprintPath,
} from "../../../scripts/application-fingerprint";

describe("compiled application fingerprint", () => {
  it("uses the documented contract", () => {
    expect(APPLICATION_FINGERPRINT_ALGORITHM).toBe("sha256");
    expect(APPLICATION_FINGERPRINT_SCOPE).toBe("compiled-assets-js-css-wasm");
  });

  it("selects compiled files only", () => {
    expect(isApplicationFingerprintPath("assets/index.js")).toBe(true);
    expect(isApplicationFingerprintPath("assets/styles.css")).toBe(true);
    expect(isApplicationFingerprintPath("assets/module.wasm")).toBe(true);
    expect(isApplicationFingerprintPath("assets/photo.webp")).toBe(false);
    expect(isApplicationFingerprintPath("media/product.webp")).toBe(false);
    expect(isApplicationFingerprintPath("index.html")).toBe(false);
  });

  it("ignores host shell and public media differences", () => {
    const first = computeApplicationFingerprintFromEntries([
      { path: "assets/index.js", content: "runtime" },
      { path: "assets/index.css", content: "styles" },
      { path: "media/product.webp", content: "first-media" },
      { path: "index.html", content: "first-shell" },
    ]);
    const second = computeApplicationFingerprintFromEntries([
      { path: "index.html", content: "second-shell" },
      { path: "media/product.webp", content: "second-media" },
      { path: "assets/index.css", content: "styles" },
      { path: "assets/index.js", content: "runtime" },
    ]);

    expect(second).toBe(first);
  });

  it("changes when compiled code or styles change", () => {
    const original = computeApplicationFingerprintFromEntries([
      { path: "assets/index.js", content: "one" },
      { path: "assets/index.css", content: "styles" },
    ]);
    const codeChanged = computeApplicationFingerprintFromEntries([
      { path: "assets/index.js", content: "two" },
      { path: "assets/index.css", content: "styles" },
    ]);
    const stylesChanged = computeApplicationFingerprintFromEntries([
      { path: "assets/index.js", content: "one" },
      { path: "assets/index.css", content: "new-styles" },
    ]);

    expect(codeChanged).not.toBe(original);
    expect(stylesChanged).not.toBe(original);
  });
});
