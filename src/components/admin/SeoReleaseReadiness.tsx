import { CheckCircle2, Copy, Globe2, Languages, SearchCheck, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PRIORITY_WAVES = [
  {
    wave: "Wave 1",
    markets: "Germany, Austria, Switzerland",
    locales: "de-DE, de-AT, de-CH",
    focus: "Lederhosen, Dirndl, Trachten, Oktoberfest wholesale and private label",
  },
  {
    wave: "Wave 2",
    markets: "United Kingdom, United States, Canada, Australia",
    locales: "en-GB, en-US, en-CA, en-AU",
    focus: "Custom sportswear, streetwear, leather apparel and private-label manufacturing",
  },
  {
    wave: "Wave 3",
    markets: "France, Spain, Italy, Netherlands",
    locales: "fr-FR, es-ES, it-IT, nl-NL",
    focus: "Category and manufacturer-intent pages selected from verified search demand",
  },
  {
    wave: "Wave 4",
    markets: "United Arab Emirates and Saudi Arabia",
    locales: "en-AE, ar-AE, ar-SA",
    focus: "Sportswear, uniforms, activewear, leather apparel and sourcing/manufacturer intent",
  },
  {
    wave: "Later evidence-led expansion",
    markets: "Other commercially relevant markets",
    locales: "Only after Search Console, lead and listing evidence",
    focus: "No bulk machine translation; create pages only where buyer intent and native review are available",
  },
];

const PAGE_GATE = [
  "A distinct commercial search intent exists for the market and language",
  "The localized title and description are written for buyers, not keyword lists",
  "Body copy is materially useful and not a sentence-by-sentence machine duplicate",
  "Product, MOQ, pricing, timing and documentation claims remain requirement-led",
  "A native or qualified reviewer approves terminology and readability",
  "Canonical points to the localized URL only when the page is approved for indexing",
  "hreflang includes the exact locale, English counterpart and x-default",
  "Internal links point to relevant products, trust, resources and inquiry routes",
  "Structured data matches visible page content",
  "Draft, thin, duplicate or unreviewed pages remain noindex and outside the sitemap",
];

const CONTENT_BRIEF = `MULTILINGUAL B2B SEO PAGE BRIEF

Market / locale: {{locale}}
Base English route: {{base route}}
Primary buyer intent: {{manufacturer / wholesale / private label / product category}}
Buyer type: {{importer / wholesaler / brand / distributor / club / retailer}}
Product category: {{category}}
Destination context: {{country / market}}

Required sections:
1. Clear localized H1 matching buyer intent
2. Irha Apparels manufacturing relevance to the product/market
3. Requirement-led product development and customization scope
4. Buyer inputs needed for quotation
5. Sampling, approvals and quality checkpoints
6. Labels, tags, packaging and documentation by program
7. Trust statement: experienced manufacturer; website newly built; scheduled live factory video call available
8. Localized FAQ based on real buyer questions
9. Strong RFQ / catalogue / factory-call CTA

Quality rules:
- No keyword stuffing
- No invented certification, capacity, buyer count, price, MOQ or delivery promise
- No generic country-name swapping
- No automatic indexing before review
- Native-quality terminology and grammar required
- Canonical, hreflang, schema and sitemap checked before publication`;

export default function SeoReleaseReadiness() {
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-5 mb-6">
      <section className="border border-sky-500/35 bg-sky-500/[0.06] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Languages size={21} className="text-sky-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300">Multilingual generation backend pending</p>
            <h2 className="font-display text-3xl mt-1">SEO scale is quality-gated before language volume.</h2>
            <p className="text-sm text-foreground/68 mt-3 max-w-4xl leading-relaxed">The locale registry, review workflow, sitemap logic and URL Inspection workspace are prepared. AI generation stays deferred until the final backend activation; pages will be released in market waves, not published across every language at once.</p>
          </div>
        </div>
      </section>

      <section className="border border-border/60 bg-card/25 p-5 md:p-6">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Globe2 size={14} /> Market release waves</div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
          {PRIORITY_WAVES.map((item) => (
            <article key={item.wave} className="border border-border/60 bg-background/35 p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-gold">{item.wave}</p>
              <h3 className="font-display text-xl mt-1">{item.markets}</h3>
              <p className="text-xs text-foreground/50 mt-2 font-mono">{item.locales}</p>
              <p className="text-xs text-foreground/65 mt-3 leading-relaxed">{item.focus}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-5">
        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><SearchCheck size={14} /> Indexability gate</div>
          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {PAGE_GATE.map((item) => <p key={item} className="flex gap-3 text-sm text-foreground/65 leading-relaxed"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{item}</p>)}
          </div>
        </section>

        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><ShieldCheck size={14} /> Localized page brief</div>
            <button type="button" onClick={() => void copy(CONTENT_BRIEF, "SEO page brief")} className="min-h-10 inline-flex items-center gap-2 border border-gold/50 text-gold px-3 py-2 text-[10px] uppercase tracking-[0.12em] hover:bg-gold hover:text-background"><Copy size={11} /> Copy</button>
          </div>
          <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-xs text-foreground/68 leading-relaxed border border-border/50 bg-background/35 p-4 max-h-[34rem] overflow-y-auto">{CONTENT_BRIEF}</pre>
        </section>
      </div>
    </div>
  );
}
