export const NOTIFICATION_SCHEDULER_HEADER = "x-irha-notification-token";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SchedulerAuthorizationResult =
  | { ok: true }
  | {
      ok: false;
      code: "scheduler_credential_required" | "scheduler_credential_malformed" | "scheduler_credential_invalid";
    };

export type ConsumeSchedulerToken = (token: string) => Promise<boolean>;

export function schedulerTokenFromRequest(req: Request): string | null {
  const token = req.headers.get(NOTIFICATION_SCHEDULER_HEADER)?.trim() || "";
  return UUID_PATTERN.test(token) ? token : null;
}

export async function authorizeSchedulerRequest(
  req: Request,
  consumeToken: ConsumeSchedulerToken,
): Promise<SchedulerAuthorizationResult> {
  const rawToken = req.headers.get(NOTIFICATION_SCHEDULER_HEADER)?.trim() || "";
  if (!rawToken) return { ok: false, code: "scheduler_credential_required" };

  const token = schedulerTokenFromRequest(req);
  if (!token) return { ok: false, code: "scheduler_credential_malformed" };

  const consumed = await consumeToken(token);
  return consumed
    ? { ok: true }
    : { ok: false, code: "scheduler_credential_invalid" };
}
