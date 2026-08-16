import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";

export const GLOBAL_SITE_SETTINGS_KEY = "site.global.settings";

export type SiteLink = {
  label: string;
  href: string;
  enabled: boolean;
};

export type BuyerReadinessItem = {
  label: string;
  note: string;
};

export type SiteAnnouncement = {
  mode: "calendar" | "custom" | "off";
  id: string;
  label: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  startDate: string;
  endDate: string;
  theme: "gold" | "ivory" | "emerald" | "crimson";
  dismissible: boolean;
};

export type GlobalSiteSettings = {
  brand: {
    name: string;
    tagline: string;
    location: string;
    address: string;
    email: string;
    phone: string;
    phoneDisplay: string;
    whatsappNumber: string;
    logoUrl: string;
  };
  navigation: {
    main: SiteLink[];
    more: SiteLink[];
    tail: SiteLink[];
  };
  ctas: {
    quoteLabel: string;
    quoteHref: string;
    mockupLabel: string;
    studioLabel: string;
    studioHref: string;
    whatsappLabel: string;
  };
  socials: {
    instagram: string;
    facebook: string;
    linkedin: string;
    tiktok: string;
    pinterest: string;
  };
  footer: {
    intro: string;
    collectionLinks: SiteLink[];
    companyLinks: SiteLink[];
    buyerReadiness: BuyerReadinessItem[];
    factoryCallLabel: string;
    factoryCallHref: string;
    stripText: string;
    copyrightSuffix: string;
  };
  announcement: SiteAnnouncement;
};

export const DEFAULT_GLOBAL_SITE_SETTINGS: GlobalSiteSettings = {
  brand: {
    name: PUBLIC_IDENTITY.name,
    tagline: "B2B Custom Apparel Manufacturer",
    location: PUBLIC_IDENTITY.address.display,
    address: PUBLIC_IDENTITY.address.display,
    email: PUBLIC_IDENTITY.email,
    phone: PUBLIC_IDENTITY.telephoneHref,
    phoneDisplay: PUBLIC_IDENTITY.telephone,
    whatsappNumber: PUBLIC_IDENTITY.whatsappNumber,
    logoUrl: "/brand/irha-apparels-official-runtime-512.png",
  },
  navigation: {
    main: [
      { label: "Home", href: "/", enabled: true },
      { label: "About", href: "/about", enabled: true },
      { label: "Collections", href: "/products", enabled: true },
      { label: "Manufacturing", href: "/manufacturing", enabled: true },
    ],
    more: [
      { label: "Buyer Trust", href: "/buyer-trust", enabled: true },
      { label: "Factory Video Call", href: "/factory-video-call", enabled: true },
      { label: "Buyer Resources", href: "/resources", enabled: true },
      { label: "Buyer FAQ", href: "/faq", enabled: true },
      { label: "Blog", href: "/blog", enabled: true },
      { label: "Catalogue", href: "/catalogue", enabled: true },
      { label: "Compliance", href: "/compliance", enabled: true },
      { label: "Shortlist", href: "/shortlist", enabled: true },
    ],
    tail: [
      { label: "Inquiry", href: "/inquiry", enabled: true },
      { label: "Contact", href: "/contact", enabled: true },
    ],
  },
  ctas: {
    quoteLabel: "Get Quote",
    quoteHref: "/inquiry?intent=rfq",
    mockupLabel: "Mockup Design",
    studioLabel: "AI Designer",
    studioHref: "/studio",
    whatsappLabel: "WhatsApp",
  },
  socials: {
    instagram: PUBLIC_IDENTITY.socialProfiles.instagram,
    facebook: PUBLIC_IDENTITY.socialProfiles.facebook,
    linkedin: PUBLIC_IDENTITY.socialProfiles.linkedin,
    tiktok: PUBLIC_IDENTITY.socialProfiles.tiktok,
    pinterest: PUBLIC_IDENTITY.socialProfiles.pinterest,
  },
  footer: {
    intro: "B2B Custom Apparel Manufacturer",
    collectionLinks: [
      { label: "Bavarian & Trachten", href: "/products/bavarian-trachten-wear", enabled: true },
      { label: "Premium Leather", href: "/products/premium-leather-apparel", enabled: true },
      { label: "Sportswear", href: "/products/sportswear", enabled: true },
      { label: "Streetwear & Activewear", href: "/products/streetwear-activewear", enabled: true },
      { label: "Leisure & Nightwear", href: "/products/leisure-nightwear", enabled: true },
    ],
    companyLinks: [
      { label: "Catalogue", href: "/catalogue", enabled: true },
      { label: "About", href: "/about", enabled: true },
      { label: "Manufacturing", href: "/manufacturing", enabled: true },
      { label: "Buyer Trust Center", href: "/buyer-trust", enabled: true },
      { label: "Factory Video Call", href: "/factory-video-call", enabled: true },
      { label: "Buyer Resources", href: "/resources", enabled: true },
      { label: "Buyer FAQ", href: "/faq", enabled: true },
      { label: "Blog", href: "/blog", enabled: true },
      { label: "Compliance", href: "/compliance", enabled: true },
      { label: "Contact", href: "/contact", enabled: true },
    ],
    buyerReadiness: [
      { label: "Requirement-led review", note: "Scope confirmed before commitment" },
      { label: "Private-label options", note: "Labels, tags and packaging by program" },
      { label: "Order documentation", note: "Requirements confirmed before dispatch" },
      { label: "Live factory view", note: "Available by scheduled video call" },
    ],
    factoryCallLabel: "Request live factory call",
    factoryCallHref: "/factory-video-call",
    stripText: "MOQ · Timing · Pricing confirmed per program | OEM · ODM · Private Label",
    copyrightSuffix: "All rights reserved.",
  },
  announcement: {
    mode: "calendar",
    id: "custom-announcement",
    label: "Production Update",
    message: "Share your program requirements for a tailored production review.",
    ctaLabel: "Discuss a Program",
    ctaHref: "/inquiry?intent=rfq",
    startDate: "",
    endDate: "",
    theme: "gold",
    dismissible: true,
  },
};

