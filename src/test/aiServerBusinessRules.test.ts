import { describe, expect, it } from "vitest";
import {
  actionGuard,
  containsCommercialCommitment,
  loadAiBusinessRules,
  missingRequiredRules,
  type AiBusinessRulesState,
} from "../../supabase/functions/_shared/ai-business-rules";

const completeRules = {
  company: {
    legalName: "Irha Apparels",
    businessModel: "B2B apparel manufacturing",
    priorityMarkets: ["Germany"],
  },
  commercial: {
    supportedCurrencies: ["EUR"],
    moqPolicy: "Confirm after review",
    samplePolicy: "Confirm after review",
    leadTimePolicy: "Factory review required",
    shippingPolicy: "Confirm destination and scope",
    incoterms: ["FOB"],
    paymentTerms: ["Owner-approved terms"],
  },
  manufacturing: {
    verifiedMaterials: ["Buyer-approved material specification"],
    packagingOptions: ["Export carton after review"],
  },
  authority: {
    socialDraft: "draft",
    socialPublish: "owner",
    listingUpdate: "owner",
  },
  prohibitedClaims: ["Do not invent price"],
  escalationNotes: "Escalate commercial commitments to the owner.",
};

function state(overrides: Partial<AiBusinessRulesState> = {}): AiBusinessRulesState {
  return {
    available: true,
    approved: true,
    complete: true,
    id: "default",
    version: 3,
    status: "approved",
    approvedAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
    rules: completeRules,
    missing: [],
    error: null,
    ...overrides,
  };
}

describe("server-side AI Business Rules guard", () => {
  it("requires all commercial and manufacturing facts", () => {
    expect(missingRequiredRules({ company: { legalName: "Irha Apparels" } })).toContain("Incoterms");
    expect(missingRequiredRules(completeRules)).toEqual([]);
  });

  it("downgrades execution when rules are draft or incomplete", () => {
    const guard = actionGuard("social_publish", { productId: "p1", channels: ["linkedin"] }, "Publish approved post", state({ approved: false, status: "draft" }));
    expect(guard.requiresApproval).toBe(true);
    expect(guard.executable).toBe(false);
    expect(guard.reason).toContain("Approved Business Rules required");
  });

  it("allows supported external execution only with approved rules and owner approval", () => {
    const social = actionGuard("social_publish", { productId: "p1", channels: ["linkedin"] }, "Publish reviewed product post", state());
    expect(social.authority).toBe("owner");
    expect(social.requiresApproval).toBe(true);
    expect(social.executable).toBe(true);

    const listing = actionGuard("listing_task", { platform: "Europages", next_action: "Verify profile" }, "Update internal listing registry", state());
    expect(listing.executable).toBe(true);
  });

  it("never exposes draft-only actions as externally executable", () => {
    const guard = actionGuard("social_content_pack", { captions: {} }, "Prepare captions", state());
    expect(guard.authority).toBe("draft");
    expect(guard.executable).toBe(false);
    expect(guard.reason).toContain("plan or draft");
  });

  it("blocks commercial commitments from automated external execution", () => {
    expect(containsCommercialCommitment("Publish final quotation with unit price 18 EUR")).toBe(true);
    expect(containsCommercialCommitment("Prepare a product caption for wholesalers")).toBe(false);

    const guard = actionGuard(
      "listing_task",
      { platform: "Directory", next_action: "Confirm final price and guaranteed delivery date" },
      "Update listing",
      state(),
    );
    expect(guard.executable).toBe(false);
    expect(guard.reason).toContain("commercial commitment");
  });

  it("treats a missing backend table as plan-only instead of crashing", async () => {
    const service = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "relation does not exist" } }),
          }),
        }),
      }),
    };
    const result = await loadAiBusinessRules(service);
    expect(result.available).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.status).toBe("unavailable");
  });
});
