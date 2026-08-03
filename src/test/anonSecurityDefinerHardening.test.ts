import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migrationPath =
  "supabase/migrations/20260803213000_reduce_anonymous_security_definer_surface.sql";

describe("IA-SEC-E001 anonymous SECURITY DEFINER hardening", () => {
  it("moves public route and sitemap RPCs to caller privileges", () => {
    const migration = read(migrationPath);
    expect(migration).toContain(
      "alter function public.get_public_catalog_route_manifest() security invoker;",
    );
    expect(migration).toContain(
      "alter function public.get_public_sitemap_entries() security invoker;",
    );
  });

  it("removes anonymous and authenticated token-consume execution", () => {
    const migration = read(migrationPath);
    expect(migration).toContain(
      "revoke execute on function public.notification_consume_dispatch_token(uuid)",
    );
    expect(migration).toContain("from public, anon, authenticated;");
    expect(migration).toContain(
      "grant execute on function public.notification_consume_dispatch_token(uuid)",
    );
    expect(migration).toContain("to service_role;");
  });

  it("uses the existing service-role client for scheduler token consumption", () => {
    const source = read("supabase/functions/notification-dispatcher/index.ts");
    const start = source.indexOf("async function consumeSchedulerToken");
    const end = source.indexOf("function validSubscription", start);
    const block = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("const verifier = createServiceClient();");
    expect(block).not.toContain("createAnonClient()");
  });
});
