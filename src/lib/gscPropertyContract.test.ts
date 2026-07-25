import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/App.tsx", "utf8");
const monitorSource = readFileSync("src/pages/SeoIndexing.tsx", "utf8");
const inspectionFunctionSource = readFileSync("supabase/functions/gsc-inspect/index.ts", "utf8");
const sitemapFunctionSource = readFileSync("supabase/functions/sitemap-ping/index.ts", "utf8");

describe("Google Search Console inspection contract", () => {
  it("uses the verified domain property for canonical apex URLs", () => {
    expect(monitorSource).toContain('const SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(inspectionFunctionSource).toContain('const GSC_SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(inspectionFunctionSource).toContain('Deno.env.get("GSC_SITE_URL")');
    expect(inspectionFunctionSource).not.toContain('const DEFAULT_SITE_URL = "sc-domain:irhaapparels.com"');
    expect(inspectionFunctionSource).not.toContain('const SITE_URL = "https://www.irhaapparels.com/"');
  });

  it("submits the apex sitemap against the domain property", () => {
    expect(sitemapFunctionSource).toContain('const SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(sitemapFunctionSource).toContain('const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml"');
    expect(sitemapFunctionSource).not.toContain("https://www.irhaapparels.com/sitemap.xml");
    expect(sitemapFunctionSource).toContain('.eq("role", "admin")');
    expect(monitorSource).toContain('supabase.functions.invoke("sitemap-ping"');
    expect(monitorSource).toContain("Submit sitemap to Google");
  });

  it("keeps the monitor private and reachable for admins", () => {
    expect(appSource).toContain('const SeoIndexing = lazy(() => import("./pages/SeoIndexing"))');
    expect(appSource).toContain('<Route path="/seo-indexing" element={<SeoIndexing />} />');
    expect(appSource).not.toContain('<Route path="/seo-indexing" element={<Navigate to="/admin" replace />} />');
    expect(monitorSource).toContain('<meta name="robots" content="noindex,nofollow" />');
  });

  it("does not claim that the API can request general indexing", () => {
    expect(monitorSource).toContain("The API can inspect index status only");
    expect(monitorSource).toContain("Request indexing");
    expect(monitorSource).not.toContain("use the buttons below");
  });
});
