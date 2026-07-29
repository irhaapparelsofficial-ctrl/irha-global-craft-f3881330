import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isTransientCloudflareDeploymentNotFound,
  sitemapPaths,
} from "../../scripts/wait-for-cloudflare-preview-propagation";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("Cloudflare immutable preview propagation guard", () => {
  it("retries only the exact Cloudflare deployment-not-found response", () => {
    const cloudflareBody = "<!doctype html><html><head><title>Deployment Not Found</title></head><body><h1>Nothing is here yet</h1></body></html>";
    expect(isTransientCloudflareDeploymentNotFound(404, cloudflareBody)).toBe(true);
    expect(isTransientCloudflareDeploymentNotFound(200, cloudflareBody)).toBe(false);
    expect(isTransientCloudflareDeploymentNotFound(404, "<title>Page Not Found — Irha Apparels</title><h1>This page does not exist.</h1>")).toBe(false);
    expect(isTransientCloudflareDeploymentNotFound(404, "generic 404")).toBe(false);
  });

  it("derives a unique canonical route inventory and preserves locale gateway slashes", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://irhaapparels.com/</loc></url>
      <url><loc>https://irhaapparels.com/products/sportswear</loc></url>
      <url><loc>https://irhaapparels.com/products/sportswear/</loc></url>
      <url><loc>https://irhaapparels.com/de/</loc></url>
    </urlset>`;
    expect(sitemapPaths(xml)).toEqual(["/", "/de/", "/products/sportswear"]);
  });

  it("runs the full propagation gate before the strict preview route crawl", () => {
    const workflow = read(".github/workflows/cloudflare-pages-preview.yml");
    const propagation = workflow.indexOf("Wait for full immutable preview propagation");
    const crawl = workflow.indexOf("Run complete preview route parity crawl");
    expect(propagation).toBeGreaterThan(-1);
    expect(crawl).toBeGreaterThan(propagation);
    expect(workflow).toContain("npx tsx scripts/wait-for-cloudflare-preview-propagation.ts");
    expect(workflow).toContain("scripts/evaluate-preview-route-parity.ts");
  });

  it("derives preview sitemap acceptance from the immutable SEO manifest", () => {
    const evaluator = read("scripts/evaluate-preview-route-parity.ts");
    expect(evaluator).toContain('resolve("dist/seo-route-manifest.json")');
    expect(evaluator).toContain("report.inventory.sitemapUrlCount !== seoManifest.sitemapCount");
    expect(evaluator).toContain("authoritativeSitemapUrls.length !== seoManifest.sitemapCount");
    expect(evaluator).not.toContain("report.inventory.sitemapUrlCount !== 418");
    expect(evaluator).toContain("if (blockingCounts.critical || blockingCounts.high)");
  });
});
