export const HOME_HERO_DOCUMENT_KEY = "site.home.hero";

export type HeroSlideContent = {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

export type HeroCmsContent = {
  slides: HeroSlideContent[];
};

export const DEFAULT_HERO_CONTENT: HeroCmsContent = {
  slides: [
    {
      eyebrow: "Sialkot · Custom B2B Manufacturing",
      title: "Bavarian Wear",
      highlight: "Program-Based",
      subtitle: "Custom lederhosen, dirndl and Trachten programs for wholesalers, retailers and private-label buyers.",
      ctaLabel: "View Collection",
      ctaHref: "/products/bavarian-trachten-wear",
    },
    {
      eyebrow: "OEM · ODM · Private Label",
      title: "Streetwear & Sportswear",
      highlight: "Made to Requirement",
      subtitle: "Custom sportswear, tracksuits and streetwear programs developed around buyer specifications.",
      ctaLabel: "View Collection",
      ctaHref: "/products/sportswear",
    },
    {
      eyebrow: "Custom Leather Programs",
      title: "Leather Apparel",
      highlight: "Requirement-Led",
      subtitle: "Custom leather jackets and apparel programs reviewed against material, construction and branding requirements.",
      ctaLabel: "View Collection",
      ctaHref: "/products/premium-leather-apparel",
    },
  ],
};

const fields: Array<keyof HeroSlideContent> = [
  "eyebrow",
  "title",
  "highlight",
  "subtitle",
  "ctaLabel",
  "ctaHref",
];

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function cleanHref(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim();
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned.slice(0, 300);
  if (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(cleaned)) return cleaned.slice(0, 300);
  return fallback;
}

export function normalizeHeroContent(value: unknown): HeroCmsContent {
  const source = value && typeof value === "object" && Array.isArray((value as HeroCmsContent).slides)
    ? (value as HeroCmsContent).slides
    : [];

  return {
    slides: DEFAULT_HERO_CONTENT.slides.map((fallback, index) => {
      const candidate = source[index] && typeof source[index] === "object"
        ? source[index] as Partial<HeroSlideContent>
        : {};

      const slide = { ...fallback };
      for (const field of fields) {
        if (field === "ctaHref") {
          slide.ctaHref = cleanHref(candidate.ctaHref, fallback.ctaHref);
          continue;
        }
        const maxLength = field === "subtitle" ? 280 : field === "title" || field === "highlight" ? 90 : 140;
        slide[field] = cleanText(candidate[field], fallback[field], maxLength);
      }
      return slide;
    }),
  };
}

export function validateHeroContent(value: HeroCmsContent) {
  const normalized = normalizeHeroContent(value);
  const errors: string[] = [];

  normalized.slides.forEach((slide, index) => {
    const number = index + 1;
    if (slide.title.length < 2) errors.push(`Slide ${number}: title is required`);
    if (slide.highlight.length < 2) errors.push(`Slide ${number}: highlight is required`);
    if (slide.subtitle.length < 20) errors.push(`Slide ${number}: subtitle should explain the buyer program`);
    if (slide.ctaLabel.length < 2) errors.push(`Slide ${number}: CTA label is required`);
    if (!(slide.ctaHref.startsWith("/") || slide.ctaHref.startsWith("https://"))) {
      errors.push(`Slide ${number}: CTA must use an internal path or HTTPS URL`);
    }
  });

  return { content: normalized, errors };
}
