import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  DatabaseZap,
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
  route: string;
};

const PLAYBOOKS: Playbook[] = [
  {
    title: "Real current situation",
    category: "Management",
    purpose: "Read the live database snapshot, recorded operations and current blockers.",
    command: "Hamari real current situation batao. Operational, Needs Owner Approval, Blocked aur Unknown ko alag rakho. Live counts, latest heartbeat, leads, CRM, outreach, social, SEO, website aur production include kro. Evidence timestamp zaroor do.",
    route: "/admin/ai-assistant",
  },
  {
    title: "Daily owner brief",
    category: "Management",
    purpose: "Prioritize work from Buyer Inbox through production and growth.",
    command: "Aaj ka Irha Apparels owner brief banao. Buyer Inbox, overdue tasks/follow-ups, lead review queue, quotations, samples, outreach drafts, social approvals, SEO drafts, production exceptions aur system blockers ko live data se summarize kro. Top 5 next actions do.",
    route: "/admin/ai-assistant",
  },
  {
    title: "CRM tutorial",
    category: "Sales",
    purpose: "Learn the exact buyer qualification, follow-up and Buyer 360 workflow.",
    command: "Buyer CRM ka complete step-by-step tutorial do. Buyer Inbox, Pipeline, Buyer 360, notes, files, tasks, follow-up dates, quotation handoff aur duplicate review ke exact admin routes include kro.",
    route: "/admin/leads",
  },
  {
    title: "Buyer qualification",
    category: "Sales",
    purpose: "Assess a buyer using evidence without inventing commercial facts.",
    command: "Selected buyer ko qualify kro. Company legitimacy, product fit, buyer role, quantity signal, destination, contact quality, urgency, duplicate risk aur missing information assess kro. Evidence-based score aur next action do; price, MOQ ya delivery invent mat kro.",
    route: "/admin/buyer360",
  },
  {
    title: "Quotation preparation",
    category: "Sales",
    purpose: "Turn requirements into an owner-reviewable quotation brief.",
    command: "Selected buyer ki quotation preparation brief banao. Product, material, GSM/weight, construction, artwork, labels, tags, packaging, sizes, colors, quantity, sample path, destination, Incoterm aur missing confirmations list kro. Final price, terms aur lead time owner ke liye leave kro.",
    route: "/admin/pi-generator",
  },
  {
    title: "Bavarian lead campaign",
    category: "Lead Growth",
    purpose: "Run a focused zero-credit Germany/Austria/Switzerland buyer search.",
    command: "Germany, Austria aur Switzerland se 50 Lederhosen, Dirndl aur Trachten wholesalers, importers, distributors aur specialist retailers find kro. Public-source evidence, duplicate checks aur review status save kro. Koi contact ya CRM import automatically mat kro.",
    route: "/admin/lead-acquisition",
  },
  {
    title: "Verify lead queue",
    category: "Lead Growth",
    purpose: "Enrich pending candidates and separate buyers from manufacturers.",
    command: "Pending leads verify kro. Public website evidence, buyer signal, product fit, public email/phone, duplicate domain aur manufacturer risk check kro. Verified, Needs Review, Rejected aur Duplicate counts batao.",
    route: "/admin/lead-acquisition",
  },
  {
    title: "Buyer follow-up draft",
    category: "Outreach",
    purpose: "Prepare a grounded B2B message with Irha trust positioning.",
    command: "Selected buyer ke liye concise professional follow-up draft banao. Mention kro ke Irha Apparels experienced manufacturer hai aur website newly built hai. Scheduled live factory video call offer kro. Exact requirement use kro; fake capacity, certification, MOQ, delivery ya price claim mat kro.",
    route: "/admin/mailing",
  },
  {
    title: "Outreach instructions",
    category: "Outreach",
    purpose: "Learn recipient validation, attachment review, approval and send evidence.",
    command: "Email aur WhatsApp outreach ka complete tutorial do. Verified buyer selection, recipient validation, draft review, attachments, opt-out, owner approval, provider result aur CRM logging ke exact routes aur safety checks do.",
    route: "/admin/mailing",
  },
  {
    title: "Weekly social drafts",
    category: "Content",
    purpose: "Create platform-specific B2B drafts from verified products and media.",
    command: "Agly 7 din ka LinkedIn, Instagram, Facebook aur TikTok B2B content plan banao. Current products aur approved media use kro. Caption, CTA, hashtags, visual/reel brief aur approval state do. Koi post publish hua claim mat kro.",
    route: "/admin/social",
  },
  {
    title: "Social status and blockers",
    category: "Content",
    purpose: "See real draft/published counts and account connection status.",
    command: "Social system ki real current situation batao. Drafts, approvals, published posts, verified accounts, renderer aur exact blockers live data se batao. Setup routes bhi do.",
    route: "/admin/social",
  },
  {
    title: "Website publishing tutorial",
    category: "Website",
    purpose: "Operate products, media, catalogue and CMS safely.",
    command: "Website aur catalogue ka complete tutorial do. Products, Categories, Media Library, Catalogue, Website Editor, drafts, publish, rollback aur Production Health ke exact steps aur routes do.",
    route: "/admin/website",
  },
  {
    title: "Multilingual SEO release",
    category: "SEO",
    purpose: "Release useful localized pages through quality gates.",
    command: "Multilingual SEO ka controlled tutorial do. Base route, keyword intent, localized draft, AI quality review, native review, canonical, hreflang, noindex, approval, publish, sitemap aur Search Console evidence ke exact steps do.",
    route: "/admin/multilingual-seo",
  },
  {
    title: "Production workflow",
    category: "Operations",
    purpose: "Track samples, production, QC, shipping and closeout using evidence.",
    command: "Production workflow ka complete tutorial do. Job creation, specification, materials, operations, sample decision, QC evidence, defects/rework, shipping readiness, dispatch approval, delivery evidence aur commercial closeout ke exact steps do.",
    route: "/admin/production-workflow",
  },
  {
    title: "System blockers",
    category: "Operations",
    purpose: "Get the truthful list of missing providers or setup requirements.",
    command: "System mein kya blocked ya missing hai? Email, WhatsApp, social accounts, Search Console, renderer, AI, cron, database aur public website ko live evidence se check kro. Har blocker ka exact setup route do.",
    route: "/admin/production-health",
  },
];

