import { BRAND, WHATSAPP_NUMBER } from "@/lib/constants";

export const GLOBAL_SETTINGS_DOCUMENT_KEY = "site.global.settings";
export const HOME_LAYOUT_DOCUMENT_KEY = "site.home.sections";

export type AnnouncementTheme = "gold" | "ivory" | "emerald" | "crimson";

export type SiteGlobalSettings = {
  company: {
    name: string;
    tagline: string;
    address: string;
    locationLabel: string;
  };
  contact: {
    email: string;
    phoneDisplay: string;
    whatsappNumber: string;
    whatsappMessage: string;
  };
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
    linkedin: string;
  };
  announcement: {
    enabled: boolean;
    id: string;
    label: string;
    message: string;
    ctaText: string;
    ctaHref: string;
    theme: AnnouncementTheme;
    dismissible: boolean;
  };
  footer: {
    companyBlurb: string;
    showBlogLink: boolean;
    buyerReadiness: Array<{ label: string; note: string }>;
    legalLinks: Array<{ label: string; href: string }>;
  };
};

export type HomeSectionKey =
  | "hero"
  | "capabilities"
  | "production_hubs"
  | "categories"
  | "why_b2b"
  | "buyer_trust"
  | "process"
  | "start_program";

export type HomeSectionLayout = {
  sections: Array<{
    key: HomeSectionKey;
    label: string;
    visible: boolean;
    order: number;
    locked?: boolean;
  }>;
};

export const DEFAULT_GLOBAL_SETTINGS: SiteGlobalSettings = {
  company: {
    name: BRAND.name,
    tagline: "B2B Custom Apparel Manufacturer",
    address: BRAND.address,
    locationLabel: "Sialkot, Pakistan",
  },
  contact: {
    email: BRAND.email,
    phoneDisplay: BRAND.phoneDisplay,
    whatsappNumber: WHATSAPP_NUMBER,
    whatsappMessage: "Hello Irha Apparels, I'd like to discuss a custom B2B apparel requirement.",
  },
  social: {
    instagram: "https://www.instagram.com/irhaapparels",
    facebook: "https://web.facebook.com/profile.php?id=61590950402472",
    tiktok: "https://www.tiktok.com/@irhaapparels",
    linkedin: "",
  },
  announcement: {
    enabled: false,
    id: "site-announcement",
    label: "Buyer Update",
    message: "",
    ctaText: "",
    ctaHref: "/inquiry",
    theme: "gold",
    dismissible: true,
  },
  footer: {
    companyBlurb: "Custom B2B apparel programs reviewed against buyer specifications before commercial commitments.",
    showBlogLink: true,
    buyerReadiness: [
      { label: "Requirement-led review", note: "Scope confirmed before commitment" },
      { label: "Private-label options", note: "Labels, tags and packaging by program" },
      { label: "Order documentation", note: "Requirements confirmed before dispatch" },
      { label: "Live factory view", note: "Available by scheduled video call" },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  },
};

export const DEFAULT_HOME_LAYOUT: HomeSectionLayout = {
  sections: [
    { key: "hero", label: "Hero", visible: true, order: 0, locked: true },
    { key: "capabilities", label: "Capability Strip", visible: true, order: 10 },
    { key: "production_hubs", label: "Production Hubs", visible: true, order: 20 },
    { key: "categories", label: "Five Categories", visible: true, order: 30 },
    { key: "why_b2b", label: "Why B2B", visible: true, order: 40 },
    { key: "buyer_trust", label: "Buyer Trust", visible: true, order: 50 },
    { key: "process", label: "Process Timeline", visible: true, order: 60 },
    { key: "start_program", label: "Start Program CTA", visible: true, order: 70 },
  ],
};

const SECTION_LABELS: Record<HomeSectionKey, string> = Object.fromEntries(
  DEFAULT_HOME_LAYOUT.sections.map((section) => [section.key, section.label]),
) as Record<HomeSectionKey, string>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string, maxLength = 500) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function optionalUrl(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned.slice(0, 1000);
  if (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(cleaned)) return cleaned.slice(0, 1000);
  return fallback;
}

