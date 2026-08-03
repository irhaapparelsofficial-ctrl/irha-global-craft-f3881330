import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  appCredentials,
  PINTEREST_CALLBACK_URL,
  PINTEREST_OAUTH_URL,
  PINTEREST_SCOPES,
  serviceClient,
  sha256Hex,
} from "../_shared/pinterest.ts";

const FAILURE_REDIRECT = "https://irhaapparels.com/admin?integration=pinterest&status=failed";

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return Response.redirect(FAILURE_REDIRECT, 302);

  try {
    const url = new URL(req.url);
    const bootstrapToken = url.searchParams.get("token") || "";
    if (!/^[A-Za-z0-9_-]{40,120}$/.test(bootstrapToken)) return Response.redirect(FAILURE_REDIRECT, 302);

    const service = serviceClient();
    const tokenHash = await sha256Hex(bootstrapToken);
    const now = new Date();
    const { data: tokenRow, error: tokenError } = await service
      .from("pinterest_oauth_bootstrap_tokens")
      .select("token_hash,expires_at,used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at).getTime() <= now.getTime()) {
      return Response.redirect(FAILURE_REDIRECT, 302);
    }

    const { data: consumed, error: consumeError } = await service
      .from("pinterest_oauth_bootstrap_tokens")
      .update({ used_at: now.toISOString() })
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .select("token_hash")
      .maybeSingle();
    if (consumeError || !consumed) return Response.redirect(FAILURE_REDIRECT, 302);

    const state = randomToken(32);
    const stateHash = await sha256Hex(state);
    const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: stateError } = await service.from("pinterest_oauth_states").insert({
      state_hash: stateHash,
      requested_by: null,
      expires_at: stateExpiresAt,
    });
    if (stateError) return Response.redirect(FAILURE_REDIRECT, 302);

    const { appId } = appCredentials();
    const pinterest = new URL(PINTEREST_OAUTH_URL);
    pinterest.searchParams.set("client_id", appId);
    pinterest.searchParams.set("redirect_uri", PINTEREST_CALLBACK_URL);
    pinterest.searchParams.set("response_type", "code");
    pinterest.searchParams.set("scope", PINTEREST_SCOPES);
    pinterest.searchParams.set("state", state);
    return Response.redirect(pinterest.toString(), 302);
  } catch (error) {
    console.error("pinterest_oauth_start_failed", error instanceof Error ? error.message : "unknown");
    return Response.redirect(FAILURE_REDIRECT, 302);
  }
});

function randomToken(bytes: number) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
