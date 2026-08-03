import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  appCredentials,
  PINTEREST_CALLBACK_URL,
  PINTEREST_TOKEN_URL,
  safeJson,
  serviceClient,
  sha256Hex,
  storeTokenBundle,
} from "../_shared/pinterest.ts";

const SUCCESS_REDIRECT = "https://irhaapparels.com/admin?integration=pinterest&status=connected";
const FAILURE_REDIRECT = "https://irhaapparels.com/admin?integration=pinterest&status=failed";

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return safeJson({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const providerError = url.searchParams.get("error") || "";
    if (providerError || !code || !state) return Response.redirect(FAILURE_REDIRECT, 302);

    const service = serviceClient();
    const stateHash = await sha256Hex(state);
    const { data: stateRow, error: stateError } = await service
      .from("pinterest_oauth_states")
      .select("state_hash,requested_by,expires_at,used_at")
      .eq("state_hash", stateHash)
      .maybeSingle();

    if (stateError || !stateRow || stateRow.used_at || new Date(stateRow.expires_at).getTime() <= Date.now()) {
      return Response.redirect(FAILURE_REDIRECT, 302);
    }

    const { error: consumeError } = await service
      .from("pinterest_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state_hash", stateHash)
      .is("used_at", null);
    if (consumeError) return Response.redirect(FAILURE_REDIRECT, 302);

    const { appId, appSecret } = appCredentials();
    const tokenResponse = await fetch(PINTEREST_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: PINTEREST_CALLBACK_URL,
      }),
    });
    const payload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof payload?.access_token !== "string") {
      console.error("pinterest_oauth_exchange_failed", tokenResponse.status);
      return Response.redirect(FAILURE_REDIRECT, 302);
    }

    await storeTokenBundle(payload, stateRow.requested_by || null);
    await service.from("pinterest_oauth_states").delete().lt("expires_at", new Date().toISOString());
    return Response.redirect(SUCCESS_REDIRECT, 302);
  } catch (error) {
    console.error("pinterest_oauth_callback_failed", error instanceof Error ? error.message : "unknown");
    return Response.redirect(FAILURE_REDIRECT, 302);
  }
});
