import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Playbook = {
  title: string;
  category: string;
  purpose: string;
  command: string;
};

const PLAYBOOKS: Playbook[] = [
  {
    title: "Daily business brief",
    category: "Management",
    purpose: "Prioritize buyers, quotations, follow-ups, listings, social and SEO in one report.",
    command: "Aaj ka Irha Apparels B2B business brief banao. Buyer Inbox, overdue follow-ups, quotations, samples, repeat orders, high-priority leads, incomplete listings, social approvals aur SEO/indexing evidence ko review kro. Sirf verified data use kro. Har item ke sath owner, priority aur next action do. Koi external action approval ke baghair execute mat kro.",
  },
  {
    title: "Bavarian lead campaign",
    category: "Lead Growth",
    purpose: "Build a focused Germany, Austria and Switzerland buyer campaign.",
    command: "Germany, Austria aur Switzerland mein Lederhosen, Dirndl aur Trachten ke wholesalers, importers, distributors aur specialist retailers ke liye lead campaign prepare kro. Company website evidence, buyer-fit reason, country, category, source URL, contact confidence aur duplicate check zaroor do. Unverified contacts ko CRM import ke liye approve mat kro.",
  },
  {
    title: "Sportswear expansion campaign",
    category: "Lead Growth",
    purpose: "Target clubs, private labels, distributors and sourcing teams.",
    command: "UK, Germany, Netherlands, USA, Canada, Australia aur UAE mein custom sportswear/private-label buyers ke liye campaign plan banao. Clubs, academies, distributors, teamwear retailers aur brands ko separate segments mein rakho. Har segment ke liye offer, evidence rules, outreach angle aur qualification questions do.",
  },
  {
    title: "Buyer qualification",
    category: "Sales",
    purpose: "Score a buyer without inventing commercial facts.",
    command: "Selected buyer ko qualify kro. Company legitimacy, product fit, likely buying role, quantity signal, destination, contact quality, urgency, risk aur missing information assess kro. Score 0-100 do lekin har score ko evidence se justify kro. Final status aur next follow-up recommend kro; pricing ya MOQ invent mat kro.",
  },
  {
    title: "Quotation preparation brief",
    category: "Sales",
    purpose: "Turn buyer requirements into a production-ready quotation brief.",
    command: "Selected inquiry se quotation preparation brief banao. Product, material, GSM/weight, construction, artwork, labels, tags, packaging, sizes, colors, quantity, sample path, destination, Incoterm aur missing confirmations list kro. Buyer ko bhejne ke liye questions alag do. Final price, lead time ya shipping promise invent mat kro.",
  },
  {
    title: "Buyer follow-up reply",
    category: "Sales",
    purpose: "Draft a concise reply using Irha Apparels trust positioning.",
    command: "Selected buyer ke liye concise professional follow-up draft banao. Mention kro ke Irha Apparels experienced manufacturer hai aur website newly built hai. Trust point ke taur par scheduled live factory video call offer kro. Buyer ki exact requirement aur previous conversation use kro. Fake capacity, certification, MOQ, delivery ya price claim mat kro.",
  },
  {
    title: "Weekly social system",
    category: "Content",
    purpose: "Prepare platform-specific B2B content without fake publishing status.",
    command: "Agly 7 din ka Irha Apparels social content plan banao for LinkedIn, Instagram, Facebook aur TikTok. Har post ka buyer segment, content pillar, caption, CTA, hashtags, visual/reel brief aur approval state do. Product facts current website/approved media se lo. Koi post publish hua claim mat kro jab tak platform result verified na ho.",
  },
  {
    title: "Listings completion audit",
    category: "Listings",
    purpose: "Prioritize real listing work and evidence.",
    command: "B2B Listings registry audit kro. Fibre2Fashion ko first priority do; Alibaba skip kro. Europages, Textilepages, Tradewheel, Global Sources, Made-in-China, Kompass aur relevant Trachten directories ke missing fields, account state, verification evidence, next action aur owner do. Unverified profile ko active ya verified mark mat kro.",
  },
  {
    title: "Multilingual SEO release plan",
    category: "SEO",
    purpose: "Plan high-quality localization instead of keyword stuffing.",
    command: "Multilingual SEO ka controlled release plan banao. Buyer demand aur commercial relevance ke mutabiq languages prioritize kro. Har page ke liye base route, intent, native review, canonical, hreflang, schema, internal links, duplicate-content check aur publish gate do. Thin machine translation ko noindex rakho.",
  },
  {
    title: "Weekly owner report",
    category: "Management",
    purpose: "Summarize business movement and decisions for the owner.",
    command: "Pichlay 7 din ka Irha Apparels owner report banao: new buyers, qualified leads, replies, quotations, samples, won/lost movement, listing progress, social approvals, SEO visibility aur blockers. Data unavailable ho to clearly unavailable likho. Agly hafty ke top 5 business-impact actions do.",
  },
];

