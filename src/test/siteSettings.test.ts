import { describe, expect, it } from "vitest";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";
import {
  DEFAULT_GLOBAL_SITE_SETTINGS,
  normalizeGlobalSiteSettings,
  settingsWhatsappLink,
  validateGlobalSiteSettings,
} from "@/lib/siteSettings";

describe("global site settings", () => {
  it("keeps verified defaults when CMS data is missing", () => {
    expect(normalizeGlobalSiteSettings(null)).toEqual(DEFAULT_GLOBAL_SITE_SETTINGS);
    expect(DEFAULT_GLOBAL_SITE_SETTINGS.brand.email).toBe("info@irhaapparels.com");
  });

  it("rejects unsafe identity and navigation protocols", () => {
    const value = normalizeGlobalSiteSettings({
      brand: { ...DEFAULT_GLOBAL_SITE_SETTINGS.brand, logoUrl: "javascript:alert(1)" },
      navigation: {
        ...DEFAULT_GLOBAL_SITE_SETTINGS.navigation,
        main: [{ label: "Unsafe", href: "https://evil.example", enabled: true }],
      },
    });
    expect(value.brand.logoUrl).toBe("/brand/irha-apparels-official-runtime-512.png");
    expect(value.brand.logoUrl).toBe(new URL(PUBLIC_IDENTITY.logoUrl).pathname);
    expect(value.navigation.main[0].href).toBe("/");
  });

  it("normalizes WhatsApp digits and creates encoded links", () => {
    const value = normalizeGlobalSiteSettings({
      brand: { ...DEFAULT_GLOBAL_SITE_SETTINGS.brand, whatsappNumber: "+92 320 411 0066" },
    });
    expect(value.brand.whatsappNumber).toBe("923204110066");
    expect(settingsWhatsappLink(value, "Need quote & sample")).toContain("Need%20quote%20%26%20sample");
  });

  it("blocks invalid announcement date order", () => {
    const value = normalizeGlobalSiteSettings({
      announcement: {
        ...DEFAULT_GLOBAL_SITE_SETTINGS.announcement,
        mode: "custom",
        startDate: "2026-08-20",
        endDate: "2026-08-10",
      },
    });
    expect(validateGlobalSiteSettings(value).errors).toContain("Announcement end date must be after start date");
  });
});
