import { describe, expect, it } from "vitest";
import { hasPublishedEvidence, retryDelayMinutes, socialDeliveryReadiness } from "@/lib/socialPublishing";

const verifiedInstagram = {
  platform: "instagram" as const,
  enabled: true,
  verificationStatus: "verified" as const,
  capabilities: { text: false, image: true, carousel: false, reel: true },
};

describe("social publishing safeguards", () => {
  it("requires owner approval and a verified account", () => {
    const result = socialDeliveryReadiness({
      platform: "instagram",
      contentType: "single_image",
      caption: "B2B product overview",
      imageUrl: "https://example.com/product.webp",
      approvedAt: null,
      account: { ...verifiedInstagram, verificationStatus: "pending" },
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("owner approval");
    expect(result.missing).toContain("verified platform connection");
  });

  it("blocks reels without verified output evidence", () => {
    const result = socialDeliveryReadiness({
      platform: "instagram",
      contentType: "reel",
      caption: "Manufacturing detail reel",
      videoUrl: "https://example.com/reel.mp4",
      approvedAt: "2026-07-13T10:00:00.000Z",
      renderVerified: false,
      account: verifiedInstagram,
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("verified reel output");
  });

  it("accepts a fully approved verified reel", () => {
    const result = socialDeliveryReadiness({
      platform: "instagram",
      contentType: "reel",
      caption: "Manufacturing detail reel",
      videoUrl: "https://example.com/reel.mp4",
      approvedAt: "2026-07-13T10:00:00.000Z",
      renderVerified: true,
      account: verifiedInstagram,
    });
    expect(result.ready).toBe(true);
  });

  it("never treats a status label alone as publication proof", () => {
    expect(hasPublishedEvidence({ postId: null, postUrl: null })).toBe(false);
    expect(hasPublishedEvidence({ postId: "17890001234" })).toBe(true);
    expect(hasPublishedEvidence({ postUrl: "https://www.instagram.com/p/example/" })).toBe(true);
    expect(hasPublishedEvidence({ postUrl: "javascript:alert(1)" })).toBe(false);
  });

  it("uses bounded retry backoff", () => {
    expect(retryDelayMinutes(1)).toBe(5);
    expect(retryDelayMinutes(2)).toBe(15);
    expect(retryDelayMinutes(3)).toBe(60);
    expect(retryDelayMinutes(4)).toBe(240);
    expect(retryDelayMinutes(20)).toBe(1440);
  });
});
