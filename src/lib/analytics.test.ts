import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_CATALOGUE_CONVERSION,
  trackAdsConversion,
  trackAnalyticsEvent,
  trackLeadGenerated,
} from "./analytics";

const CONSENT_KEY = "irha_cookie_consent_v1";

function grantConsent(analytics: boolean, ads: boolean) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ categories: { analytics, ads }, ts: Date.now() }));
}

describe("consent-safe analytics", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    gtag.mockReset();
    window.gtag = gtag;
  });

  it("does not send analytics before analytics consent", () => {
    expect(trackAnalyticsEvent("begin_inquiry", { source_page: "/products" })).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not send advertising conversions without ads consent", () => {
    grantConsent(true, false);
    expect(trackAdsConversion(GOOGLE_ADS_CATALOGUE_CONVERSION)).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends analytics to the configured GA4 stream after consent", () => {
    grantConsent(true, false);
    expect(trackAnalyticsEvent("contact_whatsapp_click", { source_page: "/contact" })).toBe(true);
    expect(gtag).toHaveBeenCalledWith("event", "contact_whatsapp_click", {
      source_page: "/contact",
      send_to: "G-RV39YH4CPF",
    });
  });

  it("records successful leads without personal contact fields", () => {
    grantConsent(true, true);
    trackLeadGenerated({
      leadType: "catalogue",
      formName: "catalogue_lead_form",
      sourcePage: "/catalogue",
      country: "Germany",
      category: "sportswear",
      productSlug: "custom-team-kit",
      intentDetail: "catalogue-index",
      adsSendTo: GOOGLE_ADS_CATALOGUE_CONVERSION,
    });

    const calls = gtag.mock.calls.map((call) => JSON.stringify(call));
    expect(calls.some((call) => call.includes('"generate_lead"'))).toBe(true);
    expect(calls.some((call) => call.includes('"lead_form_submitted"'))).toBe(true);
    expect(calls.some((call) => call.includes(GOOGLE_ADS_CATALOGUE_CONVERSION))).toBe(true);
    expect(calls.join(" ")).not.toMatch(/email|phone|whatsapp|full_name|company_name/i);
  });

  it("trims empty values and limits long parameter strings", () => {
    grantConsent(true, false);
    trackAnalyticsEvent("test_event", { empty: "   ", long_value: "x".repeat(180) });
    const payload = gtag.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.empty).toBeUndefined();
    expect(String(payload.long_value)).toHaveLength(100);
  });
});
