export type GuideRole = "user" | "assistant";
export type GuideProvider = "lovable-ai-gateway" | "gemini" | "deterministic-backup" | "idle";

export type GuideMessage = {
  id: string;
  role: GuideRole;
  content: string;
  provider?: GuideProvider;
};

export const GUIDE_SESSION_MESSAGES_KEY = "irha:guide:messages:v3";

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

function normalizedWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function isGuideReplyDuplicate(value: string, previousAssistantReplies: string[]): boolean {
  const candidate = value.trim();
  if (!candidate || previousAssistantReplies.length === 0) return false;

  const compactCandidate = candidate.toLowerCase().replace(/\s+/g, " ");
  const candidateWords = new Set(normalizedWords(candidate));

  return previousAssistantReplies.slice(-4).some((previous) => {
    const compactPrevious = previous.trim().toLowerCase().replace(/\s+/g, " ");
    if (!compactPrevious) return false;
    if (compactCandidate === compactPrevious) return true;
    if (compactCandidate.length > 90 && compactPrevious.length > 90) {
      if (compactCandidate.includes(compactPrevious) || compactPrevious.includes(compactCandidate)) return true;
    }

    const previousWords = new Set(normalizedWords(previous));
    if (candidateWords.size < 5 || previousWords.size < 5) return false;
    let intersection = 0;
    candidateWords.forEach((word) => {
      if (previousWords.has(word)) intersection += 1;
    });
    const union = new Set([...candidateWords, ...previousWords]).size;
    return union > 0 && intersection / union >= 0.78;
  });
}

function nonRepeatingFallback(reply: string, query: string, previousAssistantReplies: string[], german: boolean) {
  if (!isGuideReplyDuplicate(reply, previousAssistantReplies)) return reply;

  const lower = query.toLowerCase();
  if (/(price|cost|quote|rate|how much|preis|kosten|angebot|stückpreis)/i.test(lower)) {
    return german
      ? "Ich habe die Preisgrundlage bereits erklärt. Für den nächsten Schritt brauche ich nur Produkt, geschätzte Menge und Zielland; danach können Sie eine formelle Anfrage senden."
      : "I have already covered the pricing basis. For the next step, share the product, estimated quantity and destination country, then the team can review a formal inquiry.";
  }
  if (/(sample|sampling|prototype|muster)/i.test(lower)) {
    return german
      ? "Zum Musterprozess: Haben Sie bereits ein Referenzbild, eine Skizze oder ein Tech-Pack? Das bestimmt den sinnvollsten nächsten Schritt."
      : "For sampling, do you already have a reference image, sketch or tech pack? That determines the most useful next step.";
  }
  return german
    ? "Ich behalte den bisherigen Kontext. Was möchten Sie als Nächstes klären: Material, Branding, Muster, Menge oder formelle Anfrage?"
    : "I have the earlier context. What should we clarify next: material, branding, sample, quantity or the formal inquiry?";
}

