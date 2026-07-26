import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routes = [
  "/fr/", "/fr/fabricant-vetements", "/fr/fabricant-vetements-sport", "/fr/fabricant-vetements-cuir", "/fr/fabrication-marque-blanche",
  "/nl/", "/nl/kledingfabrikant", "/nl/sportkleding-fabrikant", "/nl/leren-kleding-fabrikant", "/nl/private-label-kleding",
];

describe("Wave 2 raw HTML and edge contracts", () => {
  it("generates runtime-free raw HTML with canonical, hreflang and localized schema", () => {
    const generator = readFileSync("scripts/generate-buyer-intent-route-shells.ts", "utf8");
    expect(generator).toContain('data-irha-static-buyer-shell="true"');
    expect(generator).toContain('rel="canonical"');
    expect(generator).toContain('hreflang="x-default"');
    expect(generator).toContain('"@type": "FAQPage"');
    expect(generator).toContain("Application JavaScript leaked into static buyer page");
  });

  it("locks sitemap output to 418 URLs and exact locale counts", () => {
    const finalizer = readFileSync("scripts/finalize-i18n-foundation.ts", "utf8");
    expect(finalizer).toContain("EXPECTED_SITEMAP_URLS = 418");
    expect(finalizer).toContain("{ de: 8, fr: 5, nl: 5 }");
    for (const route of routes) expect(readFileSync("src/lib/i18nFoundation.ts", "utf8")).toContain(`path: "${route}"`);
  });

  it("patches the Cloudflare worker for French and Dutch route prefixes", () => {
    const patch = readFileSync("scripts/patch-wave2-worker-routes.mjs", "utf8");
    expect(patch).toContain('"/fr/"');
    expect(patch).toContain('"/nl/"');
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(manifest.scripts.build).toContain("patch-wave2-worker-routes.mjs");
    expect(manifest.scripts["build:dev"]).toContain("patch-wave2-worker-routes.mjs");
  });
});
