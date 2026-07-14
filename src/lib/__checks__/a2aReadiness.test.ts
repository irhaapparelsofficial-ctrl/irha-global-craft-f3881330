import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const json = <T>(path: string) => JSON.parse(read(path)) as T;

describe("A2A public buyer agent", () => {
  it("publishes a valid read-only A2A v1 Agent Card", () => {
    const card = json<{
      name: string;
      version: string;
      supportedInterfaces: Array<{ url: string; protocolBinding: string; protocolVersion: string }>;
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
      { url: "https://irhaapparels.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    ]);
    expect(card.capabilities).toEqual({ streaming: false, pushNotifications: false, extendedAgentCard: false });
    expect(card.defaultInputModes).toEqual(["text/plain"]);
    expect(card.defaultOutputModes).toEqual(["text/plain"]);
    expect(card.skills.map((skill) => skill.id)).toEqual([
      "browse-b2b-collections",
      "factory-verification",
      "prepare-buyer-inquiry",
    ]);
    expect(card.security).toBeUndefined();
    expect(card.securitySchemes).toBeUndefined();
  });

  it("backs the card with a bounded, read-only JSON-RPC endpoint", () => {
    const server = read("functions/a2a.js");
    expect(server).toContain('const A2A_VERSION = "1.0"');
    expect(server).toContain('method === "SendMessage"');
    expect(server).toContain('method === "ListTasks"');
    expect(server).toContain("ROLE_AGENT");
    expect(server).toContain("submitted: false");
    expect(server).toContain("MAX_REQUEST_BYTES");
    expect(server).toContain("MAX_TEXT_LENGTH");
    expect(server).not.toContain("public-lead-gateway");
  });

  it("advertises A2A through discovery, headers and auth policy", () => {
    const catalog = read("public/.well-known/api-catalog");
    const headers = read("public/_headers");
    const auth = read("public/auth.md");
    const middleware = read("functions/_middleware.js");

    expect(catalog).toContain("https://irhaapparels.com/a2a");
    expect(catalog).toContain("/.well-known/agent-card.json");
    expect(headers).toContain("application/a2a+json; charset=utf-8");
    expect(headers).toContain("A2A-Version: 1.0");
    expect(auth).toContain("/.well-known/agent-card.json");
    expect(auth).toContain("/a2a");
    expect(auth).toContain("do not submit buyer data");
    expect(middleware).toContain('pathname === "/a2a"');
    expect(middleware).toContain("/.well-known/agent-card.json");
  });
});
