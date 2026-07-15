# Lovable runtime dependency scan — 2026-07-16

Source matches only; build output, docs, lockfiles and this workflow are excluded.

```text
src/pages/AdminOutreachApproval.test.ts:39:    expect(backend).not.toContain("ai.gateway.lovable.dev");
src/test/publicPlatformContracts.test.ts:91:    expect(chatFunction).toContain("ai.gateway.lovable.dev/v1/chat/completions");
src/test/publicPlatformContracts.test.ts:97:    expect(renderer).not.toContain("ai.gateway.lovable.dev");
src/test/publicPlatformContracts.test.ts:98:    expect(renderer).not.toContain("LOVABLE_API_KEY");
src/lib/__checks__/gscDailySitemapAutomation.test.ts:30:    expect(source).toContain('gsc: Boolean(Deno.env.get("LOVABLE_API_KEY"))');
supabase/functions/gsc-analytics/index.ts:6:const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
supabase/functions/gsc-analytics/index.ts:17:      || url.hostname.endsWith(".lovable.app")
supabase/functions/gsc-analytics/index.ts:67:  const connectorGatewayKey = Boolean(Deno.env.get("LOVABLE_API_KEY"));
supabase/functions/gsc-analytics/index.ts:123:    const connectorToken = Deno.env.get("LOVABLE_API_KEY")!;
supabase/functions/public-lead-gateway/index.ts:253:      url.hostname.endsWith(".lovable.app");
supabase/functions/public-lead-gateway/index.ts:300:      url.hostname.endsWith(".lovable.app");
supabase/functions/admin-agent-health/index.ts:12:const GATEWAY = "https://connector-gateway.lovable.dev";
supabase/functions/admin-agent-health/index.ts:42:    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
supabase/functions/admin-agent-health/index.ts:63:        note: lovableKey ? "AI gateway key detected." : "LOVABLE_API_KEY is not detected.",
supabase/functions/catalog-media-bootstrap/index.ts:10:const LOVABLE_BASE = "https://irha-apparels.lovable.app";
supabase/functions/catalog-media-bootstrap/index.ts:11:const PREVIEW_BASE = "https://id-preview--da72a40a-7df3-44c3-a72d-f180d9ffcd25.lovable.app";
supabase/functions/catalog-media-bootstrap/index.ts:362:    return url.protocol === "https:" && (host === "irhaapparels.com" || host.endsWith(".irhaapparels.com") || host === "irha-apparels.lovable.app" || host.endsWith("--da72a40a-7df3-44c3-a72d-f180d9ffcd25.lovable.app"));
supabase/functions/social-autopilot/index.ts:182:    ai_gateway_configured: Boolean(Deno.env.get("LOVABLE_API_KEY")),
supabase/functions/social-autopilot/index.ts:214:  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured" }, 503);
supabase/functions/social-autopilot/index.ts:797:  const key = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/social-autopilot/index.ts:798:  if (!key) throw new Error("LOVABLE_API_KEY missing");
supabase/functions/social-autopilot/index.ts:799:  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
supabase/functions/scheduled-sitemap-submit/index.ts:25:  const gatewayKey = Deno.env.get("LOVABLE_API_KEY") || "";
supabase/functions/scheduled-sitemap-submit/index.ts:40:    const endpoint = `https://ai.gateway.lovable.dev/google-search-console/webmasters/v3/sites/${encodeURIComponent(SITE_PROPERTY)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
supabase/functions/outreach-workflow-v2/index.ts:8:const GATEWAY = "https://connector-gateway.lovable.dev";
supabase/functions/outreach-workflow-v2/index.ts:79:    ai_ready: Boolean(Deno.env.get("LOVABLE_API_KEY")) && databaseReady,
supabase/functions/outreach-workflow-v2/index.ts:91:  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "AI gateway is not configured" }, 503);
supabase/functions/outreach-workflow-v2/index.ts:589:  const key = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/outreach-workflow-v2/index.ts:590:  if (!key) throw new Error("LOVABLE_API_KEY missing");
supabase/functions/outreach-workflow-v2/index.ts:591:  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
supabase/functions/outreach-workflow-v2/index.ts:640:  if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_MAIL_API_KEY")) return { ok: false, error: "Gmail connector runtime keys are missing" };
supabase/functions/outreach-workflow-v2/index.ts:644:async function gmailFetch(path: string, init: RequestInit) { const key = Deno.env.get("LOVABLE_API_KEY"); const gmail = Deno.env.get("GOOGLE_MAIL_API_KEY"); if (!key || !gmail) throw new Error("Gmail connector runtime keys are missing"); const headers = new Headers(init.headers || {}); headers.set("Authorization", `Bearer ${key}`); headers.set("X-Connection-Api-Key", gmail); return await fetch(`${GMAIL_BASE}${path}`, { ...init, headers }); }
supabase/functions/multilingual-seo/index.ts:85:    ai_gateway_configured: Boolean(Deno.env.get("LOVABLE_API_KEY")),
supabase/functions/multilingual-seo/index.ts:86:    ready_to_generate: Boolean(databaseReady && Deno.env.get("LOVABLE_API_KEY")),
supabase/functions/multilingual-seo/index.ts:467:  const key = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/multilingual-seo/index.ts:468:  if (!key) throw new Error("LOVABLE_API_KEY missing");
supabase/functions/multilingual-seo/index.ts:469:  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
supabase/functions/chat/index.ts:36:      url.hostname.endsWith(".lovable.app");
supabase/functions/chat/index.ts:291:  const key = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/chat/index.ts:294:  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
supabase/functions/social-calendar/index.ts:13:const GATEWAY = "https://connector-gateway.lovable.dev";
supabase/functions/social-calendar/index.ts:84:  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
supabase/functions/social-calendar/index.ts:136:  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured" }, 503);
supabase/functions/social-calendar/index.ts:541:  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/social-calendar/index.ts:599:  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/social-calendar/index.ts:716:  const key = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/social-calendar/index.ts:717:  if (!key) throw new Error("LOVABLE_API_KEY missing");
supabase/functions/social-calendar/index.ts:718:  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
supabase/functions/gsc-inspect/index.ts:12:const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
supabase/functions/gsc-inspect/index.ts:54:  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/social-multi-sync/index.ts:22:const GATEWAY = "https://connector-gateway.lovable.dev";
supabase/functions/social-multi-sync/index.ts:82:  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/sitemap-ping/index.ts:14:const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
supabase/functions/sitemap-ping/index.ts:75:  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/live-chat/index.ts:30:      url.hostname.endsWith(".lovable.app");
supabase/functions/operations-orchestrator/index.ts:188:    ai_gateway: Boolean(Deno.env.get("LOVABLE_API_KEY")),
supabase/functions/operations-orchestrator/index.ts:189:    gsc: Boolean(Deno.env.get("LOVABLE_API_KEY")),
supabase/functions/process-email-queue/index.ts:82:  const apiKey = Deno.env.get('LOVABLE_API_KEY')
supabase/functions/outreach-engine/index.ts:12:const GATEWAY = "https://connector-gateway.lovable.dev";
supabase/functions/outreach-engine/index.ts:84:  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
supabase/functions/outreach-engine/index.ts:137:  if (!Deno.env.get("LOVABLE_API_KEY")) {
supabase/functions/outreach-engine/index.ts:553:  if (!Deno.env.get("LOVABLE_API_KEY")) {
supabase/functions/outreach-engine/index.ts:808:  if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_MAIL_API_KEY")) {
supabase/functions/outreach-engine/index.ts:826:  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/outreach-engine/index.ts:895:  const key = Deno.env.get("LOVABLE_API_KEY");
supabase/functions/outreach-engine/index.ts:896:  if (!key) throw new Error("LOVABLE_API_KEY missing");
supabase/functions/outreach-engine/index.ts:897:  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
```
