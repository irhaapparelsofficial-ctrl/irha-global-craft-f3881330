export type GuideRole = "user" | "assistant";
export type GuideProvider = "lovable-ai-gateway" | "gemini" | "deterministic-backup" | "idle";

export type GuideMessage = {
  id: string;
  role: GuideRole;
  content: string;
  provider?: GuideProvider;
};

export const GUIDE_SESSION_MESSAGES_KEY = "irha:guide:messages:v2";

const GERMAN_HINTS = /[äöüß]|\b(wie|welche|was|preis|kosten|muster|lieferung|fertigung|habt|können|kollektionen|anfrage|kontakt|etikett|stickerei)\b/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export function detectGuideLanguage(text: string): "de" | "en" {
  return GERMAN_HINTS.test(text) ? "de" : "en";
}

export function isIncompleteGuideFragment(text: string): boolean {
  const compact = text.trim().replace(/[^\p{L}\p{N}]/gu, "");
  return compact.length > 0 && compact.length <= 2;
}

export function fallbackGuideReply(text: string): string {
  const query = text.trim();
  const lower = query.toLowerCase();
  const german = detectGuideLanguage(query) === "de";

  if (isIncompleteGuideFragment(query)) {
    return german
      ? "Bitte vervollständigen Sie Ihre Frage, damit ich Ihnen gezielt helfen kann."
      : "Please complete your question so I can help you accurately.";
  }

  if (/^(hi|hello|hey|hallo|guten\s*(tag|morgen|abend)|salam|assalam)/i.test(query)) {
    return german
      ? "Hallo! Ich helfe Ihnen gern bei Produkten, Private Label, Mustern, Branding und dem Fertigungsprozess. Was möchten Sie prüfen?"
      : "Hello! I can help with products, private label, sampling, branding and the manufacturing process. What would you like to review?";
  }

  if (/(private\s*label|white\s*label|oem|odm|own\s*brand|eigene\s*marke|privatmarke)/i.test(lower)) {
    return german
      ? "Ja. Wir prüfen Private-Label-, OEM- und ODM-Programme einschließlich Musterentwicklung, kundenspezifischer Labels, Stickerei oder Druck sowie Großserienfertigung. Senden Sie Produkt, Material, Menge und Branding-Anforderungen für die genaue Prüfung."
      : "Yes. We review private-label, OEM and ODM programs including sampling, custom labels, embroidery or printing, and bulk production. Share the product, material, quantity and branding requirements for an exact review.";
  }

  if (/(price|cost|quote|rate|how much|preis|kosten|angebot|stückpreis)/i.test(lower)) {
    return german
      ? "Preise werden erst nach Prüfung von Produkt, Material, Menge, Branding, Verpackung und Lieferanforderungen bestätigt. Nutzen Sie bitte die Anfrage oder WhatsApp für ein formelles Angebot."
      : "Pricing is confirmed only after review of the product, material, quantity, branding, packaging and delivery requirements. Please use the inquiry form or WhatsApp for a formal quotation.";
  }

  if (/(moq|minimum|minimum order|mindestmenge)/i.test(lower)) {
    return german
      ? "Die Mindestmenge wird je Produktprogramm nach Prüfung von Material, Konstruktion, Branding sowie Größen- und Farbmix bestätigt."
      : "MOQ is confirmed per product program after review of material, construction, branding, and the size or color mix.";
  }

  if (/(sample|sampling|prototype|muster)/i.test(lower)) {
    return german
      ? "Der Musterprozess richtet sich nach Produkt, Material, Schnittentwicklung, Branding und möglichen Revisionen. Senden Sie eine Skizze, ein Tech-Pack oder ein Referenzbild für die Prüfung."
      : "The sampling path depends on the product, materials, pattern development, branding and possible revisions. Send a sketch, tech pack or reference image for review.";
  }

  if (/(label|tag|branding|logo|embroidery|embroider|print|dtf|sublimation|etikett|stickerei|druck)/i.test(lower)) {
    return german
      ? "Branding kann je nach Produkt kundenspezifische Weblabels, Pflegeetiketten, Hangtags, Stickerei, DTF oder andere geeignete Druckverfahren umfassen. Die umsetzbare Methode wird nach Material und Design geprüft."
      : "Branding can include custom woven labels, care labels, hangtags, embroidery, DTF or another suitable print method depending on the product. The workable method is confirmed after reviewing the material and design.";
  }

  if (/(lederhosen|trachten|bavarian|oktoberfest)/i.test(lower)) {
    return german
      ? "Wir zeigen kundenspezifische Programme für Lederhosen, Dirndl und Trachten. Öffnen Sie die Kategorie Bavarian & Trachten Wear oder senden Sie Ihre Referenz für eine Prüfung."
      : "We present custom Lederhosen, Dirndl and Trachten programs. Browse Bavarian & Trachten Wear or send your reference for requirement review.";
  }

  if (/(dirndl|blouse|apron|schürze)/i.test(lower)) {
    return german
      ? "Dirndl-Programme können Stoff, Mieder, Schürze, Bluse, Verzierungen, Labels und Verpackung umfassen. Die umsetzbare Kombination wird pro Anfrage geprüft."
      : "Dirndl programs can cover fabric, bodice, apron, blouse, decoration, labels and packaging. The workable combination is reviewed per requirement.";
  }

  if (/(leather|jacket|vest|leder|weste)/i.test(lower)) {
    return german
      ? "Wir besprechen kundenspezifische Lederbekleidung wie Jacken und Westen. Lederart, Konstruktion, Futter, Beschläge und Branding werden vor dem Angebot geprüft."
      : "We discuss custom leather apparel such as jackets and vests. Leather type, construction, lining, hardware and branding are reviewed before quotation.";
  }

  if (/(sportswear|teamwear|jersey|kit|football|soccer|basketball|rugby|cricket)/i.test(lower)) {
    return german
      ? "Sportswear- und Teamwear-Programme werden nach Stoff, Konstruktion, Druck, Stickerei, Größen und Branding geprüft."
      : "Sportswear and teamwear programs are reviewed around fabric, construction, printing, embroidery, sizing and branding requirements.";
  }

  if (/(streetwear|activewear|hoodie|tracksuit|gym|nightwear|leisure|sleepwear)/i.test(lower)) {
    return german
      ? "Wir zeigen Programme für Streetwear, Activewear sowie Leisure- und Nightwear. Senden Sie Ihr Produktbriefing oder eine Referenz für die passende Kategorie."
      : "We present Streetwear, Activewear, Leisurewear and Nightwear programs. Send your product brief or reference so the right category can be reviewed.";
  }

  if (/(factory|video call|visit|manufacturing environment|fabrik|videoanruf)/i.test(lower)) {
    return german
      ? "Eine Live-Videoansicht der Fertigungsumgebung kann während der Anforderungsbesprechung angefragt werden."
      : "A live video view of the manufacturing environment can be requested during the requirement discussion.";
  }

  if (/(contact|inquiry|enquiry|whatsapp|email|anfrage|kontakt)/i.test(lower)) {
    return german
      ? "Für eine genaue Prüfung senden Sie bitte die Anfrage mit Produkt, Material, Menge, Größen, Branding und Zielmarkt. Alternativ können Sie uns über WhatsApp kontaktieren."
      : "For an exact review, send an inquiry with the product, material, quantity, sizes, branding and target market. You can also contact us on WhatsApp.";
  }

  if (/(category|categories|range|products|collection|kollektion|kollektionen|produkte)/i.test(lower)) {
    return german
      ? "Unsere Hauptprogramme umfassen Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear sowie Leisure & Nightwear."
      : "Our main programs include Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear, and Leisure & Nightwear.";
  }

  return german
    ? "Ich kann Ihnen zu Produkten, Kategorien, Mustern, Private Label, Branding und dem Fertigungsprozess helfen. Nennen Sie bitte das Produkt und Ihre Anforderung."
    : "I can help with products, categories, sampling, private label, branding and the manufacturing process. Please tell me the product and your requirement.";
}

export function shouldSendGuideOnEnter(options: {
  key: string;
  shiftKey: boolean;
  isMobile: boolean;
  text: string;
}): boolean {
  if (options.key !== "Enter" || options.shiftKey || options.isMobile) return false;
  return options.text.trim().length > 0;
}

export function redactGuideMessageForSession(value: string): string {
  return value.replace(EMAIL_PATTERN, "[email hidden]").replace(PHONE_PATTERN, "[phone hidden]").slice(0, 2_000);
}

export function parseStoredGuideMessages(raw: string | null): GuideMessage[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is GuideMessage => Boolean(
        item &&
        typeof item.id === "string" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim(),
      ))
      .slice(-20)
      .map((item) => ({
        id: item.id.slice(0, 120),
        role: item.role,
        content: item.content.slice(0, 2_000),
        provider: item.provider,
      }));
  } catch {
    return [];
  }
}
