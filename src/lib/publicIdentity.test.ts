import { describe, expect, it } from "vitest";
import {
  PUBLIC_IDENTITY,
  buildCanonicalHomepageWebPageSchema,
  buildCanonicalOrganizationSchema,
  buildCanonicalWebsiteSchema,
} from "./publicIdentity.mjs";
import { organizationSchema, websiteSchema } from "./seoSchema";
import { buildOrganizationSchema } from "./seoStructuredData";
import { normalizeGlobalSiteSettings } from "./siteSettings";
import { normalizeOrganizationReferences } from "@/components/SEO";

describe("canonical public identity", () => {
  it("emits one approved Organization shape across schema utilities", () => {
    const expected = buildCanonicalOrganizationSchema();
    expect(organizationSchema).toEqual(expected);
    expect(buildOrganizationSchema()).toEqual(expected);
    expect(expected).toMatchObject({
      "@type": "Organization",
      "@id": "https://irhaapparels.com/#organization",
      name: "Irha Apparels",
      url: "https://irhaapparels.com/",
      logo: "https://irhaapparels.com/brand/irha-apparels-official-runtime-512.png",
      telephone: "+92 320 411 0066",
      email: "info@irhaapparels.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Sialkot",
        addressRegion: "Punjab",
        addressCountry: "PK",
      },
    });
    expect(expected.sameAs).toEqual([
      "https://www.instagram.com/irhaapparels",
      "https://web.facebook.com/profile.php?id=61590950402472",
      "https://www.linkedin.com/company/irha-apparels",
      "https://www.tiktok.com/@irhaapparels",
    ]);
  });

  it("keeps sameAs limited to four unique controlled profiles and excludes WhatsApp", () => {
    const configuredProfiles = Object.values(PUBLIC_IDENTITY.socialProfiles);
    expect(PUBLIC_IDENTITY.sameAs).toHaveLength(4);
    expect(new Set(PUBLIC_IDENTITY.sameAs).size).toBe(4);
    expect(PUBLIC_IDENTITY.sameAs).toEqual(configuredProfiles);
    expect(PUBLIC_IDENTITY.sameAs.join(" ")).not.toMatch(/wa\.me|whatsapp/i);
  });

  it("omits unapproved legal, local-business, address and market claims", () => {
    const organization = buildCanonicalOrganizationSchema() as Record<string, unknown>;
    for (const forbidden of [
      "legalName", "taxID", "registrationNumber", "founder", "foundingDate",
      "employee", "numberOfEmployees", "award", "certification", "aggregateRating",
      "review", "streetAddress", "postalCode", "geo", "openingHoursSpecification",
      "areaServed",
    ]) {
      expect(organization).not.toHaveProperty(forbidden);
    }
    expect(organization["@type"]).toBe("Organization");
    expect(JSON.stringify(organization)).not.toContain("LocalBusiness");
    expect(JSON.stringify(organization)).not.toContain("proprietor");
    expect(JSON.stringify(organization)).not.toContain("registered company");
    expect(JSON.stringify(organization)).not.toContain("Worldwide");
  });

  it("collapses hydrated Irha Apparels Organization objects to the canonical reference", () => {
    expect(normalizeOrganizationReferences({
      "@type": "Article",
      publisher: { "@type": "Organization", name: "Irha Apparels", logo: "/old.svg" },
      author: { "@type": "Organization", "@id": PUBLIC_IDENTITY.organizationId, name: "Irha Apparels" },
    })).toEqual({
      "@type": "Article",
      publisher: { "@id": PUBLIC_IDENTITY.organizationId },
      author: { "@id": PUBLIC_IDENTITY.organizationId },
    });
  });

  it("keeps WebSite publisher attached to the canonical Organization", () => {
    const expected = buildCanonicalWebsiteSchema();
    expect(websiteSchema).toEqual(expected);
    expect(expected).toMatchObject({
      "@type": "WebSite",
      "@id": PUBLIC_IDENTITY.websiteId,
      publisher: { "@id": PUBLIC_IDENTITY.organizationId },
    });
  });

  it("keeps the homepage WebPage attached to the canonical WebSite and Organization", () => {
    const expected = buildCanonicalHomepageWebPageSchema();
    expect(expected).toMatchObject({
      "@type": "WebPage",
      "@id": PUBLIC_IDENTITY.homepageId,
      url: PUBLIC_IDENTITY.url,
      name: PUBLIC_IDENTITY.homepage.title,
      isPartOf: { "@id": PUBLIC_IDENTITY.websiteId },
      about: { "@id": PUBLIC_IDENTITY.organizationId },
      publisher: { "@id": PUBLIC_IDENTITY.organizationId },
    });
    expect(JSON.stringify(expected)).not.toMatch(/legalName|LocalBusiness|streetAddress|postalCode|areaServed/);
  });

  it("fails closed against published site-setting identity drift", () => {
    const normalized = normalizeGlobalSiteSettings({
      brand: {
        name: "Different Company",
        tagline: "Approved editable tagline",
        location: "Private address",
        address: "Private address",
        email: "other@example.com",
        phone: "+000",
        phoneDisplay: "+000",
        whatsappNumber: "000",
        logoUrl: "/other.svg",
      },
      socials: {
        instagram: "https://example.com/wrong",
        facebook: "https://example.com/wrong",
        linkedin: "https://example.com/wrong",
        tiktok: "https://example.com/wrong",
      },
    } as never);
    expect(normalized.brand).toMatchObject({
      name: PUBLIC_IDENTITY.name,
      location: PUBLIC_IDENTITY.address.display,
      address: PUBLIC_IDENTITY.address.display,
      email: PUBLIC_IDENTITY.email,
      phone: PUBLIC_IDENTITY.telephoneHref,
      phoneDisplay: PUBLIC_IDENTITY.telephone,
      whatsappNumber: PUBLIC_IDENTITY.whatsappNumber,
      logoUrl: "/brand/irha-apparels-official-runtime-512.png",
      tagline: "Approved editable tagline",
    });
    expect(normalized.socials).toEqual(PUBLIC_IDENTITY.socialProfiles);
  });

  it("exposes the approved accountable person without legal-owner wording", () => {
    expect(PUBLIC_IDENTITY.responsiblePerson).toEqual({
      name: "Daim Ali",
      title: "CEO",
      display: "Daim Ali — CEO, Irha Apparels",
    });
    expect(JSON.stringify(PUBLIC_IDENTITY.responsiblePerson)).not.toMatch(/proprietor|legal owner|founder/i);
  });
});
