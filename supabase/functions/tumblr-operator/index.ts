import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TUMBLR_AUTH_URL = "https://www.tumblr.com/oauth2/authorize";
const TUMBLR_TOKEN_URL = "https://api.tumblr.com/v2/oauth2/token";
const TUMBLR_API = "https://api.tumblr.com/v2";
const USER_AGENT = "IrhaApparels-Tumblr-Integration/1.0";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function requireAdmin(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData } = await client.auth.getUser(token);
  const user = userData?.user;
  if (!user) return null;
  const { data: role } = await client.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return role ? user : null;
}

function config() {
  return {
    clientId: env("TUMBLR_CLIENT_ID") || env("TUMBLR_CONSUMER_KEY"),
    clientSecret: env("TUMBLR_CLIENT_SECRET") || env("TUMBLR_CONSUMER_SECRET"),
    redirectUri: env("TUMBLR_REDIRECT_URI") || `${env("SUPABASE_URL")}/functions/v1/tumblr-operator?action=callback`,
  };
}

function authorizationUrl(clientId: string, redirectUri: string, state: string, includeRedirect = true) {
  const auth = new URL(TUMBLR_AUTH_URL);
  const params: Record<string, string> = {
    client_id: clientId,
    response_type: "code",
    scope: "basic write offline_access",
    state,
  };
  if (includeRedirect) params.redirect_uri = redirectUri;
  auth.search = new URLSearchParams(params).toString();
  return auth.toString();
}

async function tokenRequest(params: Record<string, string>) {
  const { clientId, clientSecret } = config();
  const response = await fetch(TUMBLR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": USER_AGENT },
    body: new URLSearchParams({ ...params, client_id: clientId, client_secret: clientSecret }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Tumblr token request failed (${response.status})`);
  return body;
}

async function getCredential() {
  const { data, error } = await adminClient().rpc("tumblr_get_tokens");
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function saveCredential(tokens: any) {
  const expiresAt = tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null;
  const { error } = await adminClient().rpc("tumblr_store_tokens", {
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token || "",
    p_token_type: tokens.token_type || "bearer",
    p_scope: tokens.scope || "write offline_access basic",
    p_expires_at: expiresAt,
  });
  if (error) throw error;
}

async function accessToken() {
  const cred = await getCredential();
  if (!cred) throw new Error("Tumblr is not connected");
  const stillValid = cred.expires_at && new Date(cred.expires_at).getTime() > Date.now() + 120_000;
  if (stillValid && cred.access_token) return cred.access_token as string;
  if (!cred.refresh_token) throw new Error("Tumblr refresh token missing");
  const refreshed = await tokenRequest({ grant_type: "refresh_token", refresh_token: cred.refresh_token });
  await saveCredential(refreshed);
  return refreshed.access_token as string;
}

async function tumblrFetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const r = await fetch(`${TUMBLR_API}${path}`, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Tumblr API failed (${r.status})`);
  return body;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "probe";
  const cfg = config();

  if (action === "probe") {
    let connected = false;
    try { connected = Boolean(await getCredential()); } catch { connected = false; }
    return json({ configured: Boolean(cfg.clientId && cfg.clientSecret), connected, redirect_uri: cfg.redirectUri });
  }

  if (action === "bootstrap") {
    if (!cfg.clientId || !cfg.clientSecret) return json({ error: "Tumblr client credentials are not configured" }, 503);
    const token = url.searchParams.get("token") || "";
    if (token.length < 32) return json({ error: "Invalid bootstrap token" }, 403);
    const tokenHash = await sha256Hex(token);
    const { data: bootstrap } = await adminClient().from("tumblr_oauth_bootstrap_tokens").select("token_hash,expires_at,used_at").eq("token_hash", tokenHash).maybeSingle();
    if (!bootstrap || bootstrap.used_at || new Date(bootstrap.expires_at).getTime() < Date.now()) return json({ error: "Bootstrap link is invalid, expired, or already used" }, 403);
    const state = `nr_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: stateError } = await adminClient().from("tumblr_oauth_states").insert({ state, expires_at: expiresAt });
    if (stateError) return json({ error: "Unable to start Tumblr authorization" }, 500);
    const { error: usedError } = await adminClient().from("tumblr_oauth_bootstrap_tokens").update({ used_at: new Date().toISOString() }).eq("token_hash", tokenHash).is("used_at", null);
    if (usedError) return json({ error: "Unable to consume authorization link" }, 500);
    return Response.redirect(authorizationUrl(cfg.clientId, cfg.redirectUri, state, false), 302);
  }

  if (action === "callback") {
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const { data: stateRow } = await adminClient().from("tumblr_oauth_states").select("state,expires_at,used_at").eq("state", state).maybeSingle();
    if (!code || !stateRow || stateRow.used_at || new Date(stateRow.expires_at).getTime() < Date.now()) return json({ error: "Invalid or expired OAuth state" }, 400);
    const params: Record<string, string> = { grant_type: "authorization_code", code };
    if (!state.startsWith("nr_")) params.redirect_uri = cfg.redirectUri;
    const tokens = await tokenRequest(params);
    await saveCredential(tokens);
    await adminClient().from("tumblr_oauth_states").update({ used_at: new Date().toISOString() }).eq("state", state);
    return new Response("Tumblr connected to Irha Apparels. You may close this tab.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const admin = await requireAdmin(req);
  if (!admin) return json({ error: "Forbidden — admin only" }, 403);

  if (action === "start") {
    if (!cfg.clientId || !cfg.clientSecret) return json({ error: "Tumblr client credentials are not configured in Supabase Edge secrets" }, 503);
    const state = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await adminClient().from("tumblr_oauth_states").insert({ state, expires_at: expiresAt, created_by: admin.id });
    if (error) return json({ error: error.message }, 500);
    return json({ authorize_url: authorizationUrl(cfg.clientId, cfg.redirectUri, state, true), expires_at: expiresAt, redirect_uri: cfg.redirectUri });
  }

  if (action === "health") {
    try {
      const me = await tumblrFetch("/user/info");
      const blog = me?.response?.user?.blogs?.find((b: any) => b.primary) || me?.response?.user?.blogs?.[0];
      return json({ configured: true, connected: true, verified: true, blog: blog ? { name: blog.name, title: blog.title, uuid: blog.uuid, url: blog.url } : null, redirect_uri: cfg.redirectUri });
    } catch (e) {
      return json({ configured: Boolean(cfg.clientId && cfg.clientSecret), connected: Boolean(await getCredential().catch(() => null)), verified: false, error: (e as Error).message, redirect_uri: cfg.redirectUri }, 502);
    }
  }

  if (action === "publish") {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);
    const body = await req.json().catch(() => ({}));
    const blog = String(body.blog || env("TUMBLR_BLOG_IDENTIFIER") || "").trim();
    if (!blog) return json({ error: "blog identifier is required" }, 400);
    const content = Array.isArray(body.content) ? body.content : [];
    if (content.length === 0) return json({ error: "content[] is required" }, 400);
    const payload: Record<string, unknown> = { content, state: body.state === "draft" || body.state === "queue" ? body.state : "published" };
    if (Array.isArray(body.tags)) payload.tags = body.tags.slice(0, 30).map(String);
    if (Array.isArray(body.layout)) payload.layout = body.layout;
    const result = await tumblrFetch(`/blog/${encodeURIComponent(blog)}/posts`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload),
    });
    return json({ success: true, response: result.response || result });
  }

  return json({ error: "Unknown action" }, 400);
});
