import { describe, expect, it } from "vitest";
import {
  applyVisualPreset,
  buildPostingSlots,
  DEFAULT_SOCIAL_AUTOPILOT_SETTINGS,
  IRHA_SOCIAL_VISUAL_PRESET,
  rankAutopilotProducts,
  reelSceneContract,
  settingsFingerprint,
  truthfulChannelStatus,
  weekKey,
} from "@/lib/socialAutopilot";

describe("social autopilot approval queue", () => {
  it("rotates categories, prioritizes verified media and respects cooldown", () => {
    const ranked = rankAutopilotProducts([
      { id: "recent", name: "Recent", categoryId: "a", categoryName: "Dirndl", isPublished: true, hasVerifiedMedia: true, lastUsedAt: "2026-07-10T00:00:00Z" },
      { id: "a1", name: "Alpine Dirndl", categoryId: "a", categoryName: "Dirndl", isPublished: true, hasVerifiedMedia: true },
      { id: "b1", name: "Biker Jacket", categoryId: "b", categoryName: "Leatherwear", isPublished: true, hasVerifiedMedia: true },
      { id: "c1", name: "Club Kit", categoryId: "c", categoryName: "Sportswear", isPublished: true, hasVerifiedMedia: false },
      { id: "hidden", name: "Hidden", categoryId: "d", categoryName: "Hidden", isPublished: false, hasVerifiedMedia: true },
    ], new Date("2026-07-14T00:00:00Z"), 30, 3);

    expect(ranked.map((item) => item.id)).toEqual(["a1", "b1", "c1"]);
    expect(ranked[0].selectionReason).toContain("verified social media");
    expect(ranked[2].selectionReason).toContain("media generation/review is required");
  });

  it("propagates one immutable visual preset to every brief", () => {
    const result = applyVisualPreset({ title: "Dirndl image" });
    expect(result.visual_preset).toEqual(IRHA_SOCIAL_VISUAL_PRESET);
    expect(result.visual_preset.logoPlacement).toContain("top-right only");
    expect(result.visual_preset.subjectRules).toContain("Product-only composition; no models or mannequins.");
  });

  it("requires exactly five two-second scenes for every ten-second reel", () => {
    const scenes = reelSceneContract();
    expect(scenes).toHaveLength(5);
    expect(scenes.every((scene) => scene.durationMs === 2000 && scene.aspectRatio === "9:16")).toBe(true);
    expect(scenes.reduce((total, scene) => total + scene.durationMs, 0)).toBe(10_000);
  });

  it("creates a stable weekly idempotency identity", () => {
    expect(weekKey(new Date("2026-07-14T12:00:00Z"))).toBe("2026-07-13");
    expect(settingsFingerprint(DEFAULT_SOCIAL_AUTOPILOT_SETTINGS)).toBe(settingsFingerprint({ ...DEFAULT_SOCIAL_AUTOPILOT_SETTINGS }));
  });

  it("never treats TikTok profile verification as publishing capability", () => {
    expect(truthfulChannelStatus("tiktok", { configured: true, verified: true, publish_capable: false }).status).toBe("manual_required");
    expect(truthfulChannelStatus("instagram", { configured: false, verified: false, publish_capable: false }).status).toBe("credentials_required");
    expect(truthfulChannelStatus("linkedin", { configured: true, verified: true, publish_capable: true }).status).toBe("publish_capable");
  });

  it("builds a bounded seven-day draft plan without approval or publish state", () => {
    const slots = buildPostingSlots(DEFAULT_SOCIAL_AUTOPILOT_SETTINGS);
    expect(slots).toHaveLength(14);
    expect(slots.every((slot) => slot.dayOffset >= 0 && slot.dayOffset <= 6)).toBe(true);
    expect(slots.filter((slot) => slot.contentType === "reel")).toHaveLength(3);
    expect(slots.every((slot) => /^\d{2}:\d{2}$/.test(slot.localTime))).toBe(true);
  });
});
