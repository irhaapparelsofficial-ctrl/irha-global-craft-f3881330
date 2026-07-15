import { WA_LINK, WHATSAPP, incomplete, isTooSimilar, redact, type PageContext, type SafeMessage } from "./core.ts";

export function fallbackReply(latest: string, messages: SafeMessage[]) {
  const german = /[äöüß]|\b(wie|welche|was|preis|kosten|muster|lieferung|fertigung|können|anfrage|kontakt)\b/i.test(latest);
  const previous = messages.filter((message) => message.role === "assistant").map((message) => message.content);
  if (incomplete(latest)) return german
    ? "Bitte vervollständigen Sie Ihre Frage, damit ich gezielt antworten kann."
    : "Please complete your question so I can answer accurately.";

  const lower = latest.toLowerCase();
  let answer = german
    ? "Nennen Sie bitte Produkt, geschätzte Menge und die Entscheidung, bei der Sie Hilfe brauchen."
    : "Share the product, estimated quantity and the decision you need help with.";

  if (/(price|cost|quote|rate|how much|preis|kosten|angebot)/i.test(lower)) {
    answer = german
      ? "Preise werden nach Prüfung von Produkt, Material, Menge, Branding, Verpackung und Lieferziel bestätigt. Nennen Sie Produkt, Menge und Zielland."
      : "Pricing is confirmed after reviewing product, material, quantity, branding, packaging and destination. Share the product, quantity and destination country.";
  } else if (/(sample|sampling|prototype|muster)/i.test(lower)) {
    answer = german
      ? "Der Musterweg hängt von Produkt, Material, Schnitt, Branding und Revisionen ab. Haben Sie ein Referenzbild, eine Skizze oder ein Tech-Pack?"
      : "The sampling path depends on product, material, pattern, branding and revisions. Do you have a reference image, sketch or tech pack?";
  } else if (/(private\s*label|oem|odm|own\s*brand|eigene\s*marke)/i.test(lower)) {
    answer = german
      ? "Ja. Private Label, OEM und ODM können Muster, Labels, Stickerei oder Druck und Serienfertigung umfassen. Welches Produkt planen Sie?"
      : "Yes. Private label, OEM and ODM can include sampling, labels, embroidery or printing, and bulk production. Which product are you planning?";
  } else if (/(lederhosen|trachten|dirndl|oktoberfest)/i.test(lower)) {
    answer = german
      ? "Wir unterstützen kundenspezifische Lederhosen-, Dirndl- und Trachtenprogramme. Suchen Sie Herren-, Damen- oder Accessoire-Produkte?"
      : "We support custom Lederhosen, Dirndl and Trachten programs. Are you looking for men's, women's or accessory products?";
  } else if (/(sportswear|teamwear|jersey|football|soccer|basketball|rugby|cricket)/i.test(lower)) {
    answer = german
      ? "Sportswear wird nach Stoff, Konstruktion, Druck, Stickerei, Größen und Branding geprüft. Für welche Sportart und Teamgröße?"
      : "Sportswear is reviewed around fabric, construction, printing, embroidery, sizing and branding. Which sport and approximate team size?";
  }

  if (!isTooSimilar(answer, previous)) return answer;
  return german
    ? "Ich behalte den bisherigen Kontext. Was möchten Sie als Nächstes klären: Material, Branding, Muster, Menge oder formelle Anfrage?"
    : "I have the earlier context. What should we clarify next: material, branding, sample, quantity or the formal inquiry?";
}

export function systemPrompt(messages: SafeMessage[], page: PageContext) {
  const previous = messages.filter((message) => message.role === "assistant").map((message) => redact(message.content)).slice(-4);
  return `You are Irha Guide, the official live B2B manufacturing assistant for Irha Apparels in Sialkot, Pakistan.
Answer the buyer's exact question in English or German and remember the conversation.
Use supplied product, quantity, market, material and branding details. Resolve follow-ups such as "it", "same design" and "what about price" from prior messages.
Give the direct answer first, stay concise, ask at most one necessary follow-up, never restart with a welcome, and never repeat or lightly paraphrase an earlier answer.
Never invent price, MOQ, timing, shipping, certification or commercial promises. Pricing is confirmed after product, material, quantity, branding, packaging and destination review.
For formal review use the inquiry form or WhatsApp ${WHATSAPP} (${WA_LINK}). A live factory video view can be requested.
Current page: ${page.path ?? "/"} — ${page.title ?? "Irha Apparels"}.
Earlier assistant answers that must not be repeated:\n${previous.map((answer, index) => `${index + 1}. ${answer}`).join("\n") || "None"}\n`;
}