const DAILY_SEQUENCE = [
  "Open Production Health and confirm the latest heartbeat and public-site checks",
  "Review Buyer Inbox, overdue tasks and follow-up dates",
  "Verify Lead Acquisition candidates; reject manufacturers and duplicates",
  "Prepare buyer replies, quotation briefs and sample follow-ups",
  "Review exact recipients, attachments and outreach approvals",
  "Review social drafts and media before any public posting",
  "Review SEO/CMS drafts and indexing evidence",
  "Review production exceptions, QC evidence and shipping readiness",
  "Ask Admin AI for the final owner brief and next priorities",
];

const TRUTH_RULES = [
  "Operational means a real backend record, completed run or verified provider result exists",
  "Needs Owner Approval means work is prepared but no external commitment has been made",
  "Blocked means a provider credential, account authorization, evidence or configuration is missing",
  "Unknown means the system has no reliable evidence yet",
  "A draft is never called sent; a queued post is never called published",
  "Final price, discount, terms and production or delivery commitments stay owner-controlled",
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
      <section className="border border-emerald-500/35 bg-emerald-500/[0.06] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <DatabaseZap size={20} className="text-emerald-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Live Business Brain operational</p>
            <h2 className="font-display text-2xl mt-1">Admin AI reads live business aggregates and versioned operating knowledge.</h2>
            <p className="text-sm text-foreground/68 mt-3 leading-relaxed max-w-4xl">
              Use Roman Urdu or English. Current-situation answers include a checked timestamp. Tutorials include exact admin routes. Lead research and drafts can run safely; buyer contact, social publishing and commercial commitments remain approval-gated.
            </p>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)] gap-5">
        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold"><BrainCircuit size={14} /> AI Command Library</div>
              <h2 className="font-display text-3xl mt-2">Real operating commands</h2>
            </div>
            <button type="button" onClick={() => void copy(PLAYBOOKS.map((item) => `${item.title}\n${item.command}\nRoute: ${item.route}`).join("\n\n"), "Command library")} className="min-h-11 inline-flex items-center gap-2 border border-gold/50 text-gold px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:bg-gold hover:text-background">
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
                <p className="text-[10px] text-gold/80 mt-3">Route: {item.route}</p>
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
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><ShieldCheck size={14} /> Truth and approval policy</div>
            <ul className="mt-5 space-y-3">
              {TRUTH_RULES.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-foreground/68"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </section>

          <section className="border border-border/60 bg-card/25 p-5 md:p-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Clock3 size={14} /> Best first command</div>
            <p className="text-sm text-foreground/68 mt-4 leading-relaxed">Hamari real current situation batao.</p>
            <button type="button" onClick={() => void copy("Hamari real current situation batao.", "Situation command")} className="mt-4 min-h-10 w-full inline-flex items-center justify-center gap-2 border border-border/60 hover:border-gold hover:text-gold px-3 py-2 text-[10px] uppercase tracking-[0.14em]"><Copy size={11} /> Copy</button>
          </section>
        </div>
      </div>
    </div>
  );
}