const DAILY_SEQUENCE = [
  "Review new and overdue Buyer CRM actions",
  "Qualify evidence-backed lead candidates",
  "Prepare buyer replies, quotation briefs and sample follow-ups",
  "Review listing and social drafts before any external write",
  "Check Search Console and multilingual page quality evidence",
  "End with an owner report and next-day priorities",
];

export default function AIOperationsPlaybook() {
  const [category, setCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(PLAYBOOKS.map((item) => item.category)))];
  const visible = category === "All" ? PLAYBOOKS : PLAYBOOKS.filter((item) => item.category === category);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-5 mb-6">
      <section className="border border-sky-500/35 bg-sky-500/[0.06] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Clock3 size={20} className="text-sky-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300">Backend activation deferred</p>
            <h2 className="font-display text-2xl mt-1">AI operating system is prepared; external execution stays gated.</h2>
            <p className="text-sm text-foreground/68 mt-3 leading-relaxed max-w-4xl">
              These playbooks are usable now as copy-ready commands. Lead discovery, Gmail delivery, platform publishing and multilingual generation remain pending until the final Lovable Cloud backend activation and owned-Supabase migration batch.
            </p>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)] gap-5">
        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold"><BrainCircuit size={14} /> AI Command Library</div>
              <h2 className="font-display text-3xl mt-2">Business-growth commands</h2>
            </div>
            <button type="button" onClick={() => void copy(PLAYBOOKS.map((item) => `${item.title}\n${item.command}`).join("\n\n"), "Command library")} className="min-h-11 inline-flex items-center gap-2 border border-gold/50 text-gold px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:bg-gold hover:text-background">
              <Clipboard size={12} /> Copy all
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto py-4">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-10 shrink-0 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${category === item ? "border-gold text-gold bg-gold/10" : "border-border/60 text-foreground/55"}`}>
                {item}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {visible.map((item) => (
              <article key={item.title} className="border border-border/60 bg-background/35 p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-gold">{item.category}</p>
                    <h3 className="font-display text-xl mt-1">{item.title}</h3>
                  </div>
                  <Sparkles size={16} className="text-gold/70 shrink-0" />
                </div>
                <p className="text-xs text-foreground/55 mt-2 leading-relaxed">{item.purpose}</p>
                <p className="text-xs text-foreground/72 mt-4 leading-relaxed flex-1">{item.command}</p>
                <button type="button" onClick={() => void copy(item.command, item.title)} className="mt-4 min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 hover:border-gold hover:text-gold px-3 py-2 text-[10px] uppercase tracking-[0.14em]">
                  <Copy size={11} /> Copy command
                </button>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          <section className="border border-border/60 bg-card/25 p-5 md:p-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Target size={14} /> Daily operating sequence</div>
            <ol className="mt-5 space-y-4">
              {DAILY_SEQUENCE.map((item, index) => (
                <li key={item} className="flex gap-3 text-sm text-foreground/68 leading-relaxed">
                  <span className="font-mono text-gold shrink-0">{String(index + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="border border-border/60 bg-card/25 p-5 md:p-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><ShieldCheck size={14} /> Approval policy</div>
            <ul className="mt-5 space-y-3">
              {[
                "Research and drafts may be created without external writes",
                "CRM imports require evidence and duplicate review",
                "Emails require recipient and body approval",
                "Social posts require platform-specific preview and approval",
                "Localized SEO pages require quality review before indexability",
                "No action is marked complete without a verified API result",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-foreground/68"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