function text(value: unknown, fallback: string, max = 180) {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, max) : fallback;
}

export function safeInternalHref(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.startsWith("/") && !clean.startsWith("//") ? clean.slice(0, 400) : fallback;
}

export function safePublicUrl(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  if (!clean) return fallback;
  if (clean.startsWith("/") && !clean.startsWith("//")) return clean.slice(0, 800);
  return /^https:\/\/[a-z0-9.-]+(?:[/:?#]|$)/i.test(clean) ? clean.slice(0, 800) : fallback;
}

function links(value: unknown, fallback: SiteLink[], max = 16) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows.slice(0, max).map((row, index) => {
    const source = row && typeof row === "object" ? row as Partial<SiteLink> : {};
    const base = fallback[index] || { label: "Link", href: "/", enabled: true };
    return {
      label: text(source.label, base.label, 60),
      href: safeInternalHref(source.href, base.href),
      enabled: typeof source.enabled === "boolean" ? source.enabled : base.enabled,
    };
  });
  return normalized.length ? normalized : fallback;
}

function readiness(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows.slice(0, 10).map((row, index) => {
    const source = row && typeof row === "object" ? row as Partial<BuyerReadinessItem> : {};
    const base = DEFAULT_GLOBAL_SITE_SETTINGS.footer.buyerReadiness[index] || { label: "Buyer readiness", note: "Confirmed per program" };
    return { label: text(source.label, base.label, 90), note: text(source.note, base.note, 160) };
  });
  return normalized.length ? normalized : DEFAULT_GLOBAL_SITE_SETTINGS.footer.buyerReadiness;
}

export function normalizeGlobalSiteSettings(value: unknown): GlobalSiteSettings {
  const root = value && typeof value === "object" ? value as Partial<GlobalSiteSettings> : {};
  const nav = root.navigation && typeof root.navigation === "object" ? root.navigation : {} as GlobalSiteSettings["navigation"];
  const ctas = root.ctas && typeof root.ctas === "object" ? root.ctas : {} as GlobalSiteSettings["ctas"];
  const footer = root.footer && typeof root.footer === "object" ? root.footer : {} as GlobalSiteSettings["footer"];
  const announcement = root.announcement && typeof root.announcement === "object" ? root.announcement : {} as GlobalSiteSettings["announcement"];
  const d = DEFAULT_GLOBAL_SITE_SETTINGS;
  const mode = announcement.mode === "custom" || announcement.mode === "off" ? announcement.mode : "calendar";
  const theme = ["gold", "ivory", "emerald", "crimson"].includes(String(announcement.theme))
    ? announcement.theme as SiteAnnouncement["theme"]
    : d.announcement.theme;

  return {
    brand: {
      ...d.brand,
      tagline: text(root.brand?.tagline, d.brand.tagline, 160),
    },
    navigation: {
      main: links(nav.main, d.navigation.main, 8),
      more: links(nav.more, d.navigation.more, 16),
      tail: links(nav.tail, d.navigation.tail, 6),
    },
    ctas: {
      quoteLabel: text(ctas.quoteLabel, d.ctas.quoteLabel, 40),
      quoteHref: safeInternalHref(ctas.quoteHref, d.ctas.quoteHref),
      mockupLabel: text(ctas.mockupLabel, d.ctas.mockupLabel, 40),
      studioLabel: text(ctas.studioLabel, d.ctas.studioLabel, 40),
      studioHref: safeInternalHref(ctas.studioHref, d.ctas.studioHref),
      whatsappLabel: text(ctas.whatsappLabel, d.ctas.whatsappLabel, 40),
    },
    socials: { ...d.socials },
    footer: {
      intro: text(footer.intro, d.footer.intro, 160),
      collectionLinks: links(footer.collectionLinks, d.footer.collectionLinks, 10),
      companyLinks: links(footer.companyLinks, d.footer.companyLinks, 16),
      buyerReadiness: readiness(footer.buyerReadiness),
      factoryCallLabel: text(footer.factoryCallLabel, d.footer.factoryCallLabel, 70),
      factoryCallHref: safeInternalHref(footer.factoryCallHref, d.footer.factoryCallHref),
      stripText: text(footer.stripText, d.footer.stripText, 220),
      copyrightSuffix: text(footer.copyrightSuffix, d.footer.copyrightSuffix, 80),
    },
    announcement: {
      mode,
      id: text(announcement.id, d.announcement.id, 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      label: text(announcement.label, d.announcement.label, 80),
      message: text(announcement.message, d.announcement.message, 240),
      ctaLabel: text(announcement.ctaLabel, d.announcement.ctaLabel, 60),
      ctaHref: safeInternalHref(announcement.ctaHref, d.announcement.ctaHref),
      startDate: typeof announcement.startDate === "string" ? announcement.startDate.slice(0, 10) : "",
      endDate: typeof announcement.endDate === "string" ? announcement.endDate.slice(0, 10) : "",
      theme,
      dismissible: typeof announcement.dismissible === "boolean" ? announcement.dismissible : d.announcement.dismissible,
    },
  };
}

export function validateGlobalSiteSettings(value: GlobalSiteSettings) {
  const s = normalizeGlobalSiteSettings(value);
  const errors: string[] = [];
  if (!/^\S+@\S+\.\S+$/.test(s.brand.email)) errors.push("A valid business email is required");
  if (s.brand.whatsappNumber.length < 10) errors.push("WhatsApp number must include country code");
  if (s.navigation.main.filter((item) => item.enabled).length === 0) errors.push("At least one main navigation link must stay enabled");
  if (s.announcement.mode === "custom") {
    if (s.announcement.message.length < 10) errors.push("Custom announcement message is too short");
    if (s.announcement.startDate && s.announcement.endDate && s.announcement.startDate > s.announcement.endDate) errors.push("Announcement end date must be after start date");
  }
  return { settings: s, errors };
}

export function settingsWhatsappLink(settings: GlobalSiteSettings, message = "Hello Irha Apparels, I'd like to request a quote.") {
  return `https://wa.me/${settings.brand.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
