import type { BusinessRulesMaster } from "@/lib/businessRules";
import type { LeadQualificationResult } from "@/lib/leadQualification";

export type BuyerReplyLanguage = "en" | "de";
export type BuyerReplyType = "acknowledgement" | "qualification" | "catalogue" | "follow_up" | "factory_call";

export type BuyerReplyInput = {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  country?: string | null;
  productInterest?: string | null;
  quantity?: string | null;
  message?: string | null;
  status?: string | null;
};

export type BuyerReplyDraft = {
  type: BuyerReplyType;
  language: BuyerReplyLanguage;
  subject: string;
  body: string;
  assumptions: string[];
  blockedClaims: string[];
};

const QUESTION_LABELS: Record<BuyerReplyLanguage, Record<string, string>> = {
  en: {
    "company name": "Company name and buyer type",
    "country / destination": "Destination country",
    "verified contact": "Preferred email or WhatsApp contact",
    "product/category interest": "Product or category required",
    "estimated quantity": "Estimated quantity per style/colour",
    "buyer type": "Whether you source for wholesale, retail, distribution, a team/club or private label",
    "requirement details": "Material, size range, colours, branding, labels, packaging and target timing",
  },
  de: {
    "company name": "Firmenname und Käufertyp",
    "country / destination": "Zielland",
    "verified contact": "Bevorzugte E-Mail- oder WhatsApp-Kontaktdaten",
    "product/category interest": "Benötigtes Produkt oder Sortiment",
    "estimated quantity": "Geplante Menge je Modell/Farbe",
    "buyer type": "Ob Sie für Großhandel, Einzelhandel, Distribution, Verein/Team oder Private Label einkaufen",
    "requirement details": "Material, Größen, Farben, Branding, Etiketten, Verpackung und gewünschter Zeitraum",
  },
};

