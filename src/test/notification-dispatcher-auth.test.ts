import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  authorizeSchedulerRequest,
  NOTIFICATION_SCHEDULER_HEADER,
} from "../../supabase/functions/notification-dispatcher/auth";

const validToken = "0f7f1773-4ff1-4b2e-8d60-67e69b3bcf4f";

function request(headers: Record<string, string> = {}) {
  return new Request("https://example.test/functions/v1/notification-dispatcher", {
    method: "POST",
    headers,
  });
}

describe("notification-dispatcher scheduler authentication", () => {
  it("rejects a missing scheduler credential without consulting the database", async () => {
    const consume = vi.fn(async () => true);
    await expect(authorizeSchedulerRequest(request(), consume)).resolves.toEqual({
      ok: false,
      code: "scheduler_credential_required",
    });
    expect(consume).not.toHaveBeenCalled();
  });

  it("rejects malformed credentials before token consumption", async () => {
    const consume = vi.fn(async () => true);
    await expect(authorizeSchedulerRequest(request({
      [NOTIFICATION_SCHEDULER_HEADER]: "not-a-capability",
    }), consume)).resolves.toEqual({
      ok: false,
      code: "scheduler_credential_malformed",
    });
    expect(consume).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired credential", async () => {
    const consume = vi.fn(async () => false);
    await expect(authorizeSchedulerRequest(request({
      [NOTIFICATION_SCHEDULER_HEADER]: validToken,
    }), consume)).resolves.toEqual({
      ok: false,
      code: "scheduler_credential_invalid",
    });
    expect(consume).toHaveBeenCalledWith(validToken);
  });

  it("permits a valid database-issued credential", async () => {
    const consume = vi.fn(async () => true);
    await expect(authorizeSchedulerRequest(request({
      [NOTIFICATION_SCHEDULER_HEADER]: validToken,
    }), consume)).resolves.toEqual({ ok: true });
  });

  it("rejects replay after the one-time credential has been consumed", async () => {
    let available = true;
    const consume = vi.fn(async () => {
      if (!available) return false;
      available = false;
      return true;
    });
    const req = request({ [NOTIFICATION_SCHEDULER_HEADER]: validToken });

    await expect(authorizeSchedulerRequest(req, consume)).resolves.toEqual({ ok: true });
    await expect(authorizeSchedulerRequest(req, consume)).resolves.toEqual({
      ok: false,
      code: "scheduler_credential_invalid",
    });
  });

  it("does not treat an ordinary bearer token as scheduler authority", async () => {
    const consume = vi.fn(async () => true);
    await expect(authorizeSchedulerRequest(request({
      authorization: "Bearer ordinary-authenticated-user-token",
    }), consume)).resolves.toEqual({
      ok: false,
      code: "scheduler_credential_required",
    });
    expect(consume).not.toHaveBeenCalled();
  });
});

describe("notification-dispatcher authorization order", () => {
  const source = readFileSync(resolve(
    process.cwd(),
    "supabase/functions/notification-dispatcher/index.ts",
  ), "utf8");

  it("authorizes process requests before creating the service-role client", () => {
    const processBranch = source.slice(source.indexOf('if (text(body.action, 80) === "process")'));
    const authorizeAt = processBranch.indexOf("authorizeSchedulerRequest(req, consumeSchedulerToken)");
    const serviceAt = processBranch.indexOf("const service = createServiceClient()");
    const queueAt = processBranch.indexOf("processOutbox(service");

    expect(authorizeAt).toBeGreaterThanOrEqual(0);
    expect(serviceAt).toBeGreaterThan(authorizeAt);
    expect(queueAt).toBeGreaterThan(serviceAt);
  });

  it("verifies Auth and the database admin role before admin service access", () => {
    const adminBranch = source.slice(source.lastIndexOf("const user = await requireAdmin(req)"));
    const adminAt = adminBranch.indexOf("const user = await requireAdmin(req)");
    const serviceAt = adminBranch.indexOf("const service = createServiceClient()");
    const actionAt = adminBranch.indexOf("adminAction(service, user");

    expect(adminAt).toBeGreaterThanOrEqual(0);
    expect(serviceAt).toBeGreaterThan(adminAt);
    expect(actionAt).toBeGreaterThan(serviceAt);
  });

  it("keeps the service-role client out of module initialization", () => {
    expect(source).not.toContain("const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY");
  });
});

describe("notification scheduler migration contract", () => {
  const migration = readFileSync(resolve(
    process.cwd(),
    "supabase/migrations/20260727223000_authenticate_notification_dispatcher_processing.sql",
  ), "utf8");

  it("uses an atomic single-use expiry-checked token consume", () => {
    expect(migration).toContain("consumed_at is null");
    expect(migration).toContain("expires_at > clock_timestamp()");
    expect(migration).toContain("set consumed_at = clock_timestamp()");
  });

  it("passes only the one-time capability from cron and denies browser table access", () => {
    expect(migration).toContain("x-irha-notification-token");
    expect(migration).toContain("revoke all on table public.notification_dispatch_tokens from public, anon, authenticated");
    expect(migration).toContain("revoke all on function public.notification_dispatch_tick() from public, anon, authenticated");
  });
});
