import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("buyer-critical public platform contracts", () => {
  it("keeps every primary buyer journey mounted", () => {
    const app = source("src/App.tsx");
    const requiredRoutes = [
      "/",
      "/products",
      "/manufacturing",
      "/buyer-trust",
      "/factory-video-call",
      "/resources",
      "/faq",
      "/inquiry",
      "/inquiry-cart",
      "/repeat-order",
      "/contact",
      "/catalogue",
      "/studio",
      "/shortlist",
      "/compare",
      "/privacy-policy",
      "/terms-of-service",
    ];

    for (const route of requiredRoutes) {
      expect(app, `Missing buyer-critical route ${route}`).toContain(`path="${route}"`);
    }
  });

  it("keeps compatibility aliases for privacy, terms and catalogue links", () => {
    const app = source("src/App.tsx");
    const expectedRedirects = [
      '["/privacy", "/privacy-policy"]',
      '["/privacy/", "/privacy-policy"]',
      '["/terms", "/terms-of-service"]',
      '["/terms/", "/terms-of-service"]',
      '["/terms-and-conditions", "/terms-of-service"]',
      '["/catalogs/master-catalogue-2026.pdf", "/products"]',
    ];

    for (const redirect of expectedRedirects) expect(app).toContain(redirect);
  });

  it("declares public buyer functions explicitly and keeps admin functions authenticated", () => {
    const config = source("supabase/config.toml");

    expect(config).toMatch(/\[functions\.chat\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.public-lead-gateway\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.generate-mockup\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.meta-webhook\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.admin-agent\]\s+verify_jwt = true/);
    expect(config).toMatch(/\[functions\.process-email-queue\]\s+verify_jwt = true/);
  });

  it("keeps public submissions server-validated, rate-limited and private-upload only", () => {
    const gateway = source("supabase/functions/public-lead-gateway/index.ts");
    const client = source("src/lib/publicLeadGateway.ts");

    expect(gateway).toContain('const TECH_PACK_BUCKET = "tech_packs"');
    expect(gateway).toContain('const MOCKUP_BUCKET = "mockup-uploads"');
    expect(gateway).toContain("MAX_TECH_PACK_BYTES = 25 * 1024 * 1024");
    expect(gateway).toContain('service.rpc("consume_public_submission_limit"');
    expect(gateway).toContain("isAllowedOrigin(origin)");
    expect(gateway).toContain("createSignedUploadUrl(path)");
    expect(gateway).toContain("server_validated: true");

    expect(client).toContain('supabase.functions.invoke<GatewayResponse>("public-lead-gateway"');
    expect(client).not.toContain('.from("inquiries")');
    expect(client).not.toContain('.from("catalogue_leads")');
  });

  it("keeps website chat on the owner runtime with server-side persistence", () => {
    const liveChat = source("src/components/LiveChat.tsx");
    const chatFunction = [
      "index.ts",
      "core.ts",
      "data.ts",
      "prompt.ts",
      "providers.ts",
    ].map((file) => source(`supabase/functions/chat/${file}`)).join("\n");

    expect(liveChat).toContain("supabaseRuntimeUrl");
    expect(liveChat).toContain("supabasePublishableKey");
    expect(liveChat).toContain("sessionId: sessionIdRef.current");
    expect(liveChat).toContain('response.headers.get("X-Irha-AI-Provider")');
    expect(liveChat).not.toContain("import.meta.env.VITE_SUPABASE_URL");
    expect(liveChat).not.toContain("import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(liveChat).not.toContain('.from("chat_messages")');

    expect(chatFunction).toContain("persistExchange(sessionId, latestUser, safeAnswer)");
    expect(chatFunction).toContain('service().from("chat_messages").insert');
    expect(chatFunction).toContain('provider: "deterministic-backup"');
    expect(chatFunction).toContain("resolveSessionId(body.sessionId, req)");
    expect(chatFunction).toContain("isAllowedOrigin(origin)");
    expect(chatFunction).toContain("ai.gateway.lovable.dev/v1/chat/completions");
    expect(chatFunction).toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
    expect(chatFunction).toContain('"X-Irha-Conversation-Version": "3"');
    expect(chatFunction).toContain("isTooSimilar");
  });

  it("keeps Custom Lab independent of the paid Lovable AI gateway", () => {
    const renderer = source("supabase/functions/generate-mockup/index.ts");

    expect(renderer).not.toContain("ai.gateway.lovable.dev");
    expect(renderer).not.toContain("LOVABLE_API_KEY");
    expect(renderer).toContain('"X-Irha-Renderer": "deterministic-png-v1"');
    expect(renderer).toContain("preview_rate_limited");
    expect(renderer).toContain("data:image/png;base64");
  });

  it("pins the frontend to the owner-controlled production backend", () => {
    const runtime = source("src/integrations/supabase/ownerRuntime.ts");
    const client = source("src/integrations/supabase/client.ts");

    expect(runtime).toContain('OWNER_SUPABASE_PROJECT_ID = "pvzjiozismyxqrzmtfbi"');
    expect(client).toContain("Runtime identity is sourced only from the immutable owner file");
    expect(client).not.toContain("import.meta.env.VITE_SUPABASE_URL");
  });
});
