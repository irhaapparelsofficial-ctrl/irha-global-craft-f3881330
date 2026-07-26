import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("i18n routing and release contracts", () => {
  it("serves German, French and Dutch gateways directly without redirects", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain('path="/de" element={<Layout><GermanGateway /></Layout>}');
    expect(app).toContain('path="/de/" element={<Layout><GermanGateway /></Layout>}');
    for (const locale of ["fr", "nl"]) {
      expect(app).toContain(`path="/${locale}" element={<Layout><BuyerIntentLandingPage /></Layout>}`);
      expect(app).toContain(`path="/${locale}/" element={<Layout><BuyerIntentLandingPage /></Layout>}`);
      expect(app).toContain(`path="/${locale}/:buyerIntentSlug" element={<BuyerIntentLandingPage />}`);
    }
    expect(app).not.toContain('to="/fr/" replace');
    expect(app).not.toContain('to="/nl/" replace');
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
    expect(suggestion).toContain("getSuggestedLocale");
  });

  it("renders all four languages in desktop and mobile selectors", () => {
    const selector = readFileSync("src/components/LanguageSelector.tsx", "utf8");
    expect(selector).toContain('["en", "de", "fr", "nl"]');
    expect(selector).toContain('mobile && "flex-1"');
  });
});
