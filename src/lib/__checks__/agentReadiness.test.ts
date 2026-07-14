import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const json = <T>(path: string) => JSON.parse(read(path)) as T;
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

describe("agent readiness public contracts", () => {
  it("publishes a real RFC 9727-style API catalog linked to the deployed public gateway", () => {
    const catalog = json<{ linkset: Array<Record<string, unknown>> }>("public/.well-known/api-catalog");
    expect(Array.isArray(catalog.linkset)).toBe(true);
    expect(catalog.linkset.length).toBeGreaterThanOrEqual(2);
    const raw = JSON.stringify(catalog);
    expect(raw).toContain("public-lead-gateway");
    expect(raw).toContain("/openapi/public-lead-gateway.json");
    expect(raw).toContain("/.well-known/mcp/server-card.json");
  });

  it("keeps the OpenAPI contract aligned with the implemented public gateway actions", () => {
    const contract = json<{
      openapi: string;
      paths: Record<string, unknown>;
    }>("public/openapi/public-lead-gateway.json");
    const source = read("supabase/functions/public-lead-gateway/index.ts");
    const serialized = JSON.stringify(contract);

    expect(contract.openapi).toBe("3.1.0");
    expect(contract.paths).toHaveProperty("/public-lead-gateway");
    for (const action of ["submit_inquiry", "submit_catalogue", "create_upload"]) {
      expect(source).toContain(`\"${action}\"`);
      expect(serialized).toContain(action);
    }
  });

  it("publishes valid skill discovery with hashes matching the served skill files", () => {
    const index = json<{
      version: string;
      skills: Array<{ name: string; url: string; sha256: string }>;
    }>("public/.well-known/agent-skills/index.json");

    expect(index.version).toBe("0.2.0");
    expect(index.skills).toHaveLength(2);

    const skillFiles: Record<string, string> = {
      "buyer-inquiry": "public/skills/buyer-inquiry/SKILL.md",
      "catalogue-discovery": "public/skills/catalogue-discovery/SKILL.md",
    };

    for (const skill of index.skills) {
      const path = skillFiles[skill.name];
      expect(path).toBeTruthy();
      expect(skill.url).toContain(`/skills/${skill.name}/SKILL.md`);
      expect(skill.sha256).toBe(sha256(read(path)));
    }
  });

  it("exposes a read-only MCP server and never auto-submits buyer data", () => {
    const server = read("functions/mcp.js");
    const card = json<{
      authentication: { type: string };
      tools: Array<{ name: string; readOnly: boolean; confirmationRequired?: boolean }>;
    }>("public/.well-known/mcp/server-card.json");

    expect(server).toContain('method === "initialize"');
    expect(server).toContain('method === "tools/list"');
    expect(server).toContain('method === "tools/call"');
    expect(server).toContain("submitted: false");
    expect(server).not.toContain("public-lead-gateway");
    expect(card.authentication.type).toBe("none");
    expect(card.tools.every((tool) => tool.readOnly)).toBe(true);
    expect(card.tools.find((tool) => tool.name === "prepare_buyer_inquiry")?.confirmationRequired).toBe(true);
  });

  it("registers buyer-safe WebMCP tools through current and legacy browser APIs", () => {
    const webMcp = read("src/lib/webMcp.ts");
    const main = read("src/main.tsx");

    expect(webMcp).toContain("document.modelContext");
    expect(webMcp).toContain("registerTool");
    expect(webMcp).toContain("navigator.modelContext");
    expect(webMcp).toContain("provideContext");
    expect(webMcp).toContain("submitted: false");
    expect(main).toContain("registerWebMcpTools");
    expect(main).toContain("void registerWebMcpTools()");
  });

  it("serves discovery content with explicit types and negotiates Markdown", () => {
    const headers = read("public/_headers");
    const middleware = read("functions/_middleware.js");
    const routes = json<{ version: number; include: string[]; exclude: string[] }>("public/_routes.json");

    expect(headers).toContain("application/linkset+json");
    expect(headers).toContain("application/vnd.oai.openapi+json;version=3.1");
    expect(headers).toContain("text/markdown; charset=utf-8");
    expect(headers).toContain('rel="api-catalog"');
    expect(headers).toContain("Permissions-Policy: tools=(self)");
    expect(middleware).toContain('accept.toLowerCase().includes("text/markdown")');
    expect(middleware).toContain('"Vary": "Accept"');
    expect(routes.version).toBe(1);
    expect(routes.include).toContain("/*");
    expect(routes.exclude).toContain("/.well-known/*");
  });

  it("does not publish fake OAuth or autonomous agent-registration metadata", () => {
    const auth = read("public/auth.md");
    const catalog = read("public/.well-known/api-catalog");

    expect(auth).toContain("No autonomous public agent registration is currently offered");
    expect(auth).toContain("require no credentials");
    expect(catalog).not.toContain("oauth-authorization-server");
    expect(catalog).not.toContain("oauth-protected-resource");
  });
});