function safe(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function greeting(language: BuyerReplyLanguage, name?: string | null) {
  const clean = safe(name);
  if (language === "de") return clean ? `Guten Tag ${clean},` : "Guten Tag,";
  return clean ? `Hello ${clean},` : "Hello,";
}

function signoff(language: BuyerReplyLanguage) {
  return language === "de"
    ? "Mit freundlichen Grüßen\nIrha Apparels\nwww.irhaapparels.com"
    : "Regards,\nIrha Apparels\nwww.irhaapparels.com";
}

function productLabel(input: BuyerReplyInput, language: BuyerReplyLanguage) {
  const product = safe(input.productInterest);
  if (product) return product;
  return language === "de" ? "Ihr Bekleidungsprogramm" : "your apparel program";
}

function missingQuestions(qualification: LeadQualificationResult, language: BuyerReplyLanguage) {
  const labels = qualification.missing
    .map((item) => QUESTION_LABELS[language][item] ?? item)
    .filter(Boolean)
    .slice(0, 7);
  if (labels.length === 0) return "";
  return labels.map((item) => `- ${item}`).join("\n");
}

function companyPositioning(rules: BusinessRulesMaster, language: BuyerReplyLanguage) {
  const factoryCall = rules.company.trustPoints.some((point) => /factory|video/i.test(point));
  if (language === "de") {
    return `Irha Apparels ist ein erfahrener B2B-Bekleidungshersteller aus ${rules.company.location}. Unsere Website wurde neu aufgebaut.${factoryCall ? " Auf Wunsch kann ein geplanter Live-Videoanruf aus dem Betrieb arrangiert werden." : ""}`;
  }
  return `Irha Apparels is a B2B apparel manufacturer based in ${rules.company.location}.${factoryCall ? " Buyers may request an appointment-based live factory video call for direct verification." : ""}`;
}

function commercialBoundary(rules: BusinessRulesMaster, language: BuyerReplyLanguage) {
  if (language === "de") {
    return "MOQ, Musterweg, Preis, Produktionszeit und Versandumfang werden erst nach Prüfung der genauen Anforderungen bestätigt.";
  }
  return "MOQ, sample path, pricing, production timing and shipping scope are confirmed only after the exact requirement is reviewed.";
}

function acknowledgement(input: BuyerReplyInput, rules: BusinessRulesMaster, language: BuyerReplyLanguage): BuyerReplyDraft {
  const product = productLabel(input, language);
  const subject = language === "de" ? `Ihre Anfrage zu ${product}` : `Your inquiry — ${product}`;
  const body = language === "de"
    ? `${greeting(language, input.name)}\n\nvielen Dank für Ihre Anfrage zu ${product}. Wir haben Ihre Angaben erhalten und prüfen, welche Produkt-, Muster- oder Angebotsinformationen als nächster Schritt sinnvoll sind.\n\n${companyPositioning(rules, language)}\n\n${commercialBoundary(rules, language)}\n\n${signoff(language)}`
    : `${greeting(language, input.name)}\n\nThank you for your inquiry regarding ${product}. We have received the information and will review the appropriate product, sample or quotation next step.\n\n${companyPositioning(rules, language)}\n\n${commercialBoundary(rules, language)}\n\n${signoff(language)}`;
  return { type: "acknowledgement", language, subject, body, assumptions: [], blockedClaims: rules.prohibitedClaims };
}

function qualification(input: BuyerReplyInput, qualificationResult: LeadQualificationResult, rules: BusinessRulesMaster, language: BuyerReplyLanguage): BuyerReplyDraft {
  const product = productLabel(input, language);
  const questions = missingQuestions(qualificationResult, language);
  const subject = language === "de" ? `Details für ${product}` : `Details required for ${product}`;
  const body = language === "de"
    ? `${greeting(language, input.name)}\n\nvielen Dank für Ihre Angaben zu ${product}. Damit wir den passenden Produkt-, Muster- oder Angebotsweg prüfen können, bestätigen Sie bitte noch:\n\n${questions || "- Genaue Produktspezifikation und gewünschter nächster Schritt"}\n\n${commercialBoundary(rules, language)}\n\n${companyPositioning(rules, language)}\n\n${signoff(language)}`
    : `${greeting(language, input.name)}\n\nThank you for sharing your requirement for ${product}. Before we review the correct product, sample or quotation path, please confirm:\n\n${questions || "- Exact product specification and preferred next step"}\n\n${commercialBoundary(rules, language)}\n\n${companyPositioning(rules, language)}\n\n${signoff(language)}`;
  return {
    type: "qualification",
    language,
    subject,
    body,
    assumptions: qualificationResult.missing.length ? [] : ["No critical missing fields were detected; the buyer may still need technical specification review."],
    blockedClaims: rules.prohibitedClaims,
  };
}

function catalogue(input: BuyerReplyInput, rules: BusinessRulesMaster, language: BuyerReplyLanguage): BuyerReplyDraft {
  const subject = language === "de" ? "Irha Apparels Kataloganfrage" : "Irha Apparels catalogue request";
  const product = productLabel(input, language);
  const body = language === "de"
    ? `${greeting(language, input.name)}\n\nvielen Dank für Ihre Kataloganfrage. Bitte bestätigen Sie, welche Kategorien für ${safe(input.company) || "Ihr Unternehmen"} relevant sind und ob Sie für Großhandel, Einzelhandel, Distribution, Verein/Team oder Private Label einkaufen.\n\nAktuelles Interesse: ${product}.\n\nSo können wir passende Produktinformationen statt eines ungezielten Katalogs bereitstellen. Für eine Angebotsprüfung benötigen wir zusätzlich Produktspezifikation, geplante Menge, Individualisierung und Zielland.\n\n${companyPositioning(rules, language)}\n\n${signoff(language)}`
    : `${greeting(language, input.name)}\n\nThank you for requesting the Irha Apparels catalogue. Please confirm which categories are relevant to ${safe(input.company) || "your business"} and whether you source for wholesale, retail, distribution, a club/team or private label.\n\nCurrent interest: ${product}.\n\nThis helps us share relevant product information instead of an unrelated catalogue. For quotation review, please also share the product specification, estimated quantity, customization and destination.\n\n${companyPositioning(rules, language)}\n\n${signoff(language)}`;
  return { type: "catalogue", language, subject, body, assumptions: [], blockedClaims: rules.prohibitedClaims };
}

function followUp(input: BuyerReplyInput, rules: BusinessRulesMaster, language: BuyerReplyLanguage): BuyerReplyDraft {
  const product = productLabel(input, language);
  const subject = language === "de" ? `Nachfrage — ${product}` : `Follow-up — ${product}`;
  const body = language === "de"
    ? `${greeting(language, input.name)}\n\nich möchte zu unserer bisherigen Kommunikation über ${product} nachfassen.\n\nFalls das Programm weiterhin aktuell ist, senden Sie bitte die noch offenen Produktdetails, geplante Menge, Individualisierung und das Zielland. Ein Tech Pack, Referenzmuster, Foto oder eine klare Produktbeschreibung kann ebenfalls geprüft werden.\n\n${commercialBoundary(rules, language)}\n\n${signoff(language)}`
    : `${greeting(language, input.name)}\n\nI am following up on our previous communication regarding ${product}.\n\nWhen the program is still active, please share any remaining product details, estimated quantity, customization and destination. A tech pack, reference sample, image or clear product brief can also be reviewed.\n\n${commercialBoundary(rules, language)}\n\n${signoff(language)}`;
  return { type: "follow_up", language, subject, body, assumptions: ["Use only when previous contact is recorded in the CRM."], blockedClaims: rules.prohibitedClaims };
}

function factoryCall(input: BuyerReplyInput, rules: BusinessRulesMaster, language: BuyerReplyLanguage): BuyerReplyDraft {
  const product = productLabel(input, language);
  const subject = language === "de" ? `Live-Videoanruf aus dem Betrieb — ${product}` : `Live factory video call — ${product}`;
  const body = language === "de"
    ? `${greeting(language, input.name)}\n\nwir können einen geplanten Live-Videoanruf aus dem Betrieb arrangieren, um ${product} zu besprechen und relevante Arbeitsbereiche zu zeigen.\n\nBitte senden Sie:\n- Bevorzugtes Datum und Zeitfenster mit Zeitzone\n- Produkt oder Programm\n- Geplante Menge\n- Tech Pack, Referenz oder Fragen\n\nNach Prüfung bestätigen wir einen geeigneten Termin. Kommerzielle Details werden separat schriftlich bestätigt.\n\n${signoff(language)}`
    : `${greeting(language, input.name)}\n\nWe can arrange a scheduled live factory video call to discuss ${product} and show the relevant working areas.\n\nPlease send:\n- Preferred date and time window with time zone\n- Product or program to review\n- Estimated quantity\n- Any tech pack, reference or questions\n\nA suitable slot will be confirmed after review. Commercial details are confirmed separately in writing.\n\n${signoff(language)}`;
  return { type: "factory_call", language, subject, body, assumptions: [], blockedClaims: rules.prohibitedClaims };
}

export function createBuyerReplyDraft(args: {
  type: BuyerReplyType;
  language: BuyerReplyLanguage;
  buyer: BuyerReplyInput;
  qualification: LeadQualificationResult;
  rules: BusinessRulesMaster;
}): BuyerReplyDraft {
  const { type, language, buyer, qualification: qualificationResult, rules } = args;
  if (type === "acknowledgement") return acknowledgement(buyer, rules, language);
  if (type === "catalogue") return catalogue(buyer, rules, language);
  if (type === "follow_up") return followUp(buyer, rules, language);
  if (type === "factory_call") return factoryCall(buyer, rules, language);
  return qualification(buyer, qualificationResult, rules, language);
}

export function suggestedReplyType(status?: string | null, kind?: string | null, qualification?: LeadQualificationResult): BuyerReplyType {
  const normalized = safe(status).toLowerCase();
  if (kind === "catalogue") return "catalogue";
  if (qualification?.missing.length) return "qualification";
  if (["contacted", "replied", "follow_up", "quotation_sent", "negotiation"].includes(normalized)) return "follow_up";
  return "acknowledgement";
}
