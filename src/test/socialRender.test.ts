import { describe, expect, it } from "vitest";
import {
  canTransitionSocialRender,
  renderManifest,
  validateSocialRenderDraft,
  verifiedRenderOutput,
  type SocialRenderAsset,
} from "@/lib/socialRender";

const assets: SocialRenderAsset[] = Array.from({ length: 6 }, (_, index) => ({
  id: `asset-${index + 1}`,
  mimeType: "image/webp",
  status: "active",
  publicUrl: `https://cdn.example.com/asset-${index + 1}.webp`,
}));

const checksum = "a".repeat(64);

describe("social render safety rules", () => {
  it("requires exactly five unique scenes for a 10-second reel", () => {
    const result = validateSocialRenderDraft({
      title: "Lederhosen detail reel",
      renderType: "reel",
      aspectRatio: "9:16",
      requestedDurationSeconds: 10,
      items: assets.slice(0, 5).map((asset, index) => ({ mediaAssetId: asset.id, position: index + 1, durationMs: 2000 })),
    }, assets);
    expect(result).toEqual({ ready: true, missing: [] });
  });

  it("blocks incomplete and duplicate media plans", () => {
    const result = validateSocialRenderDraft({
      title: "Reel",
      renderType: "reel",
      aspectRatio: "9:16",
      requestedDurationSeconds: 9,
      items: [
        { mediaAssetId: "asset-1", position: 1 },
        { mediaAssetId: "asset-1", position: 2 },
      ],
    }, assets);
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("exactly 5 scenes");
    expect(result.missing).toContain("10-second reel duration");
    expect(result.missing).toContain("unique media for item 2");
  });

  it("allows only the controlled render lifecycle", () => {
    expect(canTransitionSocialRender("draft", "owner_review")).toBe(true);
    expect(canTransitionSocialRender("draft", "ready")).toBe(false);
    expect(canTransitionSocialRender("owner_review", "queued")).toBe(true);
    expect(canTransitionSocialRender("queued", "rendering")).toBe(true);
    expect(canTransitionSocialRender("rendering", "ready")).toBe(true);
  });

  it("does not accept a reel without real verification evidence", () => {
    expect(verifiedRenderOutput({
      renderType: "reel",
      aspectRatio: "9:16",
      outputAssetId: "output-1",
      outputUrl: "https://cdn.example.com/reel.mp4",
      verification: {
        verified: true,
        width: 1080,
        height: 1920,
        durationSeconds: 10,
        checksumSha256: checksum,
        mimeType: "video/mp4",
        sizeBytes: 2_000_000,
      },
    })).toBe(true);

    expect(verifiedRenderOutput({
      renderType: "reel",
      aspectRatio: "9:16",
      outputAssetId: "output-1",
      outputUrl: "https://cdn.example.com/reel.mp4",
      verification: { verified: true, durationSeconds: 10 },
    })).toBe(false);
  });

  it("verifies every carousel slide rather than one cover image", () => {
    expect(verifiedRenderOutput({
      renderType: "carousel",
      aspectRatio: "4:5",
      verification: {
        verified: true,
        files: [1, 2, 3].map((position) => ({
          mediaAssetId: `output-${position}`,
          url: `https://cdn.example.com/slide-${position}.webp`,
          width: 1080,
          height: 1350,
          checksumSha256: checksum,
          mimeType: "image/webp",
          sizeBytes: 250_000,
          position,
        })),
      },
    })).toBe(true);
  });

  it("creates a renderer-neutral manifest with approval gates", () => {
    const manifest = renderManifest({
      title: "Private-label carousel",
      renderType: "carousel",
      aspectRatio: "4:5",
      requestedDurationSeconds: 0,
      items: assets.slice(0, 3).map((asset, index) => ({ mediaAssetId: asset.id, position: index + 1 })),
    }, assets);
    expect(manifest.schema).toBe("irha.social-render.v1");
    expect(manifest.owner_approval_required).toBe(true);
    expect(manifest.scenes).toHaveLength(3);
  });
});
