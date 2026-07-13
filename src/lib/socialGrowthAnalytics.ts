export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "tiktok";

export type SocialMetricSnapshot = {
  id?: string;
  item_id: string;
  platform: SocialPlatform;
  snapshot_at: string;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  profile_visits: number;
  followers_delta: number;
  source: string;
  verified: boolean;
};

export type SocialGrowthRow = {
  item_id: string;
  title: string;
  platform: SocialPlatform;
  content_type: string;
  status: string;
  external_post_id: string | null;
  external_post_url: string | null;
  published_at: string | null;
  tracking_url: string | null;
  snapshot: SocialMetricSnapshot | null;
};

export type PlatformSummary = {
  platform: SocialPlatform;
  posts: number;
  measuredPosts: number;
  impressions: number;
  reach: number;
  views: number;
  engagements: number;
  clicks: number;
};

const number = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function normalizeSnapshot(value: Partial<SocialMetricSnapshot> | null | undefined): SocialMetricSnapshot | null {
  if (!value?.item_id || !value.platform || !value.snapshot_at) return null;
  return {
    id: value.id,
    item_id: value.item_id,
    platform: value.platform,
    snapshot_at: value.snapshot_at,
    impressions: number(value.impressions),
    reach: number(value.reach),
    views: number(value.views),
    likes: number(value.likes),
    comments: number(value.comments),
    shares: number(value.shares),
    saves: number(value.saves),
    clicks: number(value.clicks),
    profile_visits: number(value.profile_visits),
    followers_delta: Number.isFinite(Number(value.followers_delta)) ? Number(value.followers_delta) : 0,
    source: value.source || "unknown",
    verified: Boolean(value.verified),
  };
}

export function engagementCount(snapshot: SocialMetricSnapshot | null): number {
  if (!snapshot) return 0;
  return snapshot.likes + snapshot.comments + snapshot.shares + snapshot.saves;
}

export function engagementRate(snapshot: SocialMetricSnapshot | null): number | null {
  if (!snapshot) return null;
  const denominator = Math.max(snapshot.reach, snapshot.impressions, snapshot.views);
  if (denominator <= 0) return null;
  return (engagementCount(snapshot) / denominator) * 100;
}

/**
 * Deterministic evidence ranking only. This is not revenue, lead or order probability.
 */
export function observedPerformanceScore(snapshot: SocialMetricSnapshot | null): number {
  if (!snapshot?.verified) return 0;
  return (
    snapshot.clicks * 5
    + snapshot.shares * 4
    + snapshot.saves * 4
    + snapshot.comments * 3
    + snapshot.likes
    + snapshot.profile_visits * 2
    + snapshot.views * 0.01
    + snapshot.reach * 0.005
  );
}

export function hasPublicationEvidence(row: Pick<SocialGrowthRow, "status" | "external_post_id" | "external_post_url">): boolean {
  if (row.status !== "published") return false;
  return Boolean(row.external_post_id || (row.external_post_url && /^https:\/\//i.test(row.external_post_url)));
}

export function aggregateByPlatform(rows: SocialGrowthRow[]): PlatformSummary[] {
  const platforms: SocialPlatform[] = ["facebook", "instagram", "linkedin", "tiktok"];
  return platforms.map((platform) => {
    const values = rows.filter((row) => row.platform === platform && hasPublicationEvidence(row));
    return values.reduce<PlatformSummary>((summary, row) => {
      const snapshot = row.snapshot;
      summary.posts += 1;
      if (!snapshot?.verified) return summary;
      summary.measuredPosts += 1;
      summary.impressions += snapshot.impressions;
      summary.reach += snapshot.reach;
      summary.views += snapshot.views;
      summary.engagements += engagementCount(snapshot);
      summary.clicks += snapshot.clicks;
      return summary;
    }, { platform, posts: 0, measuredPosts: 0, impressions: 0, reach: 0, views: 0, engagements: 0, clicks: 0 });
  });
}

export function buildTrackingUrl(input: {
  destination: string;
  platform: SocialPlatform;
  itemId: string;
  campaignId?: string | null;
}): string {
  const url = new URL(input.destination);
  if (url.protocol !== "https:") throw new Error("Tracking destination must use HTTPS");
  url.searchParams.set("utm_source", input.platform);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", input.campaignId || "irha-social");
  url.searchParams.set("utm_content", input.itemId);
  return url.toString();
}

export function recommendationFor(row: SocialGrowthRow, now = Date.now()): { type: string; priority: number; reason: string; action: string } | null {
  if (!hasPublicationEvidence(row)) return null;
  if (!row.snapshot?.verified) {
    return { type: "collect_metrics", priority: 90, reason: "Published post has no verified metric snapshot.", action: "Collect platform metrics or enter a verified manual snapshot." };
  }
  const ageDays = Math.max(0, (now - new Date(row.snapshot.snapshot_at).getTime()) / 86_400_000);
  if (ageDays > 14) {
    return { type: "refresh_metrics", priority: 80, reason: `Latest verified snapshot is ${Math.floor(ageDays)} days old.`, action: "Refresh metrics before making a content decision." };
  }
  const rate = engagementRate(row.snapshot);
  if (row.snapshot.clicks === 0 && engagementCount(row.snapshot) >= 5) {
    return { type: "improve_cta", priority: 65, reason: "Observed engagement exists but no verified link clicks are recorded.", action: "Prepare a new draft with a clearer B2B quote, catalogue or factory-call CTA." };
  }
  if ((rate ?? 0) >= 3 && row.snapshot.shares + row.snapshot.saves >= 3) {
    return { type: "repurpose", priority: 55, reason: "Verified engagement, shares or saves are comparatively strong.", action: "Prepare a new platform-native draft using the same evidence and creative angle. Do not auto-publish." };
  }
  return null;
}
