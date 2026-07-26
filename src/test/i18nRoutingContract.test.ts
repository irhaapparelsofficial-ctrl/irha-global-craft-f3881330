import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("i18n routing and release contracts", () => {
  it("serves the German gateway directly without a browser-language redirect", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain('path="/de" element={<Layout><GermanGateway /></Layout>}');
    expect(app).toContain('path="/de/" element={<Layout><GermanGateway /></Layout>}');
    expect(app).not.toContain('path="/de" element={<Navigate');
    expect(app).not.toContain('to="/de/bavarian-wear" replace');
  });

  it("runs the deterministic i18n finalizer in production and development builds", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(manifest.scripts.build.match(/finalize-i18n-foundation\.ts/g)).toHaveLength(1);
    expect(manifest.scripts["build:dev"].match(/finalize-i18n-foundation\.ts/g)).toHaveLength(1);
  });

  it("does not implement automatic navigation in the language suggestion", () => {
    const suggestion = readFileSync("src/components/GermanLanguageSuggestion.tsx", "utf8");
    expect(suggestion).not.toMatch(/navigate\s*\(/);
    expect(suggestion).not.toMatch(/window\.location\s*=/);
    expect(suggestion).toContain("continueEnglish");
  });
});
