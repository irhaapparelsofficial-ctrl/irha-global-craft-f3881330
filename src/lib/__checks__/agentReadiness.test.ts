import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const json = <T>(path: string) => JSON.parse(read(path)) as T;
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const OWNER_PROJECT_ORIGIN = "https://pvzjiozismyxqrzmtfbi.supabase.co";
const OWNER_AUTH_ISSUER = `${OWNER_PROJECT_ORIGIN}/auth/v1`;

describe("agent readiness public contracts", () => {
  it("publishes an API catalog linked to the deployed public gateway and agent services", () => {
    const catalog = json<{ linkset: Array<Record<string, unknown>> }>("public/.well-known/api-catalog");
    const raw = JSON.stringify(catalog);
    expect(Array.isArray(catalog.linkset)).toBe(true);
    expect(catalog.linkset.length).toBeGreaterThanOrEqual(4);
    expect(raw).toContain("public-lead-gateway");
    expect(raw).toContain("/openapi/public-lead-gateway.json");
    expect(raw).toContain("/.well-known/mcp/server-card.json");
    expect(raw).toContain("/.well-known/agent-card.json");
    expect(raw).toContain("https://irhaapparels.com/a2a");
    expect(raw).not.toContain("https://www.irhaapparels.com");
  });

  it("keeps the OpenAPI actions aligned with the implemented gateway", () => {
    const contract = json<{ openapi: string; paths: Record<string, unknown> }>("public/openapi/public-lead-gateway.json");
    const source = read("supabase/functions/public-lead-gateway/index.ts");
    const serialized = JSON.stringify(contract);
    expect(contract.openapi).toBe("3.1.0");
    expect(contract.paths).toHaveProperty("/public-lead-gateway");
    for (const action of ["submit_inquiry", "submit_catalogue", "create_upload"]) {
      expect(source).toContain(`\"${action}\"`);
      expect(serialized).toContain(action);
    }
  });

  it("publishes skill discovery with hashes matching the served files", () => {
    const index = json<{ version: string; skills: Array<{ name: string; url: string; sha256: string }> }>(
      "public/.well-known/agent-skills/index.json",
    );
    const skillFiles: Record<string, string> = {
      "buyer-inquiry": "public/skills/buyer-inquiry/SKILL.md",
      "catalogue-discovery": "public/skills/catalogue-discovery/SKILL.md",
    };
    expect(index.version).toBe("0.2.0");
    expect(index.skills).toHaveLength(2);
    for (const skill of index.skills) {
      const path = skillFiles[skill.name];
      expect(path).toBeTruthy();
      expect(skill.url).toContain(`/skills/${skill.name}/SKILL.md`);
      expect(skill.sha256).toBe(sha256(read(path)));
    }
  });

  it("exposes read-only MCP tools and never auto-submits buyer data", () => {
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

  it("publishes a real A2A v1 card backed by a read-only JSON-RPC endpoint", () => {
    const server = read("functions/a2a.js");
    const card = json<{
      name: string;
      supportedInterfaces: Array<{ url: string; protocolBinding: string; protocolVersion: string }>;
      version: string;
      capabilities: { streaming: boolean; pushNotifications: boolean; extendedAgentCard: boolean };
      defaultInputModes: string[];
      defaultOutputModes: string[];
      skills: Array<{ id: string }>;
      security?: unknown;
      securitySchemes?: unknown;
    }>("public/.well-known/agent-card.json");

    expect(card.name).toBe("Irha Apparels Public Buyer Agent");
    expect(card.version).toBe("1.0.0");
    expect(card.supportedInterfaces).toEqual([
      {
        url: "https://irhaapparels.com/a2a",
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      },
    ]);
    expect(card.capabilities).toEqual({
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    });
    expect(card.defaultInputModes).toEqual(["text/plain"]);
    expect(card.defaultOutputModes).toEqual(["text/plain"]);
    expect(card.skills.map((skill) => skill.id)).toEqual([
      "browse-b2b-collections",
      "factory-verification",
      "prepare-buyer-inquiry",
    ]);
    expect(card.security).toBeUndefined();
    expect(card.securitySchemes).toBeUndefined();

    expect(server).toContain('const A2A_VERSION = "1.0"');
    expect(server).toContain('method === "SendMessage"');
    expect(server).toContain('method === "ListTasks"');
    expect(server).toContain("ROLE_AGENT");
    expect(server).toContain("submitted: false");
    expect(server).toContain("MAX_REQUEST_BYTES");
    expect(server).toContain("MAX_TEXT_LENGTH");
    expect(server).not.toContain("public-lead-gateway");
  });

  it("injects buyer-safe WebMCP tools on public HTML pages", () => {
    const webMcp = read("public/agent-webmcp.js");
    const middleware = read("functions/_middleware.js");
    expect(webMcp).toContain("document.modelContext");
    expect(webMcp).toContain("registerTool");
    expect(webMcp).toContain("navigator.modelContext");
    expect(webMcp).toContain("provideContext");
    expect(webMcp).toContain("submitted: false");
    expect(middleware).toContain("/agent-webmcp.js");
    expect(middleware).toContain("data-irha-agent-tools");
    expect(middleware).toContain("/.well-known/agent-card.json");
    expect(middleware).toContain('pathname === "/a2a"');
  });

  it("serves explicit content types and negotiates Markdown", () => {
    const headers = read("public/_headers");
    const middleware = read("functions/_middleware.js");
    const routes = json<{ version: number; include: string[]; exclude: string[] }>("public/_routes.json");
    expect(headers).toContain("application/linkset+json");
    expect(headers).toContain("application/vnd.oai.openapi+json;version=3.1");
    expect(headers).toContain("application/a2a+json; charset=utf-8");
    expect(headers).toContain("text/markdown; charset=utf-8");
    expect(headers).toContain("/.well-known/openid-configuration");
    expect(headers).toContain("/.well-known/oauth-authorization-server");
    expect(headers).toContain("/.well-known/oauth-protected-resource");
    expect(headers).toContain("/.well-known/agent-card.json");
    expect(headers).toContain('rel="api-catalog"');
    expect(headers).toContain("Permissions-Policy: tools=(self)");
    expect(middleware).toContain('accept.toLowerCase().includes("text/markdown")');
    expect(middleware).toContain('"Vary": "Accept"');
    expect(routes.version).toBe(1);
    expect(routes.include).toContain("/*");
    expect(routes.exclude).toContain("/.well-known/*");
  });

  it("publishes the real owner OAuth issuer and protected backend without granting anonymous access", () => {
    const oidc = json<{
      issuer: string;
      authorization_endpoint: string;
      token_endpoint: string;
      jwks_uri: string;
      scopes_supported: string[];
      grant_types_supported: string[];
      code_challenge_methods_supported: string[];
      registration_endpoint?: string;
    }>("public/.well-known/openid-configuration");
    const oauth = json<typeof oidc>("public/.well-known/oauth-authorization-server");
    const resource = json<{
      resource: string;
      authorization_servers: string[];
      scopes_supported: string[];
      bearer_methods_supported: string[];
      resource_documentation: string;
    }>("public/.well-known/oauth-protected-resource");
    const auth = read("public/auth.md");
    const oauthDocs = read("public/docs/oauth.md");

    expect(oidc.issuer).toBe(OWNER_AUTH_ISSUER);
    expect(oidc.authorization_endpoint).toBe(`${OWNER_AUTH_ISSUER}/oauth/authorize`);
    expect(oidc.token_endpoint).toBe(`${OWNER_AUTH_ISSUER}/oauth/token`);
    expect(oidc.jwks_uri).toBe(`${OWNER_AUTH_ISSUER}/.well-known/jwks.json`);
    expect(oidc.scopes_supported).toEqual(expect.arrayContaining(["openid", "profile", "email"]));
    expect(oidc.grant_types_supported).toEqual(expect.arrayContaining(["authorization_code", "refresh_token"]));
    expect(oidc.code_challenge_methods_supported).toContain("S256");
    expect(oidc.registration_endpoint).toBeUndefined();
    expect(oauth).toEqual(oidc);

    expect(resource.resource).toBe(OWNER_PROJECT_ORIGIN);
    expect(resource.authorization_servers).toEqual([OWNER_AUTH_ISSUER]);
    expect(resource.bearer_methods_supported).toEqual(["header"]);
    expect(resource.resource_documentation).toBe("https://irhaapparels.com/docs/oauth.md");
    expect(auth).toContain(OWNER_AUTH_ISSUER);
    expect(auth).toContain("No unrestricted autonomous public agent registration is offered");
    expect(auth).toContain("/.well-known/agent-card.json");
    expect(auth).toContain("/a2a");
    expect(oauthDocs).toContain("row-level security");
    expect(oauthDocs).toContain("explicit user consent");
  });
});
