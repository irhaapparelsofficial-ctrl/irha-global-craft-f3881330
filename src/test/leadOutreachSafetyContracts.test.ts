import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("lead and outreach safety contracts", () => {
  it("caps owner activation at 25 in backend and UI", () => {
    const backend = read("supabase/functions/lead-activation-channel-v2/index.ts");
    const panel = read("src/components/admin/ChannelCandidateActivationPanel.tsx");
    expect(backend).toContain("const MAX_BATCH = 25;");
    expect(panel).toContain("slice(0, 25)");
    expect(panel).not.toContain("slice(0, 50)");
    expect(panel).toContain("next.size < 25");
  });

  it("atomically claims candidates and releases stale locks", () => {
    const backend = read("supabase/functions/lead-activation-channel-v2/index.ts");
    const migration = read("supabase/migrations/20260714122000_lead_activation_claims.sql");
    expect(backend).toContain('service.rpc("claim_lead_candidates_for_activation"');
    expect(backend).toContain('.eq("activation_claim_token", claimToken)');
    expect(migration).toContain("activation_claim_token uuid");
    expect(migration).toContain("interval '15 minutes'");
    expect(migration).toContain("limit least(greatest(coalesce(p_limit, 25), 1), 25)");
  });

  it("keeps current-campaign identity maps active after fingerprint checks", () => {
    const staging = read("supabase/functions/lead-bulk-stage/index.ts");
    expect(staging).not.toMatch(/currentFingerprints\.set\([^;]+;\s*continue;/);
  });

  it("requires backend owner confirmation and an optimistic dispatch claim", () => {
    const backend = read("supabase/functions/outreach-workflow-v2/index.ts");
    const panel = read("src/components/admin/OutreachApprovalPanel.tsx");
    expect(backend).toContain("body.owner_confirmed !== true");
    expect(backend).toContain('.eq("status", message.status)');
    expect(backend).toContain('.eq("updated_at", message.updated_at)');
    expect(panel).toContain("owner_confirmed: true");
  });

  it("blocks automatic WhatsApp retry after any primary delivery attempt", () => {
    const backend = read("supabase/functions/outreach-workflow-v2/index.ts");
    expect(backend).toContain("primary_attempted: true");
    expect(backend).toContain("Automatic retry is blocked to prevent duplicate text");
    expect(backend).toContain("Primary WhatsApp text was sent");
    expect(backend).toContain('status: "manual_required"');
  });
});
