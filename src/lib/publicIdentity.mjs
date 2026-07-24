const socialProfiles = Object.freeze({
  instagram: "https://www.instagram.com/irhaapparels",
  facebook: "https://web.facebook.com/profile.php?id=61590950402472",
  linkedin: "https://www.linkedin.com/company/irha-apparels",
  tiktok: "https://www.tiktok.com/@irhaapparels",
});

export const PUBLIC_IDENTITY = Object.freeze({
  name: "Irha Apparels",
  url: "https://irhaapparels.com/",
  organizationId: "https://irhaapparels.com/#organization",
  websiteId: "https://irhaapparels.com/#website",
  logoUrl: "https://irhaapparels.com/irha-brand-mark.svg",
  telephone: "+92 320 411 0066",
  telephoneHref: "+923204110066",
  whatsappNumber: "923204110066",
  email: "info@irhaapparels.com",
  address: Object.freeze({
    locality: "Sialkot",
    region: "Punjab",
    country: "PK",
    display: "Sialkot, Punjab, Pakistan",
  }),
  responsiblePerson: Object.freeze({
    name: "Daim Ali",
    title: "CEO",
    display: "Daim Ali — CEO, Irha Apparels",
  }),
  availability: Object.freeze({
    days: "Monday–Saturday",
    hours: "9:00 AM–6:00 PM",
    appointmentPolicy: "Buyer visits by prior appointment only.",
  }),
  socialProfiles,
  sameAs: Object.freeze([
    socialProfiles.instagram,
    socialProfiles.facebook,
    socialProfiles.linkedin,
    socialProfiles.tiktok,
  ]),
});

export function buildCanonicalOrganizationSchema({ includeContext = true } = {}) {
  return {
    ...(includeContext ? { "@context": "https://schema.org" } : {}),
    "@type": "Organization",
    "@id": PUBLIC_IDENTITY.organizationId,
    name: PUBLIC_IDENTITY.name,
    url: PUBLIC_IDENTITY.url,
    logo: PUBLIC_IDENTITY.logoUrl,
    telephone: PUBLIC_IDENTITY.telephone,
    email: PUBLIC_IDENTITY.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: PUBLIC_IDENTITY.address.locality,
      addressRegion: PUBLIC_IDENTITY.address.region,
      addressCountry: PUBLIC_IDENTITY.address.country,
    },
    sameAs: [...PUBLIC_IDENTITY.sameAs],
  };
}

export function buildCanonicalWebsiteSchema({ includeContext = true } = {}) {
  return {
    ...(includeContext ? { "@context": "https://schema.org" } : {}),
    "@type": "WebSite",
    "@id": PUBLIC_IDENTITY.websiteId,
    url: PUBLIC_IDENTITY.url,
    name: PUBLIC_IDENTITY.name,
    publisher: { "@id": PUBLIC_IDENTITY.organizationId },
    inLanguage: "en",
  };
}
