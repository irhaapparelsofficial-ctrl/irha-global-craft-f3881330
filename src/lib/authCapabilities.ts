import { redactRuntimeMessage } from "@/lib/runtimeSafety";

export type AuthCapabilityStatus = "checking" | "ready" | "unavailable";

export type AuthServerCapabilities = {
  status: AuthCapabilityStatus;
  emailEnabled: boolean;
  googleEnabled: boolean;
  signupDisabled: boolean | null;
  mailerAutoconfirm: boolean | null;
  source: "supabase-settings" | "unavailable";
  checkedAt: string | null;
  error: string | null;
};

type AuthSettingsPayload = {
  disable_signup?: unknown;
  mailer_autoconfirm?: unknown;
  autoconfirm?: unknown;
  external?: unknown;
};

type AuthErrorLike = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

export const EMPTY_AUTH_CAPABILITIES: AuthServerCapabilities = {
  status: "checking",
  emailEnabled: false,
  googleEnabled: false,
  signupDisabled: null,
  mailerAutoconfirm: null,
  source: "unavailable",
  checkedAt: null,
  error: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseAuthSettings(payload: unknown): AuthServerCapabilities {
  if (!isRecord(payload)) throw new Error("Auth settings returned an invalid response");
  const settings = payload as AuthSettingsPayload;
  const external = isRecord(settings.external) ? settings.external : {};
  return {
    status: "ready",
    emailEnabled: external.email === true,
    googleEnabled: external.google === true,
    signupDisabled: typeof settings.disable_signup === "boolean" ? settings.disable_signup : null,
    mailerAutoconfirm: typeof settings.mailer_autoconfirm === "boolean"
      ? settings.mailer_autoconfirm
      : typeof settings.autoconfirm === "boolean"
        ? settings.autoconfirm
        : null,
    source: "supabase-settings",
    checkedAt: new Date().toISOString(),
    error: null,
  };
}

export async function fetchAuthCapabilities(input: {
  runtimeUrl: string;
  publishableKey: string;
  signal?: AbortSignal;
}): Promise<AuthServerCapabilities> {
  const endpoint = new URL("/auth/v1/settings", input.runtimeUrl);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { apikey: input.publishableKey },
    cache: "no-store",
    signal: input.signal,
  });
  if (!response.ok) throw new Error(`Auth settings returned HTTP ${response.status}`);
  return parseAuthSettings(await response.json());
}

export function unavailableAuthCapabilities(error: unknown): AuthServerCapabilities {
  return {
    ...EMPTY_AUTH_CAPABILITIES,
    status: "unavailable",
    source: "unavailable",
    checkedAt: new Date().toISOString(),
    error: friendlyAuthError(error, "settings"),
  };
}

export function buildAuthRedirect(origin: string, path: "/auth" | "/auth?mode=recovery" | "/admin"): string {
  const base = new URL(origin);
  const localDevelopment = ["localhost", "127.0.0.1", "::1"].includes(base.hostname);
  if (base.protocol !== "https:" && !(localDevelopment && base.protocol === "http:")) {
    throw new Error("Auth redirects require HTTPS");
  }
  base.username = "";
  base.password = "";
  base.pathname = "/";
  base.search = "";
  base.hash = "";
  return new URL(path, base.origin).toString();
}

export function isRecoveryLocation(search: string, hash: string): boolean {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return query.get("mode") === "recovery" || query.get("type") === "recovery" || fragment.get("type") === "recovery";
}

export function friendlyAuthError(error: unknown, action: "password" | "magic" | "reset" | "update" | "google" | "settings"): string {
  const value = isRecord(error) ? error as AuthErrorLike : {};
  const raw = typeof value.message === "string"
    ? value.message
    : error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Authentication request failed";
  const message = redactRuntimeMessage(raw);
  const normalized = message.toLowerCase();

  if (normalized.includes("email logins are disabled") || normalized.includes("email provider is disabled")) {
    return "Email sign-in is disabled in the connected backend. It must be enabled during the final Auth activation.";
  }
  if (normalized.includes("unsupported provider") || normalized.includes("missing oauth secret")) {
    return "Google sign-in is not fully configured. The option stays hidden until real OAuth credentials are verified.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "The owner email or password was not accepted. Check the latest owner password and try again.";
  }
  if (normalized.includes("email rate limit") || normalized.includes("rate limit exceeded") || normalized.includes("too many requests")) {
    return "Too many authentication requests were made. Wait briefly, then retry once.";
  }
  if (normalized.includes("expired") || normalized.includes("otp") && normalized.includes("invalid")) {
    return "This recovery link is expired or invalid. Request a fresh link and open the newest email on this device.";
  }
  if (normalized.includes("password should be at least") || normalized.includes("weak password")) {
    return "The new password does not meet the backend password policy. Use a longer unique password with mixed characters.";
  }
  if (normalized.includes("same password") || normalized.includes("different from the old password")) {
    return "Choose a new password that is different from the current password.";
  }
  if (normalized.includes("signup is disabled") || normalized.includes("signups not allowed")) {
    return "New account creation is disabled. Use only the existing verified owner account.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("load failed")) {
    return "The Auth service could not be reached. Check the connection and retry the configuration check.";
  }
  if (action === "settings") {
    return "Authentication configuration could not be verified. Sign-in controls remain disabled until the check succeeds.";
  }
  if (action === "google") return "Google sign-in could not be started safely.";
  if (action === "magic" || action === "reset") return "The authentication email could not be sent.";
  if (action === "update") return "The new password could not be saved.";
  return "Password sign-in could not be completed.";
}
