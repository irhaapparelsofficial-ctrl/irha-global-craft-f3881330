import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  ListPlus,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PRIORITY_PLATFORMS = [
  {
    platform: "Fibre2Fashion",
    priority: "P0",
    nextAction: "Complete the company profile, verify contact details and publish the first truthful category listings.",
    note: "Account work already started; finish and verify before expanding to lower-priority channels.",
  },
  {
    platform: "Europages",
    priority: "P0",
    nextAction: "Create or claim the manufacturer profile and align company name, website, categories and contact details.",
    note: "Use a Europe-facing manufacturer profile; do not claim certifications or capacity without program evidence.",
  },
  {
    platform: "Textilepages",
    priority: "P1",
    nextAction: "Review account availability, create the company profile and add relevant apparel manufacturing categories.",
    note: "Track the real profile URL and verification state after registration.",
  },
  {
    platform: "Tradewheel",
    priority: "P1",
    nextAction: "Create a supplier profile, verify contact details and add selected B2B products with RFQ-only positioning.",
    note: "No public fixed prices; route buyers to requirements and custom quotation.",
  },
  {
    platform: "Global Sources",
    priority: "P1",
    nextAction: "Check supplier eligibility and document the exact onboarding or verification requirement before submission.",
    note: "Mark active only after a real public profile or verified supplier account exists.",
  },
  {
    platform: "Made-in-China",
    priority: "P2",
    nextAction: "Check supplier onboarding requirements and decide whether the apparel program fits the platform before paying or publishing.",
    note: "Keep the registry truthful if onboarding, payment or verification is pending.",
  },
  {
    platform: "Kompass",
    priority: "P2",
    nextAction: "Claim or create the company listing and standardize manufacturer categories, website and contact details.",
    note: "Use the company profile as a trust and discoverability listing, not as proof of buyer demand.",
  },
  {
    platform: "Relevant Trachten Directories",
    priority: "P2",
    nextAction: "Research Germany, Austria and Switzerland directories that accept manufacturers or suppliers and record each real opportunity separately.",
    note: "Do not combine multiple unverified directories into one active listing claim.",
  },
] as const;

const PROFILE_COPY = {
  short: "Irha Apparels is an experienced B2B apparel manufacturer in Sialkot, Pakistan, offering OEM, ODM and private-label development for brands, wholesalers and importers. Buyers can request an appointment-based live factory video call for direct verification.",
  standard: "Irha Apparels is an experienced B2B apparel manufacturer based in Sialkot, Pakistan. We work with brands, wholesalers, importers, distributors, clubs and sourcing teams on requirement-led OEM, ODM and private-label programs. Product areas include Bavarian and Trachten wear, premium leather apparel, sportswear, streetwear, activewear, leisurewear and nightwear. Customization may include cut-and-sew development, embroidery, printing, labels, tags, trims and packaging, depending on the exact program. Buyers can request an appointment-based live factory video call to discuss the requirement and relevant viewing scope. MOQ, pricing, sample cost, production timing, materials, documentation and shipping scope are confirmed only after the product, quantity, destination and customization are reviewed.",
  trust: "Requirement-led manufacturing in Sialkot · Live factory video call available by request · Written-scope buyer verification · Requirement-led quotation · OEM, ODM and private label · No unsupported universal MOQ, certification or delivery claims.",
};

const PROFILE_CHECKLIST = [
  "Company name matches Irha Apparels everywhere",
  "Website uses https://irhaapparels.com",
  "Email and WhatsApp are current and monitored",
  "Manufacturer location is Sialkot, Pakistan",
  "Profile explains requirement-led manufacturing and buyer verification",
  "Live factory video-call verification is offered",
  "Product categories match current website categories",
  "No public fixed price or universal MOQ is claimed",
  "No certification, production capacity or buyer count is invented",
  "Profile URL and verification evidence are saved in the registry",
] as const;

type ListingRow = { id: string; platform: string; status: string; verification_level: string };

const db = supabase as any;

