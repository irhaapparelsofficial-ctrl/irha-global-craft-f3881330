export type RuntimeIdentity = {
  projectId: string;
  url: string;
};

const TOKEN_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]+/g,
  /service[_-]?role[^\s"']*/gi,
  /sk-[A-Za-z0-9_-]{12,}/g,
  /ya29\.[A-Za-z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function validateRuntimeIdentity(identity: RuntimeIdentity): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9]{20}$/i.test(identity.projectId)) errors.push("invalid Supabase project ID");
  try {
    const url = new URL(identity.url);
    if (url.protocol !== "https:") errors.push("runtime URL must use HTTPS");
    if (url.hostname !== `${identity.projectId}.supabase.co`) errors.push("runtime URL does not match project ID");
    if (url.pathname !== "/" && url.pathname !== "") errors.push("runtime URL must not contain a path");
  } catch {
    errors.push("invalid runtime URL");
  }
  return [...new Set(errors)];
}

export function redactRuntimeMessage(value: unknown): string {
  let message = value instanceof Error ? value.message : typeof value === "string" ? value : "Unknown runtime error";
  for (const pattern of TOKEN_PATTERNS) message = message.replace(pattern, "[redacted]");
  message = message.replace(/([?&](?:token|key|secret|code|access_token|refresh_token)=)[^&\s]+/gi, "$1[redacted]");
  return message.slice(0, 500);
}

export function isDeferredBackendError(value: unknown): boolean {
  const message = redactRuntimeMessage(value).toLowerCase();
  return [
    "failed to send a request to the edge function",
    "function was not found",
    "requested function was not found",
    "edge function not found",
    "failed to fetch",
    "relation does not exist",
    "could not find the table",
    "schema cache",
  ].some((needle) => message.includes(needle));
}

export function isExpectedGatewayProbe(status: number, body: string): boolean {
  const normalized = body.toLowerCase();
  return status === 400 && (normalized.includes("unsupported action") || normalized.includes("invalid action"));
}
