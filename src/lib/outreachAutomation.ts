import type { SalesCard } from "@/lib/salesPipeline";

export type OutreachChannel = "email" | "whatsapp";

export type OutreachApproval = {
  email: boolean;
  whatsapp: boolean;
  approvedAt: string | null;
};

export type OutreachDraft = {
  reference: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  productInterest: string;
  emailSubject: string;
  emailBody: string;
  whatsappBody: string;
  warnings: string[];
  emailReady: boolean;
  whatsappReady: boolean;
};

const GENERIC_NAMES = new Set([
  "buyer",
  "catalogue buyer",
  "customer",
  "prospect",
  "unknown",
]);

function clean(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function firstName(value: string) {
  const normalized = clean(value);
  if (!normalized || GENERIC_NAMES.has(normalized.toLowerCase())) return "";
  return normalized.split(" ")[0] || "";
}

export function isValidEmail(value: string) {
  const email = clean(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeWhatsAppNumber(value: string) {
  let digits = clean(value).replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

function productLabel(card: SalesCard) {
  return clean(card.productInterest) || "custom apparel and private-label production";
}

function companyLabel(card: SalesCard) {
  return clean(card.company) || clean(card.name) || "your company";
}

function safeSubjectProduct(product: string) {
  const compact = product.replace(/[\r\n]+/g, " ").replace(/[|<>]/g, "").trim();
  return compact.length > 70 ? `${compact.slice(0, 67).trim()}…` : compact;
}

export function buildOutreachDraft(card: SalesCard): OutreachDraft {
  const company = companyLabel(card);
  const contactName = firstName(card.name);
  const country = clean(card.country);
  const product = productLabel(card);
  const email = clean(card.email).toLowerCase();
  const phone = clean(card.phone);
  const greeting = contactName ? `Hello ${contactName},` : `Hello ${company} team,`;
  const locationContext = country ? ` in ${country}` : "";

  const emailSubject = `${safeSubjectProduct(product)} manufacturing discussion | Irha Apparels`;
  const emailBody = [
    greeting,
    "",
    `I am reaching out from Irha Apparels, an experienced B2B apparel manufacturer in Sialkot, Pakistan. We would like to explore whether our ${product} manufacturing support could be relevant for ${company}${locationContext}.`,
    "",
    "We support requirement-led OEM, ODM and private-label programs, including custom cut and sew, branding, labels and buyer-specified packaging. Materials, quantities, sampling, pricing and production timing are confirmed only after reviewing the exact brief.",
    "",
    "Buyer verification can include direct contact, a written program scope and an appointment-based live factory call.",
    "",
    `Could you share whether ${company} is currently reviewing suppliers or new product programs in this category?`,
    "",
    "Regards,",
    "Irha Apparels",
    "Sialkot, Pakistan",
  ].join("\n");

  const whatsappBody = [
    greeting,
    "",
    `This is Irha Apparels, an experienced B2B apparel manufacturer in Sialkot, Pakistan. We would like to discuss possible ${product} manufacturing support for ${company}.`,
    "",
    "An appointment-based live factory call may be requested. Commercial details are confirmed after reviewing the exact requirement.",
    "",
    "May I share our relevant manufacturing information and discuss your current sourcing needs?",
  ].join("\n");

  const warnings: string[] = [];
  if (!clean(card.company)) warnings.push("Company name is missing; confirm it before outreach.");
  if (!clean(card.productInterest)) warnings.push("Product interest is missing; the draft uses a general apparel description.");
  if (!isValidEmail(email)) warnings.push("A valid email address is required before email approval.");
  if (!normalizeWhatsAppNumber(phone)) warnings.push("A complete international WhatsApp number is required before WhatsApp approval.");
  if (card.stage === "lost") warnings.push("Buyer is marked lost; active outreach should remain stopped.");
  if (card.stage === "won") warnings.push("Buyer is already won; use a repeat-order message instead of first outreach.");

  return {
    reference: card.reference,
    company,
    contactName,
    email,
    phone,
    country,
    productInterest: product,
    emailSubject,
    emailBody,
    whatsappBody,
    warnings,
    emailReady: isValidEmail(email) && card.stage !== "lost" && card.stage !== "won",
    whatsappReady: Boolean(normalizeWhatsAppNumber(phone)) && card.stage !== "lost" && card.stage !== "won",
  };
}

export function gmailComposeUrl(draft: OutreachDraft) {
  if (!draft.emailReady) return "";
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: draft.email,
    su: draft.emailSubject,
    body: draft.emailBody,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function whatsappComposeUrl(draft: OutreachDraft) {
  const number = normalizeWhatsAppNumber(draft.phone);
  if (!draft.whatsappReady || !number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(draft.whatsappBody)}`;
}

export function spreadsheetSafe(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown) {
  const safe = spreadsheetSafe(value).replace(/\r?\n/g, "\n");
  return `"${safe.replace(/"/g, '""')}"`;
}

export function outreachDraftsCsv(cards: SalesCard[]) {
  const headers = [
    "Reference",
    "Company",
    "Contact Name",
    "Country",
    "Email",
    "WhatsApp/Phone",
    "Product Interest",
    "Email Ready",
    "Email Subject",
    "Email Message",
    "WhatsApp Ready",
    "WhatsApp Message",
    "Warnings",
  ];

  const rows = cards.map((card) => {
    const draft = buildOutreachDraft(card);
    return [
      draft.reference,
      draft.company,
      draft.contactName,
      draft.country,
      draft.email,
      draft.phone,
      draft.productInterest,
      draft.emailReady ? "YES" : "NO",
      draft.emailSubject,
      draft.emailBody,
      draft.whatsappReady ? "YES" : "NO",
      draft.whatsappBody,
      draft.warnings.join(" | "),
    ];
  });

  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
