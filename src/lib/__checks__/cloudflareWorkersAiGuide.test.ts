import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

function runConfigPreparation(filename: string, source: string) {
  const directory = mkdtempSync(join(tmpdir(), "irha-workers-ai-config-"));
  const path = join(directory, filename);
  writeFileSync(path, source, "utf8");
  try {
    execFileSync(process.execPath, [resolve(root, "scripts/prepare-cloudflare-ai-pages-config.mjs"), path], {
      cwd: root,
      stdio: "pipe",
    });
    return readFileSync(path, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("Cloudflare Workers AI guide", () => {
  it("uses a secure same-origin AI route with context and repetition guards", () => {
    const handler = read("public/_worker-guide.js");
    expect(handler).toContain('const GUIDE_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8"');
    expect(handler).toContain("env.AI.run");
    expect(handler).toContain("MAX_MESSAGES = 12");
    expect(handler).toContain("rateLimited(request)");
    expect(handler).toContain("tooSimilar(answer, previousAnswers)");
    expect(handler).toContain('"X-Irha-AI-Provider": provider');
    expect(handler).toContain('provider: "cloudflare-workers-ai"');
    expect(handler).toContain("Never invent or estimate price");
    expect(handler).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(handler).not.toContain("CLOUDFLARE_API_TOKEN");
  });

  it("injects one guarded API route without rewriting the existing worker source", () => {
    const installer = read("scripts/install-cloudflare-ai-guide.mjs");
    expect(installer).toContain("dist/_worker.js");
    expect(installer).toContain("dist/_worker-guide.js");
    expect(installer).toContain('import { handleIrhaGuideRequest } from "./_worker-guide.js";');
    expect(installer).toContain('pathname === "/api/guide"');
    expect(installer).toContain("Cloudflare worker robots anchor changed");
    expect(installer).toContain("importCount !== 1 || routeCount !== 1");

    const packageJson = read("package.json");
    expect(packageJson).toContain("node scripts/install-cloudflare-ai-guide.mjs");
  });

  it("prefers Workers AI and only falls back for unavailable upstream statuses", () => {
    const client = read("src/components/LiveChat.tsx");
    expect(client).toContain('const CLOUDFLARE_GUIDE_ENDPOINT = "/api/guide"');
    expect(client).toContain("const FALLBACK_STATUSES = new Set([404, 502, 503])");
    expect(client).toContain("cloudflareResponse.ok || !FALLBACK_STATUSES.has(cloudflareResponse.status)");
    expect(client).toContain("SUPABASE_GUIDE_ENDPOINT");
    expect(client).toContain("apikey: supabasePublishableKey");
    expect(client).not.toContain("Authorization: `Bearer ${supabasePublishableKey}`");
  });

  it("adds exactly one AI binding to downloaded TOML and remains idempotent", () => {
    const first = runConfigPreparation("wrangler.toml", [
      'name = "irha-apparels"',
      'pages_build_output_dir = "dist"',
      'compatibility_date = "2026-07-16"',
      "",
    ].join("\n"));
    expect(first.match(/^\[ai\]$/gm)).toHaveLength(1);
    expect(first.match(/^binding = "AI"$/gm)).toHaveLength(1);

    const second = runConfigPreparation("wrangler.toml", first);
    expect(second.match(/^\[ai\]$/gm)).toHaveLength(1);
    expect(second.match(/^binding = "AI"$/gm)).toHaveLength(1);
  });

  it("adds exactly one AI binding to downloaded JSONC and remains idempotent", () => {
    const first = runConfigPreparation("wrangler.jsonc", [
      "{",
      "  // Downloaded from Cloudflare Pages",
      '  "name": "irha-apparels",',
      '  "pages_build_output_dir": "./dist",',
      '  "compatibility_date": "2026-07-16"',
      "}",
      "",
    ].join("\n"));
    expect(first.match(/"ai"\s*:/g)).toHaveLength(1);
    expect(first.match(/"binding"\s*:\s*"AI"/g)).toHaveLength(1);

    const second = runConfigPreparation("wrangler.jsonc", first);
    expect(second.match(/"ai"\s*:/g)).toHaveLength(1);
    expect(second.match(/"binding"\s*:\s*"AI"/g)).toHaveLength(1);
  });

  it("normalizes harmless dist path variants without accepting another build directory", () => {
    const accepted = runConfigPreparation("wrangler.toml", [
      'name = "irha-apparels"',
      'pages_build_output_dir = "./dist/"',
      "",
    ].join("\n"));
    expect(accepted).toContain('[ai]\nbinding = "AI"');

    expect(() => runConfigPreparation("wrangler.toml", [
      'name = "irha-apparels"',
      'pages_build_output_dir = "build"',
      "",
    ].join("\n"))).toThrow();
  });

  it("rejects a conflicting downloaded AI binding instead of overwriting it", () => {
    expect(() => runConfigPreparation("wrangler.json", JSON.stringify({
      name: "irha-apparels",
      pages_build_output_dir: "./dist",
      ai: { binding: "OTHER_AI" },
    }, null, 2))).toThrow();
  });

  it("requires a root downloaded config, preview identity and two-turn smoke before production", () => {
    const workflow = read(".github/workflows/deploy-workers-ai-guide-current-main.yml");
    expect(workflow).toContain("Confirm exact current main source");
    expect(workflow).toContain("pages download config");
    expect(workflow).toContain("wrangler.toml");
    expect(workflow).toContain("wrangler.json");
    expect(workflow).toContain("wrangler.jsonc");
    expect(workflow).toContain('test "${#config_files[@]}" = "1"');
    expect(workflow).toContain('echo "WRANGLER_CONFIG=$wrangler_config"');
    expect(workflow).not.toContain('--config "$WRANGLER_CONFIG"');
    expect(workflow).toContain("Pages auto-discovers the downloaded root wrangler.* file");
    expect(workflow).toContain("Deploy immutable preview with Workers AI binding");
    expect(workflow).toContain('smoke-cloudflare-ai-guide.mjs "$PREVIEW_URL"');
    expect(workflow).toContain("Reconfirm exact current main before production");
    expect(workflow).toContain('smoke-cloudflare-ai-guide.mjs "$CANONICAL_ORIGIN"');

    const smoke = read("scripts/smoke-cloudflare-ai-guide.mjs");
    expect(smoke).toContain("What about sampling for that same jersey?");
    expect(smoke).toContain('provider !== "cloudflare-workers-ai"');
    expect(smoke).toContain("similarity(firstAnswer, secondAnswer) >= 0.78");
    expect(smoke).toContain("did not address sampling");
  });
});
