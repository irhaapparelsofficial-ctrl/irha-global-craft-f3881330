export const GSC_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GSC_SITES_LIST_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";

const OAUTH_TIMEOUT_MS = 10_000;
const GOOGLE_REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_EXPIRY_SAFETY_SECONDS = 60;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300;

export type GscOAuthFailureCode =
  | "gsc_oauth_not_configured"
  | "gsc_oauth_invalid_client"
  | "gsc_oauth_reauthorization_required"
  | "gsc_oauth_rate_limited"
  | "gsc_oauth_token_exchange_failed"
  | "gsc_google_request_failed";

export type GscOAuthConfigurationPresence = {
  oauth_client_id: boolean;
  oauth_client_secret: boolean;
  oauth_refresh_token: boolean;
};

type CachedAccessToken = {
  value: string;
  reusableUntilMs: number;
};

type TokenExchangeSuccess = {
  ok: true;
  accessToken: string;
};

type SafeFailure = {
  ok: false;
  code: GscOAuthFailureCode;
  token_exchange: boolean;
  upstream_status?: number;
};

export type GoogleSearchConsoleFetchResult<T> =
  | {
    ok: true;
    token_exchange: true;
    status: number;
    data: T;
  }
  | SafeFailure;

let cachedAccessToken: CachedAccessToken | null = null;

function oauthCredentials() {
  return {
    clientId: Deno.env.get("GSC_OAUTH_CLIENT_ID")?.trim() || "",
    clientSecret: Deno.env.get("GSC_OAUTH_CLIENT_SECRET")?.trim() || "",
    refreshToken: Deno.env.get("GSC_OAUTH_REFRESH_TOKEN")?.trim() || "",
  };
}

export function getGscOAuthConfigurationPresence(): GscOAuthConfigurationPresence {
  const credentials = oauthCredentials();
  return {
    oauth_client_id: Boolean(credentials.clientId),
    oauth_client_secret: Boolean(credentials.clientSecret),
    oauth_refresh_token: Boolean(credentials.refreshToken),
  };
}

function allOAuthCredentialsPresent(presence: GscOAuthConfigurationPresence) {
  return presence.oauth_client_id && presence.oauth_client_secret && presence.oauth_refresh_token;
}

function sanitizedTokenFailure(status: number, oauthError: unknown): SafeFailure {
  if (status === 429) {
    return { ok: false, code: "gsc_oauth_rate_limited", token_exchange: false, upstream_status: status };
  }
  if (oauthError === "invalid_client") {
    return { ok: false, code: "gsc_oauth_invalid_client", token_exchange: false, upstream_status: status };
  }
  if (oauthError === "invalid_grant") {
    return { ok: false, code: "gsc_oauth_reauthorization_required", token_exchange: false, upstream_status: status };
  }
  return { ok: false, code: "gsc_oauth_token_exchange_failed", token_exchange: false, upstream_status: status };
}

async function exchangeRefreshToken(): Promise<TokenExchangeSuccess | SafeFailure> {
  const presence = getGscOAuthConfigurationPresence();
  if (!allOAuthCredentialsPresent(presence)) {
    return { ok: false, code: "gsc_oauth_not_configured", token_exchange: false };
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.reusableUntilMs > now) {
    return { ok: true, accessToken: cachedAccessToken.value };
  }
  cachedAccessToken = null;

  const credentials = oauthCredentials();
  const form = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT_MS);

  try {
    const response = await fetch(GSC_OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      return sanitizedTokenFailure(response.status, payload?.error);
    }

    const accessToken = typeof payload?.access_token === "string" ? payload.access_token.trim() : "";
    const tokenType = payload?.token_type;
    const expiresIn = payload?.expires_in;
    if (!accessToken) {
      return { ok: false, code: "gsc_oauth_token_exchange_failed", token_exchange: false, upstream_status: response.status };
    }
    if (tokenType !== undefined && (typeof tokenType !== "string" || tokenType.toLowerCase() !== "bearer")) {
      return { ok: false, code: "gsc_oauth_token_exchange_failed", token_exchange: false, upstream_status: response.status };
    }
    if (expiresIn !== undefined && (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0)) {
      return { ok: false, code: "gsc_oauth_token_exchange_failed", token_exchange: false, upstream_status: response.status };
    }

    const lifetimeSeconds = typeof expiresIn === "number" ? expiresIn : DEFAULT_TOKEN_LIFETIME_SECONDS;
    const reusableSeconds = Math.max(0, lifetimeSeconds - TOKEN_EXPIRY_SAFETY_SECONDS);
    cachedAccessToken = {
      value: accessToken,
      reusableUntilMs: now + reusableSeconds * 1000,
    };
    return { ok: true, accessToken };
  } catch {
    return { ok: false, code: "gsc_oauth_token_exchange_failed", token_exchange: false };
  } finally {
    clearTimeout(timeout);
  }
}

function isApprovedGoogleSearchConsoleUrl(value: string) {
  if (value === GSC_SITES_LIST_ENDPOINT) return true;
  if (value === "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect") return true;
  if (/^https:\/\/www\.googleapis\.com\/webmasters\/v3\/sites\/[^/]+\/searchAnalytics\/query$/.test(value)) return true;
  return /^https:\/\/www\.googleapis\.com\/webmasters\/v3\/sites\/[^/]+\/sitemaps(?:\/[^/?#]+)?$/.test(value);
}

export async function googleSearchConsoleFetch<T>(
  url: string,
  init: Omit<RequestInit, "signal"> = {},
): Promise<GoogleSearchConsoleFetchResult<T>> {
  if (!isApprovedGoogleSearchConsoleUrl(url)) {
    return { ok: false, code: "gsc_google_request_failed", token_exchange: false };
  }
  const token = await exchangeRefreshToken();
  if (!token.ok) return token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_REQUEST_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token.accessToken}`);

  try {
    const response = await fetch(url, { ...init, headers, signal: controller.signal });
    if (!response.ok) {
      return {
        ok: false,
        code: "gsc_google_request_failed",
        token_exchange: true,
        upstream_status: response.status,
      };
    }
    const data = await response.json().catch(() => null) as T;
    return { ok: true, token_exchange: true, status: response.status, data };
  } catch {
    return { ok: false, code: "gsc_google_request_failed", token_exchange: true };
  } finally {
    clearTimeout(timeout);
  }
}
