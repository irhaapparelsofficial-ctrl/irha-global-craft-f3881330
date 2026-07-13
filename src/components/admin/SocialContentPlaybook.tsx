import { CalendarDays, CheckCircle2, Copy, Film, Linkedin, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SocialRenderPipelinePanel from "@/components/admin/SocialRenderPipelinePanel";

const WEEK = [
  { day: "Monday", platform: "LinkedIn", pillar: "Manufacturing capability", brief: "Show one requirement-led production capability and explain which buyer inputs are needed before quotation." },
  { day: "Tuesday", platform: "Instagram / Facebook", pillar: "Product category", brief: "Feature one approved product or category with OEM/private-label options and Request a Quote CTA." },
  { day: "Wednesday", platform: "TikTok / Reels", pillar: "10-second process", brief: "Short B2B reel: product reveal, construction detail, branding option, final Irha Apparels frame." },
  { day: "Thursday", platform: "LinkedIn", pillar: "Buyer education", brief: "Share one sourcing checklist: tech pack, quantity, destination, labels, packaging or shipping scope." },
  { day: "Friday", platform: "Instagram / Facebook", pillar: "Trust and verification", brief: "Experienced manufacturer, newly built website, scheduled live factory video call available." },
  { day: "Saturday", platform: "All relevant channels", pillar: "Buyer inquiry", brief: "Direct CTA for RFQ, sample, catalogue, reference upload or repeat order." },
  { day: "Sunday", platform: "Internal review", pillar: "Analytics", brief: "Do not publish by default. Review verified results and prepare next week's content decisions." },
];

const CAPTIONS = [
  {
    title: "LinkedIn manufacturing post",
    text: `Custom manufacturing starts with a clear requirement — not a generic price list.

Irha Apparels works with B2B buyers on OEM, ODM and private-label apparel programs from Sialkot, Pakistan. Product, material, quantity, branding, packaging and destination are reviewed before commercial commitments.

Our website is newly built. Buyers can also request a scheduled live factory video call for direct verification.

Share your product brief, tech pack or reference to begin a requirement-led review.

#ApparelManufacturing #PrivateLabel #OEM #ODM #Sialkot #B2B`,
  },
  {
    title: "Product-category caption",
    text: `Built for wholesale and private-label programs.

{{Product / Category}} can be reviewed around your material, construction, embroidery/printing, labels, tags, packaging, quantity and destination requirements.

MOQ, pricing, sampling and timing are confirmed for the exact program — not claimed universally.

Request a quote: www.irhaapparels.com/inquiry
WhatsApp: +92 320 4110066

#CustomApparel #PrivateLabelClothing #B2BManufacturing #IrhaApparels`,
  },
  {
    title: "Factory verification caption",
    text: `A website should not be the only basis for supplier trust.

Irha Apparels is an experienced manufacturer and our website is newly built. B2B buyers can request a scheduled live factory video call to discuss the product program and view relevant working areas.

Before ordering, confirm the specification, sample path, quality checkpoints, documentation and commercial scope in writing.

Request a factory call: www.irhaapparels.com/factory-video-call

#SupplierVerification #ApparelSourcing #B2B #Sialkot`,
  },
  {
    title: "Buyer-education caption",
    text: `A useful apparel RFQ should include:

• Product or reference
• Fabric/leather specification
• Estimated quantity
• Size and color range
• Printing, embroidery and trims
• Labels, tags and packaging
• Destination and preferred shipping scope
• Target delivery window

Better inputs create a more accurate quotation and development plan.

Buyer resources: www.irhaapparels.com/resources

#RFQ #Sourcing #ApparelDevelopment #PrivateLabel`,
  },
];

const REEL_BRIEF = `IRHA APPARELS — 10-SECOND B2B REEL

Format: vertical 9:16
Audio: optional; visual must work without sound

0.0–2.0 sec — clean front product reveal
2.0–4.0 sec — macro material/stitching/embroidery detail
4.0–6.0 sec — construction, branding, label or trim detail
6.0–8.0 sec — side/back/rotation view
8.0–10.0 sec — final branded frame

On-screen text:
Custom B2B Manufacturing
OEM · ODM · Private Label
Request a Quote
www.irhaapparels.com

Rules:
Use only approved product media. No invented certification, capacity, price, MOQ, buyer count or delivery promise. Platform post remains draft until verified publishing succeeds.`;

export default function SocialContentPlaybook() {
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-5 mb-6">
      <section className="border border-gold/40 bg-card/25 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <CalendarDays size={21} className="text-gold shrink-0 mt-0.5" />
          <div>
            <p className="eyebrow mb-2">Social Content Operating System</p>
            <h2 className="font-display text-3xl">B2B content prepared for approval</h2>
            <p className="text-sm text-foreground/68 mt-3 max-w-4xl leading-relaxed">The content plan and copy library work now. Reel and carousel render jobs use Media Library assets, owner approval and verified output evidence. No draft or renderer queue item is treated as a published post.</p>
          </div>
        </div>
      </section>

      <SocialRenderPipelinePanel />

      <section className="border border-border/60 bg-card/25 p-5 md:p-6">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><CalendarDays size={14} /> Weekly framework</div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
          {WEEK.map((item) => (
            <article key={item.day} className="border border-border/60 bg-background/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[9px] uppercase tracking-[0.16em] text-gold">{item.platform}</p><h3 className="font-display text-xl mt-1">{item.day}</h3></div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-foreground/45">{item.pillar}</span>
              </div>
              <p className="text-xs text-foreground/65 mt-3 leading-relaxed">{item.brief}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-5">
        <section className="border border-border/60 bg-card/25 p-5 md:p-6">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Linkedin size={14} /> Caption library</div>
          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {CAPTIONS.map((item) => (
              <article key={item.title} className="border border-border/60 bg-background/35 p-4 flex flex-col">
                <h3 className="font-display text-xl">{item.title}</h3>
                <pre className="font-sans whitespace-pre-wrap break-words text-xs text-foreground/68 leading-relaxed mt-3 flex-1 max-h-72 overflow-y-auto">{item.text}</pre>
                <button type="button" onClick={() => void copy(item.text, item.title)} className="mt-4 min-h-10 inline-flex items-center justify-center gap-2 border border-gold/50 text-gold px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:bg-gold hover:text-background"><Copy size={11} /> Copy caption</button>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          <section className="border border-border/60 bg-card/25 p-5 md:p-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Film size={14} /> Reel brief</div>
            <pre className="font-sans whitespace-pre-wrap break-words text-xs text-foreground/68 leading-relaxed mt-4 border border-border/50 bg-background/35 p-4 max-h-96 overflow-y-auto">{REEL_BRIEF}</pre>
            <button type="button" onClick={() => void copy(REEL_BRIEF, "Reel brief")} className="mt-4 w-full min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 text-gold px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:bg-gold hover:text-background"><Copy size={11} /> Copy reel brief</button>
          </section>

          <section className="border border-border/60 bg-card/25 p-5 md:p-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><ShieldCheck size={14} /> Publish gate</div>
            <ul className="mt-4 space-y-3">
              {[
                "Approved product media and product facts only",
                "Platform-specific preview reviewed",
                "Links, phone and CTA checked",
                "No unsupported commercial or certification claims",
                "Render output must pass checksum, dimensions, type and duration verification",
                "Publish result must return a real platform ID or URL",
                "Failure remains failed; it is never shown as published",
              ].map((item) => <li key={item} className="flex gap-3 text-sm text-foreground/65"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{item}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
