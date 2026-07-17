import { describe, expect, it } from "vitest";
import {
  evaluateSlotCompletion,
  rollupCompletion,
  type SlotCompletionInput,
} from "./slotCompleteness";

const GREEN: SlotCompletionInput = {
  referenceCode: "IRHA-BAV-MN-LHS-001",
  ownerApprovedTitle: "Herren Lederhose Kurz — Antique Brown",
  factualDescription:
    "Full-grain suede lederhose, hand-embroidered yoke, brass hardware, made to order per confirmed program specification.",
  taxonomyAssigned: true,
  approvedMediaCount: 3,
  specSheetReady: true,
  ownerSignedOff: true,
};

describe("evaluateSlotCompletion", () => {
  it("passes every gate when input is complete", () => {
    const r = evaluateSlotCompletion(GREEN);
    expect(r.publishable).toBe(true);
    expect(r.firstBlockingGate).toBeNull();
    expect(r.gates.every((g) => g.passed)).toBe(true);
  });

  it("blocks on missing title", () => {
    const r = evaluateSlotCompletion({ ...GREEN, ownerApprovedTitle: null });
    expect(r.publishable).toBe(false);
    expect(r.firstBlockingGate).toBe("owner_approved_title");
  });

  it("blocks on short description", () => {
    const r = evaluateSlotCompletion({
      ...GREEN,
      factualDescription: "too short",
    });
    expect(r.publishable).toBe(false);
    expect(r.firstBlockingGate).toBe("factual_description");
  });

  it("blocks on zero approved media (never allows incomplete slot public)", () => {
    const r = evaluateSlotCompletion({ ...GREEN, approvedMediaCount: 0 });
    expect(r.publishable).toBe(false);
    expect(r.firstBlockingGate).toBe("media_attached");
  });

  it("blocks on missing owner sign-off even when everything else is green", () => {
    const r = evaluateSlotCompletion({ ...GREEN, ownerSignedOff: false });
    expect(r.publishable).toBe(false);
    expect(r.firstBlockingGate).toBe("owner_signed_off");
  });

  it("rejects a fabricated / malformed reference code", () => {
    const r = evaluateSlotCompletion({
      ...GREEN,
      referenceCode: "not-a-real-code",
    });
    expect(r.publishable).toBe(false);
    expect(r.firstBlockingGate).toBe("reference_code");
  });

  it("rollup counts publishable vs blocked vs not-started against 206 target", () => {
    const rows = [
      evaluateSlotCompletion(GREEN),
      evaluateSlotCompletion({ ...GREEN, ownerSignedOff: false }),
      evaluateSlotCompletion({ ...GREEN, approvedMediaCount: 0 }),
    ];
    const roll = rollupCompletion(rows, 206);
    expect(roll.total).toBe(206);
    expect(roll.publishable).toBe(1);
    expect(roll.blocked).toBe(2);
    expect(roll.notStarted).toBe(203);
    expect(roll.byGate.owner_signed_off).toBe(1);
    expect(roll.byGate.media_attached).toBe(1);
  });

  it("description over the max limit is rejected", () => {
    const r = evaluateSlotCompletion({
      ...GREEN,
      factualDescription: "x".repeat(6001),
    });
    expect(r.firstBlockingGate).toBe("factual_description");
  });
});
