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
  homepageId: "https://irhaapparels.com/#webpage",
  logoUrl: "https://irhaapparels.com/brand/irha-apparels-official-runtime-512.png",
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
  homepage: Object.freeze({
    title: "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan",
    heading: "Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers",
    description: "Irha Apparels is a B2B apparel manufacturer in Sialkot, Pakistan, supplying custom Lederhosen, Dirndl, leather apparel, sportswear, streetwear and private-label clothing programs.",
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

export function buildCanonicalHomepageWebPageSchema({ includeContext = true } = {}) {
  return {
    ...(includeContext ? { "@context": "https://schema.org" } : {}),
    "@type": "WebPage",
    "@id": PUBLIC_IDENTITY.homepageId,
    url: PUBLIC_IDENTITY.url,
    name: PUBLIC_IDENTITY.homepage.title,
    description: PUBLIC_IDENTITY.homepage.description,
    isPartOf: { "@id": PUBLIC_IDENTITY.websiteId },
    about: { "@id": PUBLIC_IDENTITY.organizationId },
    publisher: { "@id": PUBLIC_IDENTITY.organizationId },
    inLanguage: "en",
  };
}
