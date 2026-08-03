import { createClient } from "npm:@supabase/supabase-js@2";

export const PINTEREST_API = "https://api.pinterest.com/v5";
export const PINTEREST_OAUTH_URL = "https://www.pinterest.com/oauth/";
export const PINTEREST_TOKEN_URL = `${PINTEREST_API}/oauth/token`;
export const PINTEREST_SCOPES = "boards:read,pins:read,pins:write,user_accounts:read";
export const PINTEREST_CALLBACK_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/pinterest-oauth-callback";

export type TokenBundle = {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string | null;
  scope?: string | null;
  expires_in?: number | null;
  refresh_token_expires_in?: number | null;
  refresh_token_expires_at?: number | null;
};

type Cipher = { cipher: string; iv: string };

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || "",
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: userData } = await client.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data: role } = await client.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return role ? user : null;
}

export function appCredentials() {
  const appId = Deno.env.get("PINTEREST_APP_ID") || "";
  const appSecret = Deno.env.get("PINTEREST_APP_SECRET") || "";
  if (!appId || !appSecret) throw new Error("pinterest_runtime_not_configured");
  return { appId, appSecret };
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function tokenKey(appSecret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`irha-pinterest-oauth:${appSecret}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string, appSecret: string): Promise<Cipher> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenKey(appSecret);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return { cipher: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

export async function decryptSecret(cipher: string, iv: string, appSecret: string) {
  const key = await tokenKey(appSecret);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, key, base64ToBytes(cipher));
  return new TextDecoder().decode(decrypted);
}

export async function storeTokenBundle(bundle: TokenBundle, connectedBy?: string | null) {
  const { appSecret } = appCredentials();
  const service = serviceClient();
  const access = await encryptSecret(bundle.access_token, appSecret);
  const refresh = bundle.refresh_token ? await encryptSecret(bundle.refresh_token, appSecret) : null;
  const now = Date.now();
  const accessExpiresAt = bundle.expires_in ? new Date(now + bundle.expires_in * 1000).toISOString() : null;
  const refreshExpiresAt = bundle.refresh_token_expires_at
    ? new Date(bundle.refresh_token_expires_at * 1000).toISOString()
    : bundle.refresh_token_expires_in
      ? new Date(now + bundle.refresh_token_expires_in * 1000).toISOString()
      : null;

  const { error } = await service.from("pinterest_oauth_credentials").upsert({
    id: "default",
    access_token_cipher: access.cipher,
    access_token_iv: access.iv,
    refresh_token_cipher: refresh?.cipher ?? null,
    refresh_token_iv: refresh?.iv ?? null,
    token_type: bundle.token_type || "bearer",
    scope: bundle.scope || null,
    access_token_expires_at: accessExpiresAt,
    refresh_token_expires_at: refreshExpiresAt,
    connected_by: connectedBy || null,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`pinterest_token_store_failed:${error.message}`);
}

async function refreshAccessToken(refreshToken: string) {
  const { appId, appSecret } = appCredentials();
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
  const basic = btoa(`${appId}:${appSecret}`);
  const response = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.access_token !== "string") throw new Error(`pinterest_refresh_failed:${response.status}`);
  await storeTokenBundle(payload);
  return payload.access_token as string;
}

export async function getAccessToken() {
  const { appSecret } = appCredentials();
  const service = serviceClient();
  const { data, error } = await service.from("pinterest_oauth_credentials").select("*").eq("id", "default").maybeSingle();
  if (error) throw new Error(`pinterest_token_read_failed:${error.message}`);
  if (!data) throw new Error("pinterest_not_connected");

  const expiresAt = data.access_token_expires_at ? new Date(data.access_token_expires_at).getTime() : 0;
  if (expiresAt && expiresAt - Date.now() < 60 * 60 * 1000) {
    if (!data.refresh_token_cipher || !data.refresh_token_iv) throw new Error("pinterest_refresh_token_missing");
    const refreshToken = await decryptSecret(data.refresh_token_cipher, data.refresh_token_iv, appSecret);
    return refreshAccessToken(refreshToken);
  }
  return decryptSecret(data.access_token_cipher, data.access_token_iv, appSecret);
}

export function safeJson(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