export default function ListingLaunchKit() {
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [migrationReady, setMigrationReady] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("business_listings").select("id,platform,status,verification_level").limit(500);
    if (error) {
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
      if (message.includes("42p01") || message.includes("business_listings")) setMigrationReady(false);
      else toast({ title: "Listing launch kit could not load", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setMigrationReady(true);
      setRows((data ?? []) as ListingRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const tracked = useMemo(() => new Map(rows.map((row) => [row.platform.trim().toLowerCase(), row])), [rows]);
  const missing = PRIORITY_PLATFORMS.filter((item) => !tracked.has(item.platform.toLowerCase()));

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  const addMissing = async () => {
    if (!migrationReady || missing.length === 0 || creating) return;
    const confirmed = window.confirm(
      `Add ${missing.length} missing platform record${missing.length === 1 ? "" : "s"} as NOT STARTED and UNVERIFIED? This will not create external accounts or claim that any listing is active.`,
    );
    if (!confirmed) return;

    setCreating(true);
    const { error } = await db.from("business_listings").insert(missing.map((item) => ({
      platform: item.platform,
      account_name: "Irha Apparels",
      profile_url: null,
      status: "not_started",
      verification_level: "unverified",
      owner: null,
      next_action: item.nextAction,
      notes: `${item.priority} launch priority. ${item.note}`,
      source: "listing-launch-kit",
      last_verified_at: null,
    })));
    setCreating(false);

    if (error) {
      toast({ title: "Missing listing records were not added", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Missing platform records added", description: "All new records are unverified and not started." });
    await load();
  };

  return (
    <div className="space-y-5 mb-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 md:p-7">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <p className="eyebrow mb-2">B2B Listing Launch Kit</p>
            <h2 className="font-display text-3xl md:text-4xl">Prepare truthful profiles before publishing.</h2>
            <p className="text-sm text-foreground/68 mt-3 leading-relaxed">
              This kit provides copy, priority channels and completion checks. It does not create external accounts, bypass verification or mark a listing active without evidence.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => void addMissing()} disabled={!migrationReady || missing.length === 0 || creating} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">
              {creating ? <Loader2 size={12} className="animate-spin" /> : <ListPlus size={12} />}
              Add {missing.length} missing records
            </button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <CopyCard title="Short company profile" value={PROFILE_COPY.short} onCopy={() => void copy(PROFILE_COPY.short, "Short profile")} />
        <CopyCard title="Standard company profile" value={PROFILE_COPY.standard} onCopy={() => void copy(PROFILE_COPY.standard, "Standard profile")} />
        <CopyCard title="Trust statement" value={PROFILE_COPY.trust} onCopy={() => void copy(PROFILE_COPY.trust, "Trust statement")} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-5">
        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5"><ExternalLink size={15} className="text-gold" /><h3 className="font-display text-2xl">Priority channel board</h3></div>
          <div className="grid md:grid-cols-2 gap-3">
            {PRIORITY_PLATFORMS.map((item) => {
              const record = tracked.get(item.platform.toLowerCase());
              return (
                <article key={item.platform} className="border border-border/60 bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-gold">{item.priority}</p>
                      <h4 className="font-display text-xl mt-1">{item.platform}</h4>
                    </div>
                    {record ? (
                      <span className={`inline-flex items-center gap-1 border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${record.verification_level === "verified" ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>
                        <CheckCircle2 size={10} /> {record.status.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-foreground/45">Not tracked</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/68 leading-relaxed mt-3">{item.nextAction}</p>
                  <p className="text-[11px] text-foreground/45 leading-relaxed mt-2">{item.note}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5"><ClipboardCheck size={15} className="text-gold" /><h3 className="font-display text-2xl">Profile verification checklist</h3></div>
          <ul className="space-y-3">
            {PROFILE_CHECKLIST.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-foreground/68 leading-relaxed">
                <ShieldCheck size={15} className="text-gold shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-foreground/45 mt-5 leading-relaxed">
            A listing becomes “verified” only after the real public profile or authenticated account is checked. Platform approval, traffic and buyer enquiries must not be assumed.
          </p>
        </section>
      </div>
    </div>
  );
}

function CopyCard({ title, value, onCopy }: { title: string; value: string; onCopy: () => void }) {
  return (
    <article className="border border-border/60 bg-card/25 p-5 flex flex-col">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-xs text-foreground/62 leading-relaxed mt-3 flex-1 max-h-44 overflow-y-auto pr-1">{value}</p>
      <button type="button" onClick={onCopy} className="mt-4 inline-flex items-center justify-center gap-2 border border-gold/50 text-gold px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:bg-gold hover:text-background">
        <Copy size={11} /> Copy
      </button>
    </article>
  );
}
