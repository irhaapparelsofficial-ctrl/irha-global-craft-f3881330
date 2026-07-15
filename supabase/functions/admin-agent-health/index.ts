// Runtime capability health for Irha AI Command Center.
// Admin-only. Separates configured, verified, and publish-capable states.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

function irhaLovableRuntimeKey(): string | undefined {
  if (Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true") return undefined;
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev";

type Capability = {
  key: string;
  label: string;
  configured: boolean;
  verified: boolean;
  publish_capable: boolean;
  note: string;
  details?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: roleRow } = await userClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lovableKey = irhaLovableRuntimeKey() || "";
    const linkedinKey = Deno.env.get("LINKEDIN_API_KEY") || "";
    const tiktokKey = Deno.env.get("TIKTOK_API_KEY") || "";
    const metaToken = Deno.env.get("META_ACCESS_TOKEN") || Deno.env.get("META_PAGE_ACCESS_TOKEN") || "";
    const metaPageId = Deno.env.get("META_PAGE_ID") || Deno.env.get("META_FB_PAGE_ID") || "";
    const igId = Deno.env.get("IG_ACCOUNT_ID") || Deno.env.get("META_IG_BUSINESS_ACCOUNT_ID") || "";

    const [schemaHealth, linkedin, tiktok, meta] = await Promise.all([
      checkSchema(service),
      checkLinkedIn(lovableKey, linkedinKey),
      checkTikTok(lovableKey, tiktokKey),
      checkMeta(metaToken, metaPageId, igId),
    ]);

    const capabilities: Capability[] = [
      {
        key: "ai_gateway",
        label: "AI planning",
        configured: Boolean(lovableKey),
        verified: Boolean(lovableKey),
        publish_capable: false,
        note: lovableKey ? "AI gateway key detected." : "LOVABLE_API_KEY is not detected.",
      },
      linkedin,
      tiktok,
      meta.facebook,
      meta.instagram,
      {
        key: "resend",
        label: "Transactional email",
        configured: Boolean(Deno.env.get("RESEND_API_KEY")),
        verified: false,
        publish_capable: false,
        note: Deno.env.get("RESEND_API_KEY") ? "Resend secret detected; delivery still requires an end-to-end email test." : "RESEND_API_KEY is not detected.",
      },
      {
        key: "gmail_connector",
        label: "Gmail connector",
        configured: Boolean(Deno.env.get("GOOGLE_MAIL_API_KEY")),
        verified: false,
        publish_capable: false,
        note: Deno.env.get("GOOGLE_MAIL_API_KEY") ? "Runtime connector key detected; inbox actions need a dedicated executor." : "Runtime Gmail connector key was not detected by this function.",
      },
      {
        key: "search_console_connector",
        label: "Google Search Console",
        configured: Boolean(Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")),
        verified: false,
        publish_capable: false,
        note: Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY") ? "Runtime connector key detected." : "Runtime Search Console connector key was not detected by this function.",
      },
      {
        key: "semrush_connector",
        label: "Semrush",
        configured: Boolean(Deno.env.get("SEMRUSH_API_KEY")),
        verified: false,
        publish_capable: false,
        note: Deno.env.get("SEMRUSH_API_KEY") ? "Runtime connector key detected." : "Runtime Semrush connector key was not detected by this function.",
      },
      {
        key: "pipedrive_connector",
        label: "Pipedrive",
        configured: Boolean(Deno.env.get("PIPEDRIVE_API_KEY")),
        verified: false,
        publish_capable: false,
        note: Deno.env.get("PIPEDRIVE_API_KEY") ? "Runtime connector key detected." : "Runtime Pipedrive connector key was not detected by this function.",
      },
    ];

    return json({
      ok: true,
      checked_at: new Date().toISOString(),
      schema: schemaHealth,
      capabilities,
      definitions: {
        configured: "A required runtime key or secret was detected.",
        verified: "A live identity/profile request succeeded where supported.",
        publish_capable: "The current integration has the inputs needed to attempt publishing. It is not a guarantee of platform acceptance.",
      },
    });
  } catch (error) {
    console.error("admin-agent-health error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function checkSchema(service: ReturnType<typeof createClient>) {
  const tables = ["ai_runs", "ai_actions", "business_listings"];
  const results: Record<string, { ready: boolean; error?: string }> = {};
  for (const table of tables) {
    const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
    results[table] = error ? { ready: false, error: error.message } : { ready: true };
  }
  return {
    ready: Object.values(results).every((item) => item.ready),
    tables: results,
  };
}

async function checkLinkedIn(lovableKey: string, connectionKey: string): Promise<Capability> {
  if (!lovableKey || !connectionKey) {
    return {
      key: "linkedin",
      label: "LinkedIn",
      configured: false,
      verified: false,
      publish_capable: false,
      note: "LinkedIn runtime connector key is not detected.",
    };
  }
  try {
    const response = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey },
    });
    const details = await safeJson(response);
    return {
      key: "linkedin",
      label: "LinkedIn",
      configured: true,
      verified: response.ok,
      publish_capable: response.ok,
      note: response.ok ? "Connected LinkedIn identity verified. Publishing still returns its exact API result." : `LinkedIn verification returned ${response.status}.`,
      details: response.ok ? compactIdentity(details) : details,
    };
  } catch (error) {
    return { key: "linkedin", label: "LinkedIn", configured: true, verified: false, publish_capable: false, note: error instanceof Error ? error.message : "LinkedIn verification failed." };
  }
}

