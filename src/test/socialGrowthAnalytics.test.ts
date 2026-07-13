import { describe, expect, it } from "vitest";
import {
  aggregateByPlatform,
  buildTrackingUrl,
  engagementRate,
  hasPublicationEvidence,
  observedPerformanceScore,
  recommendationFor,
  type SocialGrowthRow,
  type SocialMetricSnapshot,
} from "@/lib/socialGrowthAnalytics";

const snapshot: SocialMetricSnapshot = {
  item_id: "item-1",
  platform: "instagram",
  snapshot_at: "2026-07-13T10:00:00Z",
  impressions: 1000,
  reach: 800,
  views: 900,
  likes: 40,
  comments: 10,
  shares: 5,
  saves: 5,
  clicks: 8,
  profile_visits: 4,
  followers_delta: 2,
  source: "meta_graph",
  verified: true,
};

const row: SocialGrowthRow = {
  item_id: "item-1",
  title: "Verified post",
  platform: "instagram",
  content_type: "single_image",
  status: "published",
  external_post_id: "1789",
  external_post_url: "https://instagram.com/p/example",
  published_at: "2026-07-12T10:00:00Z",
  tracking_url: null,
  snapshot,
};

describe("social growth analytics", () => {
  it("requires real publication evidence", () => {
    expect(hasPublicationEvidence(row)).toBe(true);
    expect(hasPublicationEvidence({ ...row, status: "ready" })).toBe(false);
    expect(hasPublicationEvidence({ ...row, external_post_id: null, external_post_url: null })).toBe(false);
  });

  it("calculates observed engagement without inventing conversions", () => {
    expect(engagementRate(snapshot)).toBe(6);
    expect(observedPerformanceScore(snapshot)).toBeGreaterThan(0);
    expect(observedPerformanceScore({ ...snapshot, verified: false })).toBe(0);
  });

  it("aggregates only published posts with evidence", () => {
    const summaries = aggregateByPlatform([row, { ...row, item_id: "draft", status: "draft" }]);
    const instagram = summaries.find((value) => value.platform === "instagram");
    expect(instagram?.posts).toBe(1);
    expect(instagram?.measuredPosts).toBe(1);
    expect(instagram?.clicks).toBe(8);
  });

  it("builds deterministic HTTPS UTM links", () => {
    const url = buildTrackingUrl({ destination: "https://irhaapparels.com/inquiry", platform: "linkedin", itemId: "abc", campaignId: "dach" });
    expect(url).toContain("utm_source=linkedin");
    expect(url).toContain("utm_content=abc");
    expect(() => buildTrackingUrl({ destination: "http://example.com", platform: "facebook", itemId: "abc" })).toThrow(/HTTPS/);
  });

  it("creates draft-only evidence recommendations", () => {
    const recommendation = recommendationFor({ ...row, snapshot: { ...snapshot, clicks: 0 } }, new Date("2026-07-14T10:00:00Z").getTime());
    expect(recommendation?.type).toBe("improve_cta");
    expect(recommendation?.action).toMatch(/draft/i);
  });
});
