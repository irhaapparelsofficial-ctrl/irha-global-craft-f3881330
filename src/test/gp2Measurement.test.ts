import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyAcquisition,
  normalizeCanonicalPath,
  sanitizeAttributionValue,
} from "@/lib/commercialMeasurement";
import { policyForSiteVisitorAction } from "../../supabase/functions/_shared/durable-rate-limit";

const controlPlaneMigration = readFileSync("supabase/migrations/20260809122000_gp2_search_measurement_control_plane.sql", "utf8");
const conversionMigration = readFileSync("supabase/migrations/20260809123000_gp2_measurement_conversion_observers.sql", "utf8");
const visitorFunction = readFileSync("supabase/functions/site-visitor/index.ts", "utf8");
const gscFunction = readFileSync("supabase/functions/gsc-analytics/index.ts", "utf8");
const operationsFunction = readFileSync("supabase/functions/operations-orchestrator/index.ts", "utf8");

describe("GP-2 canonical acquisition normalization", () => {
  it("strips arbitrary URL queries and fragments from measurement paths", () => {
    expect(normalizeCanonicalPath("/products/lederhosen/?email=buyer@example.com#details")).toBe("/products/lederhosen");
    expect(normalizeCanonicalPath("/")).toBe("/");
  });

  it("rejects email and phone-like attribution values", () => {
    expect(sanitizeAttributionValue("buyer@example.com")).toBeNull();
    expect(sanitizeAttributionValue("+92 334 1234567")).toBeNull();
    expect(sanitizeAttributionValue("b2b-summer-campaign")).toBe("b2b-summer-campaign");
  });

  it("does not infer Google query keywords from an organic referrer", () => {
    expect(classifyAcquisition("www.google.com", null, null)).toEqual({ source: "www.google.com", medium: "organic" });
    expect(classifyAcquisition("instagram.com", null, null)).toEqual({ source: "instagram.com", medium: "social" });
    expect(classifyAcquisition(null, "linkedin", "paid_social")).toEqual({ source: "linkedin", medium: "paid_social" });
  });

  it("maps the event path through the durable rate limiter", () => {
    expect(policyForSiteVisitorAction("event")).toBe("site-visitor.event");
  });
});

describe("GP-2 measurement source contracts", () => {
  it("keeps the commercial event table private and missing search rows explicitly unobserved", () => {
    expect(controlPlaneMigration).toContain("alter table public.commercial_measurement_events enable row level security");
    expect(controlPlaneMigration).toContain("revoke all on table public.commercial_measurement_events from public, anon, authenticated");
    expect(controlPlaneMigration).toContain("'NO DATA / NOT OBSERVED'");
    expect(controlPlaneMigration).toContain("where p.is_published = true and p.publish_state = 'published'");
  });

  it("guards PII at the database conversion boundary", () => {
    expect(conversionMigration).toContain("function public.gp2_safe_dimension");
    expect(conversionMigration).toContain("position('@' in v_value) > 0");
    expect(conversionMigration).toContain("'measurement_origin','crm_acceptance','pii_included',false");
    expect(conversionMigration).toContain("trg_gp2_record_inquiry_measurement");
    expect(conversionMigration).not.toMatch(/net\.http_|http_post\s*\(|cron\.schedule\s*\(/i);
  });

  it("reuses the existing daily operations schedule for automated search collection", () => {
    expect(operationsFunction).toContain("syncSearchMeasurement(url, serviceKey)");
    expect(operationsFunction).toContain("search_measurement: searchMeasurement");
    expect(operationsFunction).toContain('body: JSON.stringify({ action: "sync" })');
  });

  it("keeps Search Console data read-only and sanitizes query observations before persistence", () => {
    expect(gscFunction).toContain('const GSC_SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(gscFunction).toContain("isSensitiveSearchQuery");
    expect(gscFunction).toContain("search_console_observations");
    expect(gscFunction).toContain('separate_generative_ai_reporting: "NOT CURRENTLY AVAILABLE"');
    expect(gscFunction).not.toContain("urlNotifications:publish");
  });

  it("never stores a browser URL query string in the first-party visitor path", () => {
    expect(visitorFunction).toContain('split("?")[0].split("#")[0]');
    expect(visitorFunction).toContain("commercial_measurement_events");
    expect(visitorFunction).toContain("social_attribution_events");
  });
});
