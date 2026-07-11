export type AiBusinessRulesState = {
  available: boolean;
  approved: boolean;
  complete: boolean;
  id: string | null;
  version: number | null;
  status: string;
  approvedAt: string | null;
  updatedAt: string | null;
  rules: Record<string, unknown>;
  missing: string[];
  error: string | null;
};

export type ActionGuard = {
  authority: "auto" | "draft" | "owner";
  requiresApproval: boolean;
  executable: boolean;
  reason: string | null;
};

const EXTERNAL_ACTIONS = new Set(["social_publish", "listing_task"]);
const HARD_OWNER_ACTIONS = new Set(["social_publish", "listing_task"]);
const COMMERCIAL_COMMITMENT_PATTERN = /\b(final\s+(?:price|quotation|quote)|unit\s+price|total\s+value|discount|payment\s+terms?|deposit\s+terms?|guaranteed?\s+(?:delivery|lead\s*time)|production\s+(?:date|commitment)|delivery\s+(?:date|commitment)|complaint\s+settlement|refund\s+amount|compensation\s+amount|MOQ\s*[:=]?\s*\d+)\b/i;

const REQUIRED_RULES: Array<{ label: string; path: string[] }> = [
  { label: "Company identity", path: ["company", "legalName"] },
  { label: "Business model", path: ["company", "businessModel"] },
  { label: "Priority markets", path: ["company", "priorityMarkets"] },
  { label: "Supported currencies", path: ["commercial", "supportedCurrencies"] },
  { label: "MOQ policy", path: ["commercial", "moqPolicy"] },
  { label: "Sample policy", path: ["commercial", "samplePolicy"] },
  { label: "Lead-time policy", path: ["commercial", "leadTimePolicy"] },
  { label: "Shipping policy", path: ["commercial", "shippingPolicy"] },
  { label: "Incoterms", path: ["commercial", "incoterms"] },
  { label: "Payment terms", path: ["commercial", "paymentTerms"] },
  { label: "Verified materials", path: ["manufacturing", "verifiedMaterials"] },
  { label: "Packaging options", path: ["manufacturing", "packagingOptions"] },
  { label: "Prohibited claims", path: ["prohibitedClaims"] },
  { label: "Escalation rules", path: ["escalationNotes"] },
];

const AUTHORITY_BY_ACTION: Record<string, string> = {
  social_content_pack: "socialDraft",
  social_publish: "socialPublish",
  lead_campaign_plan: "listingDraft",
  listing_task: "listingUpdate",
  buyer_reply_draft: "qualificationQuestions",
  seo_localization_plan: "seoDraft",
  weekly_growth_plan: "listingDraft",
  outreach_campaign_plan: "listingDraft",
};

export async function loadAiBusinessRules(service: any): Promise<AiBusinessRulesState> {
  try {
    const { data, error } = await service
      .from("ai_business_rules")
      .select("id,version,status,rules,approved_at,updated_at")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      return emptyState("unavailable", error.message || "Business Rules table unavailable", false);
    }
    if (!data) {
      return emptyState("missing", null, true);
    }

    const rules = isRecord(data.rules) ? data.rules : {};
    const missing = missingRequiredRules(rules);
    const complete = missing.length === 0;
    const approved = data.status === "approved" && complete;

    return {
      available: true,
      approved,
      complete,
      id: typeof data.id === "string" ? data.id : "default",
      version: typeof data.version === "number" ? data.version : null,
      status: typeof data.status === "string" ? data.status : "draft",
      approvedAt: typeof data.approved_at === "string" ? data.approved_at : null,
      updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
      rules,
      missing,
      error: null,
    };
  } catch (error) {
    return emptyState("unavailable", error instanceof Error ? error.message : "Business Rules table unavailable", false);
  }
}

export function missingRequiredRules(rules: Record<string, unknown>) {
  return REQUIRED_RULES.filter((item) => !hasValue(readPath(rules, item.path))).map((item) => item.label);
}

export function actionGuard(actionType: string, payload: unknown, description: unknown, state: AiBusinessRulesState): ActionGuard {
  const authority = actionAuthority(actionType, state.rules);
  const commercialCommitment = containsCommercialCommitment({ payload, description });
  const requiresApproval = HARD_OWNER_ACTIONS.has(actionType) || authority === "owner" || commercialCommitment;

  if (!state.approved) {
    return {
      authority,
      requiresApproval,
      executable: false,
      reason: state.available
        ? `Approved Business Rules required; current status is ${state.status}${state.missing.length ? ` (${state.missing.join(", ")})` : ""}.`
        : "Business Rules backend is unavailable.",
    };
  }

  if (!EXTERNAL_ACTIONS.has(actionType)) {
    return {
      authority,
      requiresApproval,
      executable: false,
      reason: "This action is a plan or draft and has no external executor.",
    };
  }

  if (commercialCommitment) {
    return {
      authority: "owner",
      requiresApproval: true,
      executable: false,
      reason: "Payload contains a commercial commitment. Final price, terms and delivery commitments must be handled outside automated external execution.",
    };
  }

  return { authority, requiresApproval: true, executable: true, reason: null };
}

export function actionAuthority(actionType: string, rules: Record<string, unknown>): "auto" | "draft" | "owner" {
  if (HARD_OWNER_ACTIONS.has(actionType)) return "owner";
  const authority = isRecord(rules.authority) ? rules.authority : {};
  const key = AUTHORITY_BY_ACTION[actionType];
  const value = key ? authority[key] : null;
  return value === "auto" || value === "owner" ? value : "draft";
}

export function containsCommercialCommitment(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
  return COMMERCIAL_COMMITMENT_PATTERN.test(text);
}

export function rulesPromptSnapshot(state: AiBusinessRulesState) {
  return {
    available: state.available,
    approved: state.approved,
    complete: state.complete,
    id: state.id,
    version: state.version,
    status: state.status,
    approved_at: state.approvedAt,
    updated_at: state.updatedAt,
    missing: state.missing,
    rules: state.rules,
  };
}

export function rulesReference(state: AiBusinessRulesState) {
  return {
    id: state.id,
    version: state.version,
    status: state.status,
    approved: state.approved,
    updated_at: state.updatedAt,
  };
}

function emptyState(status: string, error: string | null, available: boolean): AiBusinessRulesState {
  return {
    available,
    approved: false,
    complete: false,
    id: null,
    version: null,
    status,
    approvedAt: null,
    updatedAt: null,
    rules: {},
    missing: REQUIRED_RULES.map((item) => item.label),
    error,
  };
}

function readPath(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
