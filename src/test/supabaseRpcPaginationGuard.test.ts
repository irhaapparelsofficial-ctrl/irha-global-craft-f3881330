import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("Supabase set-returning RPC pagination guard", () => {
  it("keeps the pagination preload scoped away from npm install and TypeScript", () => {
    const packageJson = read("package.json");
    const previewWorkflow = read(".github/workflows/cloudflare-pages-preview.yml");
    const productionWorkflow = read(".github/workflows/production-route-parity.yml");
    const scopedCommand = "NODE_OPTIONS=--import=./scripts/patch-supabase-rpc-pagination.mjs";

    expect(existsSync(resolve(".npmrc"))).toBe(false);
    expect(packageJson).toContain(`${scopedCommand} npx tsx scripts/generate-buyer-ready-redirects.ts`);
    expect(previewWorkflow).toContain(`${scopedCommand} npx tsx scripts/crawl-production-route-parity.ts`);
    expect(productionWorkflow).toContain(`${scopedCommand} npx tsx scripts/crawl-production-route-parity.ts`);
  });

  it("keeps the runtime Helmet import declared in both dependency manifests", () => {
    const packageJson = JSON.parse(read("package.json")) as { dependencies?: Record<string, string> };
    const packageLock = JSON.parse(read("package-lock.json")) as {
      packages?: Record<string, { dependencies?: Record<string, string> }>;
    };

    expect(packageJson.dependencies?.["react-helmet-async"]).toBe("^3.0.0");
    expect(packageLock.packages?.[""]?.dependencies?.["react-helmet-async"]).toBe("^3.0.0");
  });

  it("translates ignored Range headers into PostgREST limit/offset queries", () => {
    const shim = read("scripts/patch-supabase-rpc-pagination.mjs");

    expect(shim).toContain(
      'const RPC_PATH = "/rest/v1/rpc/get_public_legacy_redirects"',
    );
    expect(shim).toContain('url.searchParams.set("limit", String(range.limit))');
    expect(shim).toContain('url.searchParams.set("offset", String(range.offset))');
    expect(shim).toContain('headers.delete("range")');
  });

  it("fails closed on repeated pages or runaway pagination", () => {
    const shim = read("scripts/patch-supabase-rpc-pagination.mjs");

    expect(shim).toContain("const MAX_PAGES = 100");
    expect(shim).toContain("pagination exceeded");
    expect(shim).toContain("repeated page data");
    expect(shim).toContain("response.clone().json()");
    expect(shim).not.toContain('return new Response("[]")');
  });
});