function email(value: unknown, fallback: string) {
  const candidate = text(value, fallback, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : fallback;
}

function phoneDigits(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const digits = value.replace(/\D+/g, "").slice(0, 20);
  return digits.length >= 8 ? digits : fallback;
}

export function normalizeGlobalSettings(value: unknown): SiteGlobalSettings {
  const root = record(value);
  const company = record(root.company);
  const contact = record(root.contact);
  const social = record(root.social);
  const announcement = record(root.announcement);
  const footer = record(root.footer);

  const readiness = Array.isArray(footer.buyerReadiness)
    ? footer.buyerReadiness.map((item) => {
        const row = record(item);
        return {
          label: text(row.label, "", 120),
          note: text(row.note, "", 220),
        };
      }).filter((item) => item.label && item.note).slice(0, 8)
    : DEFAULT_GLOBAL_SETTINGS.footer.buyerReadiness;

  const legalLinks = Array.isArray(footer.legalLinks)
    ? footer.legalLinks.map((item) => {
        const row = record(item);
        return {
          label: text(row.label, "", 80),
          href: optionalUrl(row.href, ""),
        };
      }).filter((item) => item.label && item.href).slice(0, 8)
    : DEFAULT_GLOBAL_SETTINGS.footer.legalLinks;

  const theme = announcement.theme;
  const validTheme: AnnouncementTheme = theme === "ivory" || theme === "emerald" || theme === "crimson" ? theme : "gold";

  return {
    company: {
      name: text(company.name, DEFAULT_GLOBAL_SETTINGS.company.name, 120),
      tagline: text(company.tagline, DEFAULT_GLOBAL_SETTINGS.company.tagline, 180),
      address: text(company.address, DEFAULT_GLOBAL_SETTINGS.company.address, 300),
      locationLabel: text(company.locationLabel, DEFAULT_GLOBAL_SETTINGS.company.locationLabel, 120),
    },
    contact: {
      email: email(contact.email, DEFAULT_GLOBAL_SETTINGS.contact.email),
      phoneDisplay: text(contact.phoneDisplay, DEFAULT_GLOBAL_SETTINGS.contact.phoneDisplay, 80),
      whatsappNumber: phoneDigits(contact.whatsappNumber, DEFAULT_GLOBAL_SETTINGS.contact.whatsappNumber),
      whatsappMessage: text(contact.whatsappMessage, DEFAULT_GLOBAL_SETTINGS.contact.whatsappMessage, 500),
    },
    social: {
      instagram: optionalUrl(social.instagram, DEFAULT_GLOBAL_SETTINGS.social.instagram),
      facebook: optionalUrl(social.facebook, DEFAULT_GLOBAL_SETTINGS.social.facebook),
      tiktok: optionalUrl(social.tiktok, DEFAULT_GLOBAL_SETTINGS.social.tiktok),
      linkedin: optionalUrl(social.linkedin, DEFAULT_GLOBAL_SETTINGS.social.linkedin),
    },
    announcement: {
      enabled: announcement.enabled === true,
      id: text(announcement.id, DEFAULT_GLOBAL_SETTINGS.announcement.id, 120).replace(/[^a-zA-Z0-9_-]/g, "-"),
      label: text(announcement.label, DEFAULT_GLOBAL_SETTINGS.announcement.label, 120),
      message: text(announcement.message, "", 300),
      ctaText: text(announcement.ctaText, "", 80),
      ctaHref: optionalUrl(announcement.ctaHref, DEFAULT_GLOBAL_SETTINGS.announcement.ctaHref),
      theme: validTheme,
      dismissible: announcement.dismissible !== false,
    },
    footer: {
      companyBlurb: text(footer.companyBlurb, DEFAULT_GLOBAL_SETTINGS.footer.companyBlurb, 500),
      showBlogLink: footer.showBlogLink !== false,
      buyerReadiness: readiness.length ? readiness : DEFAULT_GLOBAL_SETTINGS.footer.buyerReadiness,
      legalLinks: legalLinks.length ? legalLinks : DEFAULT_GLOBAL_SETTINGS.footer.legalLinks,
    },
  };
}

export function normalizeHomeLayout(value: unknown): HomeSectionLayout {
  const root = record(value);
  const incoming = Array.isArray(root.sections) ? root.sections : [];
  const byKey = new Map<HomeSectionKey, Record<string, unknown>>();
  for (const item of incoming) {
    const row = record(item);
    const key = row.key;
    if (typeof key === "string" && key in SECTION_LABELS) byKey.set(key as HomeSectionKey, row);
  }

  const sections = DEFAULT_HOME_LAYOUT.sections.map((fallback) => {
    const candidate = byKey.get(fallback.key) || {};
    const order = typeof candidate.order === "number" && Number.isFinite(candidate.order)
      ? Math.max(0, Math.min(1000, Math.round(candidate.order)))
      : fallback.order;
    const locked = fallback.key === "hero";
    return {
      key: fallback.key,
      label: SECTION_LABELS[fallback.key],
      visible: locked ? true : candidate.visible !== false,
      order: locked ? 0 : order,
      locked,
    };
  });

  sections.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  return { sections: sections.map((section, index) => ({ ...section, order: index * 10 })) };
}

export function globalWhatsappLink(settings: SiteGlobalSettings, message?: string) {
  const textValue = message || settings.contact.whatsappMessage;
  return `https://wa.me/${settings.contact.whatsappNumber}?text=${encodeURIComponent(textValue)}`;
}
