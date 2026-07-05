import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(80),
  company: z.string().trim().min(2, "Company required").max(120),
  country: z.string().trim().min(2, "Country required").max(60),
  category: z.string().min(1, "Select a category"),
  quantity: z.string().trim().min(1, "Quantity required").max(40),
  email: z.string().trim().email("Invalid email").max(120),
  whatsapp: z.string().trim().min(6, "WhatsApp required").max(30),
  notes: z.string().max(800).optional(),
});

type FormData = z.infer<typeof schema>;

const steps = [
  { id: 1, label: "About You", fields: ["name", "company", "country"] as const },
  { id: 2, label: "Product", fields: ["category", "quantity"] as const },
  { id: 3, label: "Contact", fields: ["email", "whatsapp", "notes"] as const },
];

export default function Inquiry() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<FormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // Preserve product context (§20). Prefill notes + category when arriving from
  // a product page, shortlist, or compare view.
  useEffect(() => {
    const productName = params.get("name");
    const productSlug = params.get("product");
    const categorySlug = params.get("category");
    const intent = params.get("intent");
    const shortlistSlugs = params.get("shortlist");
    const shortlistNames = params.get("names");
    if (!productName && !productSlug && !categorySlug && !intent && !shortlistSlugs) return;
    setData((d) => {
      const next = { ...d };
      if (categorySlug && CATEGORIES.some((c) => c.slug === categorySlug)) {
        next.category = categorySlug;
      }
      const parts: string[] = [];
      if (productName) parts.push(`Product of interest: ${productName}`);
      if (productSlug && !productName) parts.push(`Product slug: ${productSlug}`);
      if (shortlistSlugs) {
        const names = (shortlistNames ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const slugs = shortlistSlugs.split(",").map((s) => s.trim()).filter(Boolean);
        const list = (names.length ? names : slugs).map((n, i) => `${i + 1}. ${n}`).join("\n");
        if (list) parts.push(`Shortlisted products:\n${list}`);
      }
      if (intent === "reference") parts.push("I'd like to share a reference design (please provide upload details).");
      if (intent === "sample") parts.push("Sample request — please advise on sample availability, timeline and shipping.");
      if (intent === "meeting") parts.push("Meeting request — please share available time slots.");
      if (parts.length > 0) {
        const existing = d.notes ?? "";
        next.notes = existing.includes(parts[0]) ? existing : [parts.join("\n\n"), existing].filter(Boolean).join("\n\n");
      }
      return next;
    });
    if (productName || productSlug || shortlistSlugs) setStep(2);
  }, [params]);


  const update = (k: keyof FormData, v: string) => setData((d) => ({ ...d, [k]: v }));

  const validateStep = () => {
    const fields = steps[step - 1].fields;
    const partial = Object.fromEntries(fields.map((f) => [f, data[f] ?? ""]));
    const result = schema.pick(Object.fromEntries(fields.map((f) => [f, true])) as any).safeParse(partial);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const next = () => validateStep() && setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = () => {
    if (!validateStep()) return;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast({ title: "Please complete all fields", variant: "destructive" });
      return;
    }

    // Save to dashboard DB
    void supabase.from("inquiries").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      country: parsed.data.country,
      phone: parsed.data.whatsapp,
      category: parsed.data.category,
      quantity: parsed.data.quantity,
      message: parsed.data.notes || null,
      source: "inquiry-page",
    });

    const msg = `New B2B Inquiry — Irha Apparels
━━━━━━━━━━━━━━━━━━
Name: ${parsed.data.name}
Company: ${parsed.data.company}
Country: ${parsed.data.country}
Category: ${parsed.data.category}
Quantity: ${parsed.data.quantity}
Email: ${parsed.data.email}
WhatsApp: ${parsed.data.whatsapp}
Notes: ${parsed.data.notes || "—"}`;
    setDone(true);
    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    }, 600);
  };


  const inputCls = "w-full bg-input border border-border focus:border-primary outline-none px-5 py-4 text-foreground placeholder:text-muted-foreground/60 transition-colors";
  const labelCls = "block text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3";

  return (
    <>
      <SEO
        title="Get a Quote — B2B Apparel Inquiry | Irha Apparels"
        description="Request a B2B quote from Irha Apparels. OEM, ODM and private label apparel manufacturing. Quick WhatsApp response from Sialkot, Pakistan."
        path="/inquiry"
      />

      <section className="pt-40 pb-16 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-6">B2B Inquiry</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] max-w-4xl">
            Tell us about your <span className="text-gold italic">order</span>.
          </h1>
          <p className="mt-8 text-foreground/70 max-w-xl">
            Three quick steps. We'll reply on WhatsApp within hours with pricing, lead time and sample options.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe max-w-3xl">
          {done ? (
            <div className="border border-primary/40 bg-card/60 p-12 text-center animate-scale-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mb-6">
                <Check className="text-primary-foreground" size={28} />
              </div>
              <h2 className="font-display text-3xl md:text-4xl">Inquiry Received</h2>
              <p className="text-foreground/70 mt-4">
                Redirecting you to WhatsApp to finalize your inquiry with our team.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em]"
              >
                <MessageCircle size={16}/> Open WhatsApp
              </a>
            </div>
          ) : (
            <>
              {/* Stepper */}
              <div className="flex items-center gap-4 mb-12">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex-1 flex items-center gap-4">
                    <div className={`flex items-center gap-3 ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
                      <span className={`w-8 h-8 flex items-center justify-center border ${step >= s.id ? "border-primary bg-primary/10" : "border-border"} text-xs`}>
                        {s.id}
                      </span>
                      <span className="text-xs uppercase tracking-[0.25em] hidden sm:inline">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <div className={`flex-1 h-px ${step > s.id ? "bg-primary" : "bg-border"}`} />}
                  </div>
                ))}
              </div>

              <div className="border border-border bg-card/40 p-8 md:p-12 animate-fade-in" key={step}>
                {step === 1 && (
                  <div className="space-y-6">
                    <Field label="Your Name" error={errors.name}>
                      <input className={inputCls} placeholder="Full name" value={data.name || ""} onChange={(e)=>update("name",e.target.value)} />
                    </Field>
                    <Field label="Company / Brand" error={errors.company}>
                      <input className={inputCls} placeholder="Brand or company" value={data.company || ""} onChange={(e)=>update("company",e.target.value)} />
                    </Field>
                    <Field label="Country" error={errors.country}>
                      <input className={inputCls} placeholder="e.g. United States" value={data.country || ""} onChange={(e)=>update("country",e.target.value)} />
                    </Field>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <Field label="Product Category" error={errors.category}>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {CATEGORIES.map((c)=>(
                          <button
                            type="button"
                            key={c.slug}
                            onClick={()=>update("category", c.name)}
                            className={`text-left p-4 border transition-all ${data.category === c.name ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-foreground/40"}`}
                          >
                            <p className="font-display text-lg">{c.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{c.short}</p>
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Estimated Quantity" error={errors.quantity}>
                      <input className={inputCls} placeholder="e.g. 500 pieces" value={data.quantity || ""} onChange={(e)=>update("quantity",e.target.value)} />
                    </Field>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <Field label="Email" error={errors.email}>
                      <input type="email" className={inputCls} placeholder="you@brand.com" value={data.email || ""} onChange={(e)=>update("email",e.target.value)} />
                    </Field>
                    <Field label="WhatsApp Number" error={errors.whatsapp}>
                      <input className={inputCls} placeholder="+1 555 000 0000" value={data.whatsapp || ""} onChange={(e)=>update("whatsapp",e.target.value)} />
                    </Field>
                    <Field label="Notes (optional)">
                      <textarea rows={4} className={inputCls} placeholder="Tell us more about your project, fabric preferences, deadlines…" value={data.notes || ""} onChange={(e)=>update("notes",e.target.value)} />
                    </Field>
                  </div>
                )}

                <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
                  <button
                    onClick={back}
                    disabled={step===1}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ArrowLeft size={14}/> Back
                  </button>
                  {step < 3 ? (
                    <button
                      onClick={next}
                      className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
                    >
                      Continue <ArrowRight size={14}/>
                    </button>
                  ) : (
                    <button
                      onClick={submit}
                      className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
                    >
                      Send to WhatsApp <MessageCircle size={14}/>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">{label}</label>
      {children}
      {error && <p className="text-destructive text-xs mt-2">{error}</p>}
    </div>
  );
}