async function checkTikTok(lovableKey: string, connectionKey: string): Promise<Capability> {
  if (!lovableKey || !connectionKey) {
    return {
      key: "tiktok",
      label: "TikTok",
      configured: false,
      verified: false,
      publish_capable: false,
      note: "TikTok runtime connector key is not detected.",
    };
  }
  try {
    const response = await fetch(`${GATEWAY}/tiktok/user/info/?fields=open_id,display_name`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey },
    });
    const details = await safeJson(response);
    return {
      key: "tiktok",
      label: "TikTok",
      configured: true,
      verified: response.ok,
      publish_capable: false,
      note: response.ok
        ? "TikTok profile verified. Direct public posting is not enabled until Content Posting API scope/audit is proven."
        : `TikTok verification returned ${response.status}.`,
      details: response.ok ? compactIdentity(details) : details,
    };
  } catch (error) {
    return { key: "tiktok", label: "TikTok", configured: true, verified: false, publish_capable: false, note: error instanceof Error ? error.message : "TikTok verification failed." };
  }
}

async function checkMeta(token: string, pageId: string, igId: string) {
  const facebook: Capability = {
    key: "facebook",
    label: "Facebook Page",
    configured: Boolean(token && pageId),
    verified: false,
    publish_capable: Boolean(token && pageId),
    note: token && pageId ? "Meta token and Facebook Page ID detected; live page verification pending." : "Meta token or Facebook Page ID is missing.",
  };
  const instagram: Capability = {
    key: "instagram",
    label: "Instagram Business",
    configured: Boolean(token && igId),
    verified: false,
    publish_capable: Boolean(token && igId),
    note: token && igId ? "Meta token and Instagram Business Account ID detected; live account verification pending." : "Meta token or Instagram Business Account ID is missing.",
  };
  if (!token) return { facebook, instagram };

  await Promise.all([
    pageId ? verifyMetaObject(pageId, token).then((result) => {
      facebook.verified = result.ok;
      facebook.publish_capable = result.ok;
      facebook.note = result.ok ? "Facebook Page identity verified." : result.note;
      facebook.details = result.details;
    }) : Promise.resolve(),
    igId ? verifyMetaObject(igId, token).then((result) => {
      instagram.verified = result.ok;
      instagram.publish_capable = result.ok;
      instagram.note = result.ok ? "Instagram Business identity verified." : result.note;
      instagram.details = result.details;
    }) : Promise.resolve(),
  ]);

  return { facebook, instagram };
}

async function verifyMetaObject(id: string, token: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(id)}?fields=id,name,username&access_token=${encodeURIComponent(token)}`);
    const details = await safeJson(response);
    return { ok: response.ok, note: response.ok ? "Verified" : `Meta verification returned ${response.status}.`, details: response.ok ? compactIdentity(details) : details };
  } catch (error) {
    return { ok: false, note: error instanceof Error ? error.message : "Meta verification failed.", details: null };
  }
}

function compactIdentity(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  return {
    id: source.id ?? source.sub ?? source.open_id ?? null,
    name: source.name ?? source.display_name ?? source.username ?? null,
  };
}

async function safeJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text.slice(0, 500); }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
