import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const quality = readFileSync(resolve(process.cwd(), ".github/workflows/quality.yml"), "utf8");

describe("exact-main Quality coverage", () => {
  it("validates every main push so recovery can always obtain an exact artifact", () => {
    const pushBlock = quality.slice(quality.indexOf("  push:"), quality.indexOf("  pull_request:"));
    expect(pushBlock).toContain("branches: [main]");
    expect(pushBlock).not.toContain("paths-ignore");
  });

  it("still skips documentation-only pull request validation", () => {
    const pullRequestBlock = quality.slice(quality.indexOf("  pull_request:"), quality.indexOf("  workflow_dispatch:"));
    expect(pullRequestBlock).toContain("paths-ignore:");
    expect(pullRequestBlock).toContain('"docs/**"');
    expect(pullRequestBlock).toContain('"**/*.md"');
  });
});
