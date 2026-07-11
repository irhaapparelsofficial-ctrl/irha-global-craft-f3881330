import { CheckCircle2, Copy, ShieldCheck, Target, UserSearch } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Blueprint = {
  title: string;
  market: string;
  products: string;
  buyerTypes: string;
  target: number;
  queries: string[];
  qualification: string[];
};

const BLUEPRINTS: Blueprint[] = [
  {
    title: "DACH Trachten buyers",
    market: "Germany, Austria, Switzerland",
    products: "Lederhosen, Dirndl, Trachten shirts, vests, jackets and accessories",
    buyerTypes: "Wholesalers, importers, distributors, Trachten retailers, Oktoberfest specialists, private-label brands",
    target: 100,
    queries: [
      "Trachten Großhandel Deutschland",
      "Lederhosen Händler Österreich",
      "Dirndl Großhandel Schweiz",
      "Oktoberfest Bekleidung Importeur",
      "Trachten Private Label Händler",
    ],
    qualification: ["Public company website", "Relevant Trachten assortment", "B2B or multi-store signal", "Country and source URL", "Contact role or company inbox evidence"],
  },
  {
    title: "European sportswear programs",
    market: "United Kingdom, Germany, Netherlands, France, Spain, Italy",
    products: "Teamwear, football kits, tracksuits, training wear, rugby, basketball and performance apparel",
    buyerTypes: "Teamwear distributors, sports clubs, academies, private-label brands, uniform suppliers, sporting-goods retailers",
    target: 100,
    queries: [
      "custom teamwear distributor Europe",
      "private label sportswear brand UK",
      "football kit supplier Germany",
      "sports academy apparel supplier",
      "teamwear wholesale Netherlands",
    ],
    qualification: ["Custom/teamwear relevance", "Bulk or organization-buying signal", "Current product/category evidence", "Public contact path", "Destination and language"],
  },
  {
    title: "North America private label",
    market: "United States and Canada",
    products: "Streetwear, activewear, sportswear, leather apparel and leisurewear",
    buyerTypes: "Private-label brands, distributors, specialty retailers, sourcing agencies and promotional apparel companies",
    target: 100,
    queries: [
      "private label streetwear brand USA",
      "activewear distributor Canada",
      "custom leather apparel brand USA",
      "sportswear sourcing company North America",
      "wholesale clothing importer Canada",
    ],
    qualification: ["Real brand/company identity", "Active commercial website", "Product fit", "Wholesale/private-label signal", "Contact confidence and source evidence"],
  },
  {
    title: "Gulf apparel buyers",
    market: "United Arab Emirates, Saudi Arabia, Qatar, Kuwait",
    products: "Sportswear, uniforms, activewear, leather apparel and custom private-label garments",
    buyerTypes: "Importers, distributors, uniform suppliers, sports retailers, clubs, academies and private-label brands",
    target: 75,
    queries: [
      "sportswear importer UAE",
      "uniform supplier Saudi Arabia",
      "private label clothing Dubai",
      "teamwear distributor Qatar",
      "leather apparel wholesaler Gulf",
    ],
    qualification: ["Company registration/contact evidence", "Relevant product or institutional buyer signal", "City/country", "Public website or directory evidence", "Email/phone confidence"],
  },
  {
    title: "Australia and New Zealand",
    market: "Australia and New Zealand",
    products: "Sportswear, teamwear, streetwear, activewear and private-label apparel",
    buyerTypes: "Clubs, teamwear suppliers, brands, distributors, promotional apparel suppliers and specialty retailers",
    target: 60,
    queries: [
      "custom teamwear supplier Australia",
      "private label activewear brand Australia",
      "sports uniform distributor New Zealand",
      "streetwear wholesale Australia",
      "club apparel supplier New Zealand",
    ],
    qualification: ["Business website", "Bulk/custom requirement signal", "Category match", "Public buyer contact", "Geographic and source evidence"],
  },
];

const EVIDENCE_RULES = [
  "Every candidate must have a source URL and company-name evidence",
  "Website domain is the primary duplicate key; email and phone are secondary",
  "A social profile alone is not enough for verified status",
  "Generic directories may support discovery but do not prove buyer intent",
  "Contact role, company inbox or public contact page must be recorded",
  "Import to Buyer CRM only after manual review or a strong verification score",
  "Rejected and duplicate candidates remain logged to prevent repeated research",
];

function blueprintText(item: Blueprint) {
  return `Campaign: ${item.title}\nMarket: ${item.market}\nProducts: ${item.products}\nBuyer types: ${item.buyerTypes}\nTarget: ${item.target}\nSearch queries:\n- ${item.queries.join("\n- ")}\nQualification:\n- ${item.qualification.join("\n- ")}`;
}

export default function LeadCampaignBlueprints() {
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-5 mb-6">
      <section className="border border-sky-500/35 bg-sky-500/[0.06] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <UserSearch size={21} className="text-sky-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300">Lead discovery backend pending</p>
            <h2 className="font-display text-3xl mt-1">Campaign strategy is ready before credits are used.</h2>
            <p className="text-sm text-foreground/68 mt-3 max-w-4xl leading-relaxed">These blueprints define markets, buyer types, search intent and evidence rules now. Live discovery and enrichment will start only after the final `lead-research` activation and an explicit campaign confirmation.</p>
          </div>
        </div>
      </section>

      <section className="border border-border/60 bg-card/25 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Target size={14} /> Priority campaign blueprints</div>
            <h2 className="font-display text-3xl mt-2">Buyer-growth markets</h2>
          </div>
          <button type="button" onClick={() => void copy(BLUEPRINTS.map(blueprintText).join("\n\n"), "All lead blueprints")} className="min-h-11 inline-flex items-center gap-2 border border-gold/50 text-gold px-4 py-2 text-[10px] uppercase tracking-[0.14em] hover:bg-gold hover:text-background"><Copy size={11} /> Copy all</button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-5">
          {BLUEPRINTS.map((item) => (
            <article key={item.title} className="border border-border/60 bg-background/35 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[9px] uppercase tracking-[0.16em] text-gold">{item.market}</p><h3 className="font-display text-2xl mt-1">{item.title}</h3></div>
                <span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-foreground/50">Target {item.target}</span>
              </div>
              <p className="text-xs text-foreground/65 mt-3"><span className="text-foreground/40">Products:</span> {item.products}</p>
              <p className="text-xs text-foreground/65 mt-2"><span className="text-foreground/40">Buyer types:</span> {item.buyerTypes}</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4 flex-1">
                <div><p className="text-[9px] uppercase tracking-[0.14em] text-gold mb-2">Search intent</p><ul className="space-y-1.5">{item.queries.map((query) => <li key={query} className="text-xs text-foreground/60">• {query}</li>)}</ul></div>
                <div><p className="text-[9px] uppercase tracking-[0.14em] text-gold mb-2">Qualification</p><ul className="space-y-1.5">{item.qualification.map((rule) => <li key={rule} className="text-xs text-foreground/60">• {rule}</li>)}</ul></div>
              </div>
              <button type="button" onClick={() => void copy(blueprintText(item), item.title)} className="mt-5 min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 hover:border-gold hover:text-gold px-3 py-2 text-[10px] uppercase tracking-[0.14em]"><Copy size={11} /> Copy blueprint</button>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-border/60 bg-card/25 p-5 md:p-6">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><ShieldCheck size={14} /> Evidence and duplicate rules</div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {EVIDENCE_RULES.map((item) => <p key={item} className="flex gap-3 text-sm text-foreground/65"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{item}</p>)}
        </div>
      </section>
    </div>
  );
}
