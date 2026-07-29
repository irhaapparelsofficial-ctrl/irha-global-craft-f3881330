import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceFiles = [
  "scripts/enrich-generic-static-route-shells.mjs",
  "scripts/finalize-image-seo.mjs",
  "scripts/verify-built-crawler-shell.mjs",
  "scripts/verify-built-image-seo.mjs",
  "scripts/verify-route-content-fidelity.mjs",
  "src/test/routeContentStaticFidelity.test.ts",
] as const;

describe("temporary IA-B2B-E002 source export", () => {
  it("emits the exact route-invariant files for focused patching", () => {
    for (const file of sourceFiles) {
      const encoded = Buffer.from(readFileSync(file, "utf8"), "utf8").toString("base64");
      console.log(`IA_B2B_SOURCE_BEGIN:${file}:${encoded}:IA_B2B_SOURCE_END`);
    }
    expect(sourceFiles).toHaveLength(6);
  });
});
