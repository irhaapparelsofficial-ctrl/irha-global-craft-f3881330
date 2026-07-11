import { Copy, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Template = { title: string; channel: string; body: string };

const TEMPLATES: Template[] = [
  {
    title: "First B2B introduction — English",
    channel: "Email / LinkedIn",
    body: `Subject: Private-label apparel manufacturing from Sialkot

Hello {{First Name}},

Irha Apparels is an experienced B2B apparel manufacturer in Sialkot, Pakistan. We work with brands, wholesalers, importers and distributors on requirement-led OEM, ODM and private-label programs.

Our website is newly built, and we can arrange a scheduled live factory video call so your team can verify the working setup directly.

Based on {{Company}}'s focus on {{Buyer Category}}, I would be glad to review your current or upcoming product requirements. Please share the product type, estimated quantity, customization and destination so we can prepare the right next step.

Regards,
Irha Apparels
www.irhaapparels.com
WhatsApp: +92 320 4110066`,
  },
  {
    title: "Trachten introduction — German",
    channel: "Email / LinkedIn",
    body: `Betreff: B2B-Fertigung für Trachten- und Private-Label-Programme

Guten Tag {{Name}},

Irha Apparels ist ein erfahrener B2B-Bekleidungshersteller aus Sialkot, Pakistan. Wir entwickeln anforderungsbasierte Programme für Lederhosen, Dirndl, Trachtenbekleidung und Private Label.

Unsere Website wurde neu aufgebaut. Für eine direkte Verifizierung können wir auf Wunsch einen geplanten Live-Videoanruf aus dem Betrieb anbieten.

Falls {{Unternehmen}} aktuell neue Lieferanten, Produktentwicklungen oder zusätzliche Produktionskapazitäten prüft, senden Sie uns bitte Produktart, geplante Menge, Individualisierung und Zielland. Danach können wir den passenden Angebots- oder Musterprozess abstimmen.

Mit freundlichen Grüßen
Irha Apparels
www.irhaapparels.com
WhatsApp: +92 320 4110066`,
  },
  {
    title: "First follow-up",
    channel: "Email / LinkedIn",
    body: `Subject: Follow-up — {{Product / Category}}

Hello {{First Name}},

I am following up on my earlier message regarding {{Product / Category}} manufacturing.

Irha Apparels can review a tech pack, reference sample, sketch or clear product brief. MOQ, sample path, pricing, production timing and shipping scope are confirmed only after the exact requirement is reviewed.

A scheduled live factory video call is also available if your team would like to verify the setup before moving forward.

Would it be useful to review one current product or upcoming buying program?

Regards,
Irha Apparels`,
  },
  {
    title: "Catalogue request response",
    channel: "Email / WhatsApp",
    body: `Hello {{Name}},

Thank you for requesting the Irha Apparels catalogue.

Please confirm which categories are relevant to your business and whether you are sourcing for wholesale, retail, distribution, a club/team or a private-label brand. This helps us share the most useful catalogue and product information instead of sending unrelated material.

For pricing, please also share the product, estimated quantity, customization and destination. Commercial terms are prepared per requirement.

Irha Apparels is an experienced manufacturer, while the website is newly built. A scheduled live factory video call can be arranged for direct verification.

Regards,
Irha Apparels`,
  },
  {
    title: "Meeting / factory call invitation",
    channel: "Email / WhatsApp",
    body: `Hello {{Name}},

We can arrange a scheduled live factory video call to discuss {{Product / Program}} and show the relevant working areas.

Please send:
- Your preferred date and time window with time zone
- Product/category to review
- Estimated quantity
- Any tech pack, reference or questions

The team will confirm a suitable slot after reviewing the request. The call is for direct discussion and verification; final commercial details are confirmed separately in writing.

Regards,
Irha Apparels`,
  },
  {
    title: "Missing quotation information",
    channel: "Email / WhatsApp",
    body: `Hello {{Name}},

Thank you for sharing your requirement. Before preparing an accurate quotation, please confirm the remaining details below:

- Product/style reference
- Fabric or leather specification
- Estimated quantity per style/color
- Size range and split
- Printing, embroidery or patches
- Labels, tags and packaging
- Destination country and preferred shipping scope
- Target delivery window

Once these points are reviewed, we can confirm the quotation scope, MOQ, sample path and timing for the exact program.

Regards,
Irha Apparels`,
  },
];

export default function OutreachTemplateLibrary() {
  const copy = async (body: string, title: string) => {
    await navigator.clipboard.writeText(body);
    toast({ title: `${title} copied` });
  };

  return (
    <div className="space-y-5 mb-6">
      <section className="border border-gold/40 bg-card/25 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Mail size={20} className="text-gold shrink-0 mt-0.5" />
          <div>
            <p className="eyebrow mb-2">Buyer Outreach Library</p>
            <h2 className="font-display text-3xl">Truthful, personalized B2B messages</h2>
            <p className="text-sm text-foreground/68 mt-3 max-w-4xl leading-relaxed">Use these drafts now. Replace every placeholder and verify the recipient before sending. Automated Gmail delivery and reply sync remain pending until the final backend activation.</p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        {TEMPLATES.map((item) => (
          <article key={item.title} className="border border-border/60 bg-card/25 p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-gold">{item.channel}</p>
                <h3 className="font-display text-xl mt-1">{item.title}</h3>
              </div>
              {item.channel.includes("WhatsApp") ? <MessageCircle size={17} className="text-gold/70" /> : <Mail size={17} className="text-gold/70" />}
            </div>
            <pre className="mt-4 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/70 font-sans flex-1 border border-border/50 bg-background/35 p-4 max-h-80 overflow-y-auto">{item.body}</pre>
            <button type="button" onClick={() => void copy(item.body, item.title)} className="mt-4 min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 text-gold px-4 py-2 text-[10px] uppercase tracking-[0.14em] hover:bg-gold hover:text-background"><Copy size={11} /> Copy template</button>
          </article>
        ))}
      </div>

      <section className="border border-border/60 bg-card/25 p-5">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><ShieldCheck size={14} /> Outreach rules</div>
        <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm text-foreground/65">
          {[
            "Use a real company-fit reason instead of generic mass outreach",
            "Verify the recipient and avoid duplicate sends",
            "Do not invent buyer names, roles, demand or previous contact",
            "Do not promise universal MOQ, price, certification or delivery",
            "Keep replies in the Buyer CRM with a clear next follow-up",
            "Stop or suppress contact when the recipient declines further outreach",
          ].map((item) => <p key={item} className="flex gap-2"><ShieldCheck size={14} className="text-gold shrink-0 mt-0.5" />{item}</p>)}
        </div>
      </section>
    </div>
  );
}