export function fallbackGuideReply(text: string, previousAssistantReplies: string[] = []): string {
  const query = text.trim();
  const lower = query.toLowerCase();
  const german = detectGuideLanguage(query) === "de";
  let reply: string;

  if (isIncompleteGuideFragment(query)) {
    reply = german
      ? "Bitte vervollständigen Sie Ihre Frage, damit ich Ihnen gezielt helfen kann."
      : "Please complete your question so I can help you accurately.";
  } else if (/^(hi|hello|hey|hallo|guten\s*(tag|morgen|abend)|salam|assalam)/i.test(query)) {
    reply = previousAssistantReplies.length > 0
      ? (german
        ? "Willkommen zurück. Was möchten Sie jetzt prüfen: Produkt, Muster, Branding, Menge oder Angebot?"
        : "Welcome back. What would you like to check now: product, sampling, branding, quantity or quotation?")
      : (german
        ? "Hallo! Ich helfe Ihnen bei Produkten, Private Label, Mustern, Branding und dem Fertigungsprozess. Welches Produkt prüfen Sie?"
        : "Hello! I can help with products, private label, sampling, branding and manufacturing. Which product are you reviewing?");
  } else if (/(private\s*label|white\s*label|oem|odm|own\s*brand|eigene\s*marke|privatmarke)/i.test(lower)) {
    reply = german
      ? "Ja. Private-Label-, OEM- und ODM-Programme können Musterentwicklung, kundenspezifische Labels, Stickerei oder Druck und spätere Serienfertigung umfassen. Welches Produkt und welche Branding-Methode planen Sie?"
      : "Yes. Private-label, OEM and ODM programs can include sampling, custom labels, embroidery or printing, and later bulk production. Which product and branding method are you planning?";
  } else if (/(price|cost|quote|rate|how much|preis|kosten|angebot|stückpreis)/i.test(lower)) {
    reply = german
      ? "Preise werden nach Prüfung von Produkt, Material, Menge, Branding, Verpackung und Lieferziel bestätigt. Nennen Sie Produkt, Menge und Zielland für den nächsten Schritt."
      : "Pricing is confirmed after reviewing product, material, quantity, branding, packaging and destination. Share the product, estimated quantity and destination country for the next step.";
  } else if (/(moq|minimum|minimum order|mindestmenge)/i.test(lower)) {
    reply = german
      ? "Die Mindestmenge wird je Produktprogramm anhand von Material, Konstruktion, Branding sowie Größen- und Farbmix bestätigt. Um welches Produkt geht es?"
      : "MOQ is confirmed per product program based on material, construction, branding, and the size or color mix. Which product are you considering?";
  } else if (/(sample|sampling|prototype|muster)/i.test(lower)) {
    reply = german
      ? "Der Musterprozess hängt von Produkt, Material, Schnittentwicklung, Branding und möglichen Revisionen ab. Haben Sie ein Referenzbild, eine Skizze oder ein Tech-Pack?"
      : "The sampling path depends on product, materials, pattern development, branding and possible revisions. Do you have a reference image, sketch or tech pack?";
  } else if (/(label|tag|branding|logo|embroidery|embroider|print|dtf|sublimation|etikett|stickerei|druck)/i.test(lower)) {
    reply = german
      ? "Branding kann Weblabels, Pflegeetiketten, Hangtags, Stickerei, DTF oder ein materialgeeignetes Druckverfahren umfassen. Welches Produkt und welche Logo-Größe planen Sie?"
      : "Branding can include woven labels, care labels, hangtags, embroidery, DTF or a material-suitable print method. Which product and logo size are you planning?";
  } else if (/(lederhosen|trachten|bavarian|oktoberfest)/i.test(lower)) {
    reply = german
      ? "Wir zeigen kundenspezifische Programme für Lederhosen, Dirndl und Trachten. Suchen Sie Herren-Lederhosen, Damen-Dirndl oder Accessoires?"
      : "We present custom Lederhosen, Dirndl and Trachten programs. Are you looking for men's Lederhosen, women's Dirndl or accessories?";
  } else if (/(dirndl|blouse|apron|schürze)/i.test(lower)) {
    reply = german
      ? "Dirndl-Programme können Stoff, Mieder, Schürze, Bluse, Verzierungen, Labels und Verpackung umfassen. Planen Sie Mini, Midi oder Lang?"
      : "Dirndl programs can cover fabric, bodice, apron, blouse, decoration, labels and packaging. Are you planning mini, midi or long length?";
  } else if (/(leather|jacket|vest|leder|weste)/i.test(lower)) {
    reply = german
      ? "Für Lederbekleidung werden Lederart, Konstruktion, Futter, Beschläge und Branding geprüft. Geht es um Jacke, Weste oder ein anderes Produkt?"
      : "For leather apparel, leather type, construction, lining, hardware and branding are reviewed. Is it a jacket, vest or another product?";
  } else if (/(sportswear|teamwear|jersey|kit|football|soccer|basketball|rugby|cricket)/i.test(lower)) {
    reply = german
      ? "Sportswear- und Teamwear-Programme werden nach Stoff, Konstruktion, Druck, Stickerei, Größen und Branding geprüft. Für welche Sportart und Teamgröße?"
      : "Sportswear and teamwear programs are reviewed around fabric, construction, printing, embroidery, sizing and branding. Which sport and approximate team size?";
  } else if (/(streetwear|activewear|hoodie|tracksuit|gym|nightwear|leisure|sleepwear)/i.test(lower)) {
    reply = german
      ? "Wir zeigen Programme für Streetwear, Activewear sowie Leisure- und Nightwear. Welches Produkt, Stoffgewicht und Branding planen Sie?"
      : "We present Streetwear, Activewear, Leisurewear and Nightwear programs. Which product, fabric weight and branding are you planning?";
  } else if (/(factory|video call|visit|manufacturing environment|fabrik|videoanruf)/i.test(lower)) {
    reply = german
      ? "Eine Live-Videoansicht der Fertigungsumgebung kann während der Anforderungsbesprechung angefragt werden. Möchten Sie dafür eine Anfrage senden?"
      : "A live video view of the manufacturing environment can be requested during the requirement discussion. Would you like to send a meeting inquiry?";
  } else if (/(contact|inquiry|enquiry|whatsapp|email|anfrage|kontakt)/i.test(lower)) {
    reply = german
      ? "Für eine genaue Prüfung senden Sie Produkt, Material, Menge, Größen, Branding und Zielmarkt über die Anfrage. Für eine schnelle Übergabe können Sie auch das menschliche Live-Team öffnen."
      : "For an exact review, send product, material, quantity, sizes, branding and target market through the inquiry. You can also open the human live team for a direct handover.";
  } else if (/(category|categories|range|products|collection|kollektion|kollektionen|produkte)/i.test(lower)) {
    reply = german
      ? "Die Hauptprogramme umfassen Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear sowie Leisure & Nightwear. Welche Produktgruppe interessiert Sie?"
      : "The main programs include Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear, and Leisure & Nightwear. Which product group interests you?";
  } else {
    reply = german
      ? "Damit ich gezielt antworte, nennen Sie bitte Produkt, geschätzte Menge und die Entscheidung, bei der Sie Hilfe brauchen."
      : "To answer precisely, share the product, estimated quantity and the decision you need help with.";
  }

  return nonRepeatingFallback(reply, query, previousAssistantReplies, german);
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
      .slice(-24)
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
