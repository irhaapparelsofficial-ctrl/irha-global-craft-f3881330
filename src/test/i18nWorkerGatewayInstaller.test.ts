import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installI18nWorkerGateway } from "../../scripts/install-i18n-worker-gateway";

const temporaryDirectories: string[] = [];

function createFixture(
  canonicalMarkup = '<link data-irha-fallback-seo="true" href="https://irhaapparels.com/de/" rel="canonical" />',
): string {
  const distDir = mkdtempSync(path.join(tmpdir(), "irha-i18n-worker-"));
  temporaryDirectories.push(distDir);
  mkdirSync(path.join(distDir, "de"), { recursive: true });

  writeFileSync(
    path.join(distDir, "de", "index.html"),
    `<!doctype html><html lang="de" dir="ltr"><head>${canonicalMarkup}</head><body><main data-irha-german-gateway="published">Deutsch</main></body></html>`,
    "utf8",
  );

  writeFileSync(
    path.join(distDir, "_worker.js"),
    `const APEX_ORIGIN = "https://irhaapparels.com";
const STATIC_BUYER_ASSETS = new Map([
]);
const PRIVATE_ROUTE_PREFIXES = [
];
function canonicalPathRedirect(request, url, pathname) {
  return new Response(null, { status: 301 });
}
function legacyAliasTarget() { return null; }
function isStaticBuyerPath(pathname) { return STATIC_BUYER_ASSETS.has(pathname); }
async function staticBuyerResponse(request, env, pathname) {
  const assetPath = STATIC_BUYER_ASSETS.get(pathname);
  const assetResponse = await env.ASSETS.fetch(assetPath);
  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Location", \`\${APEX_ORIGIN}\${pathname}\`);
  return new Response(assetResponse.body, { status: 200, headers });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\\/+$/, "") || "/";
    const aliasTarget = legacyAliasTarget(pathname);
    if (aliasTarget) return new Response(null, { status: 301 });
    if (isStaticBuyerPath(pathname) && url.pathname !== pathname) {
      return canonicalPathRedirect(request, url, pathname);
    }
    if ((request.method === "GET" || request.method === "HEAD") && isStaticBuyerPath(pathname)) {
      return staticBuyerResponse(request, env, pathname);
    }
    return env.ASSETS.fetch(request);
  },
};`,
    "utf8",
  );

  return distDir;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("German locale gateway worker installer", () => {
  it("accepts the marked fallback canonical regardless of attribute order and installs idempotently", () => {
    const distDir = createFixture();

    installI18nWorkerGateway(distDir);
    installI18nWorkerGateway(distDir);

    const worker = readFileSync(path.join(distDir, "_worker.js"), "utf8");
    const asset = readFileSync(path.join(distDir, "_seo-static", "de--gateway.irha"), "utf8");

    expect(asset).toContain('data-irha-german-gateway="published"');
    expect(asset).toContain('data-irha-fallback-seo="true"');
    expect(worker).toContain('["/de", "/_seo-static/de--gateway.irha"]');
    expect(worker).toContain('["/de", "/de/"]');
    expect(worker).toContain("localeGatewayRedirect(request, url, localeGatewayTarget)");
    expect(worker).toContain("!LOCALE_GATEWAY_PATHS.has(pathname)");
    expect(worker).toContain("const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;");
    expect(worker.match(/const LOCALE_GATEWAY_PATHS = new Map\(\[/g)).toHaveLength(1);
    expect(worker.match(/function localeGatewayRedirect\(/g)).toHaveLength(1);
  });

  it("rejects duplicate canonical ownership", () => {
    const canonical = '<link data-irha-fallback-seo="true" rel="canonical" href="https://irhaapparels.com/de/" />';
    const distDir = createFixture(`${canonical}${canonical}`);

    expect(() => installI18nWorkerGateway(distDir)).toThrow(
      "German gateway HTML must contain exactly one canonical link, found 2",
    );
  });

  it("rejects a canonical that does not self-reference /de/", () => {
    const distDir = createFixture('<link rel="canonical" href="https://irhaapparels.com/" />');

    expect(() => installI18nWorkerGateway(distDir)).toThrow(
      "German gateway HTML is missing its /de/ self canonical",
    );
  });
});
