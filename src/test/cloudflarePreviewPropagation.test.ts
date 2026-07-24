import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isTransientCloudflareDeploymentNotFound,
  sitemapPaths,
} from "../../scripts/wait-for-cloudflare-preview-propagation";

describe("Cloudflare immutable preview propagation guard", () => {
  it("retries only the exact Cloudflare deployment-not-found response", () => {
    const cloudflareBody = "<!doctype html><html><head><title>Deployment Not Found</title></head><body><h1>Nothing is here yet</h1></body></html>";
    expect(isTransientCloudflareDeploymentNotFound(404, cloudflareBody)).toBe(true);
    expect(isTransientCloudflareDeploymentNotFound(200, cloudflareBody)).toBe(false);
    expect(isTransientCloudflareDeploymentNotFound(404, "<title>Page Not Found — Irha Apparels</title><h1>This page does not exist.</h1>")).toBe(false);
    expect(isTransientCloudflareDeploymentNotFound(404, "generic 404")).toBe(false);
  });

  it("derives a unique canonical route inventory from the generated sitemap", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://irhaapparels.com/</loc></url>
      <url><loc>https://irhaapparels.com/products/sportswear</loc></url>
      <url><loc>https://irhaapparels.com/products/sportswear/</loc></url>
    </urlset>`;
    expect(sitemapPaths(xml)).toEqual(["/", "/products/sportswear"]);
  });

  it("runs the full propagation gate before the strict preview route crawl", () => {
    const workflow = readFileSync(resolve(".github/workflows/cloudflare-pages-preview.yml"), "utf8");
    const propagation = workflow.indexOf("Wait for full immutable preview propagation");
    const crawl = workflow.indexOf("Run complete preview route parity crawl");
    expect(propagation).toBeGreaterThan(-1);
    expect(crawl).toBeGreaterThan(propagation);
    expect(workflow).toContain("npx tsx scripts/wait-for-cloudflare-preview-propagation.ts");
    expect(workflow).toContain("scripts/evaluate-preview-route-parity.ts");
  });
});
