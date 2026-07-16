import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

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
    expect(installer).toContain('dist/_worker.js');
    expect(installer).toContain('dist/_worker-guide.js');
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

  it("preserves downloaded Pages settings and adds exactly one AI binding", () => {
    const config = read("scripts/prepare-cloudflare-ai-pages-config.mjs");
    expect(config).toContain("Downloaded Pages configuration");
    expect(config).toContain('[ai]\\nbinding = "AI"');
    expect(config).toContain("A conflicting Workers AI binding already exists");
    expect(config).toContain("sectionCount !== 1 || bindingCount !== 1");
  });

  it("requires preview source identity and a two-turn non-repetition smoke before production", () => {
    const workflow = read(".github/workflows/deploy-workers-ai-guide-current-main.yml");
    expect(workflow).toContain("Confirm exact current main source");
    expect(workflow).toContain("pages download config");
    expect(workflow).toContain("prepare-cloudflare-ai-pages-config.mjs");
    expect(workflow).toContain("Deploy immutable preview with Workers AI binding");
    expect(workflow).toContain("smoke-cloudflare-ai-guide.mjs \"$PREVIEW_URL\"");
    expect(workflow).toContain("Reconfirm exact current main before production");
    expect(workflow).toContain("smoke-cloudflare-ai-guide.mjs \"$CANONICAL_ORIGIN\"");

    const smoke = read("scripts/smoke-cloudflare-ai-guide.mjs");
    expect(smoke).toContain("What about sampling for that same jersey?");
    expect(smoke).toContain('provider !== "cloudflare-workers-ai"');
    expect(smoke).toContain("similarity(firstAnswer, secondAnswer) >= 0.78");
    expect(smoke).toContain("did not address sampling");
  });
});
