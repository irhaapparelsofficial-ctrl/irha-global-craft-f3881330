import { useMemo } from "react";
import SEO from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { whatsappLink } from "@/lib/constants";
import { DEFAULT_FAQ_GROUP_ORDER } from "@/lib/defaultFaqs";
import { usePublicFaqs } from "@/hooks/usePublicContent";

function sectionId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function FAQ() {
  const { data: faqs = [] } = usePublicFaqs("en");
  const groups = useMemo(() => {
    const map = new Map<string, typeof faqs>();
    for (const item of [...faqs].sort((a, b) => a.sort_order - b.sort_order || a.question.localeCompare(b.question))) {
      const group = item.category || "General";
      map.set(group, [...(map.get(group) || []), item]);
    }
    return Array.from(map.entries())
      .map(([group, items]) => ({ group, items }))
      .sort((a, b) => {
        const ai = DEFAULT_FAQ_GROUP_ORDER.indexOf(a.group);
        const bi = DEFAULT_FAQ_GROUP_ORDER.indexOf(b.group);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        return a.group.localeCompare(b.group);
      });
  }, [faqs]);

  return (
    <>
      <SEO
        title="B2B Buyer FAQ — Quotes, Samples, MOQ & Verification"
        description="Buyer-safe answers about Irha Apparels verification, custom quotations, MOQ, samples, private label, quality documents, production, shipping and payment."
        path="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      <section className="pt-36 md:pt-44 pb-20 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-5">B2B Buyer FAQ</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.96] max-w-5xl">
            Clear answers before you <span className="text-gold italic">request a quote.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
            These answers explain the working approach. Exact MOQ, price, sample cost, production timing, documents and shipping are confirmed only after the specific program is reviewed.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid lg:grid-cols-12 gap-14">
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-32 space-y-3">
              <p className="eyebrow mb-4">Browse</p>
              {groups.map((group) => (
                <a key={group.group} href={`#${sectionId(group.group)}`} className="block text-sm text-foreground/68 hover:text-gold w-fit">
                  {group.group}
                </a>
              ))}
              <Link to="/buyer-trust" className="mt-7 inline-flex text-[10px] uppercase tracking-[0.2em] text-gold hover:underline">
                Open Buyer Trust Center
              </Link>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-14">
            {groups.length === 0 ? (
              <div className="border border-border/60 bg-card/30 p-8 text-center">
                <h2 className="font-display text-2xl">No FAQ is currently published.</h2>
                <p className="text-sm text-foreground/65 mt-3">Send your exact manufacturing question through the inquiry form.</p>
              </div>
            ) : groups.map((group) => (
              <div key={group.group} id={sectionId(group.group)} className="scroll-mt-32">
                <h2 className="eyebrow mb-5">{group.group}</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {group.items.map((item) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="border border-border/60 bg-card/35 px-6 data-[state=open]:border-gold/45 transition-colors"
                    >
                      <AccordionTrigger className="font-display text-lg md:text-xl text-left hover:no-underline py-6">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-foreground/70 leading-relaxed text-sm md:text-base pb-6">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/60 bg-secondary/35">
        <div className="container-luxe text-center max-w-4xl">
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            Need an answer for your <span className="text-gold italic">exact program?</span>
          </h2>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <Link to="/inquiry" className="bg-gradient-gold text-primary-foreground px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Send an inquiry
            </Link>
            <Link to="/factory-video-call" className="border border-foreground/25 hover:border-gold hover:text-gold px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Request factory call
            </Link>
            <a
              href={whatsappLink("Hi Irha Apparels, I have a question about a B2B manufacturing program.")}
              target="_blank"
              rel="noreferrer noopener"
              className="border border-foreground/25 hover:border-emerald-400 hover:text-emerald-300 px-8 py-4 text-[10px] uppercase tracking-[0.24em]"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
