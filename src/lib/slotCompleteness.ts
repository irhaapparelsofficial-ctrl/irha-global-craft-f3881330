// PR #4 — Pure slot completeness gate.
//
// Deterministic evaluation of every content-completion gate for a single
// product slot. Never fabricates: if a check has no evidence, the gate is
// red. `publishable` returns true only when every check passes; the
// server-side `publish_slot_ref()` re-verifies the same gates before flipping
// live, so a false client-side pass cannot leak to production.

import {
  isValidReferenceCode,
  type ProductSlot,
} from "./catalogTaxonomyManifest";

export type SlotCompletionInput = {
  referenceCode: string;
  ownerApprovedTitle: string | null;
  factualDescription: string | null;
  taxonomyAssigned: boolean;
  approvedMediaCount: number;
  specSheetReady: boolean;
  ownerSignedOff: boolean;
};

export type GateKey =
  | "reference_code"
  | "owner_approved_title"
  | "factual_description"
  | "taxonomy_assigned"
  | "media_attached"
  | "spec_sheet_ready"
  | "owner_signed_off";

export type GateResult = {
  key: GateKey;
  label: string;
  passed: boolean;
  detail?: string;
};

export type SlotCompletion = {
  referenceCode: string;
  gates: GateResult[];
  publishable: boolean;
  firstBlockingGate: GateKey | null;
};

export const TITLE_MIN = 3;
export const TITLE_MAX = 160;
export const DESC_MIN = 40;
export const DESC_MAX = 6000;

function trim(v: string | null | undefined): string {
  return (v ?? "").trim();
}

export function evaluateSlotCompletion(
  input: SlotCompletionInput,
): SlotCompletion {
  const title = trim(input.ownerApprovedTitle);
  const desc = trim(input.factualDescription);

  const gates: GateResult[] = [
    {
      key: "reference_code",
      label: "Reference code valid",
      passed: isValidReferenceCode(input.referenceCode),
      detail: input.referenceCode,
    },
    {
      key: "owner_approved_title",
      label: `Owner-approved title (${TITLE_MIN}–${TITLE_MAX} chars)`,
      passed: title.length >= TITLE_MIN && title.length <= TITLE_MAX,
      detail: title ? `${title.length} chars` : "missing",
    },
    {
      key: "factual_description",
      label: `Factual description (${DESC_MIN}–${DESC_MAX} chars)`,
      passed: desc.length >= DESC_MIN && desc.length <= DESC_MAX,
      detail: desc ? `${desc.length} chars` : "missing",
    },
    {
      key: "taxonomy_assigned",
      label: "Taxonomy assignment approved",
      passed: input.taxonomyAssigned === true,
    },
    {
      key: "media_attached",
      label: "≥1 approved media asset attached",
      passed: input.approvedMediaCount >= 1,
      detail: `${input.approvedMediaCount} approved`,
    },
    {
      key: "spec_sheet_ready",
      label: "Spec sheet ready",
      passed: input.specSheetReady === true,
    },
    {
      key: "owner_signed_off",
      label: "Owner sign-off recorded",
      passed: input.ownerSignedOff === true,
    },
  ];

  const firstBlocking = gates.find((g) => !g.passed);
  return {
    referenceCode: input.referenceCode,
    gates,
    publishable: !firstBlocking,
    firstBlockingGate: firstBlocking ? firstBlocking.key : null,
  };
}

/** Cross-check a completion row against the immutable manifest slot. */
export function isCompletionAlignedWithManifest(
  completion: SlotCompletion,
  slot: ProductSlot,
): boolean {
  return (
    completion.referenceCode === slot.referenceCode &&
    isValidReferenceCode(slot.referenceCode)
  );
}

/** Rollup for the dashboard: how many of the 206 planned slots are green. */
export function rollupCompletion(
  rows: SlotCompletion[],
  plannedTotal: number,
): {
  total: number;
  publishable: number;
  blocked: number;
  notStarted: number;
  byGate: Record<GateKey, number>;
} {
  const byGate: Record<GateKey, number> = {
    reference_code: 0,
    owner_approved_title: 0,
    factual_description: 0,
    taxonomy_assigned: 0,
    media_attached: 0,
    spec_sheet_ready: 0,
    owner_signed_off: 0,
  };
  let publishable = 0;
  for (const r of rows) {
    if (r.publishable) publishable += 1;
    else if (r.firstBlockingGate) byGate[r.firstBlockingGate] += 1;
  }
  return {
    total: plannedTotal,
    publishable,
    blocked: rows.length - publishable,
    notStarted: Math.max(plannedTotal - rows.length, 0),
    byGate,
  };
}
