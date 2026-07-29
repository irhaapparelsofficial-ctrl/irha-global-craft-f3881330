import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

function replaceOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Expected source fragment not found in ${path}: ${before.slice(0, 90)}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Source fragment is not unique in ${path}: ${before.slice(0, 90)}`);
  writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length));
}

const inquiry = "src/pages/InquiryBase.tsx";
replaceOnce(inquiry,
`const STEP_LABELS = ["Intent", "Requirements", "Files", "Contact", "Review"] as const;
`,
`const STEP_LABELS = ["Intent", "Requirements", "Files", "Contact", "Review"] as const;
const SAFE_SUBMISSION_ERROR =
  "We could not send your inquiry. Your draft is still saved on this device. Please try again or continue on WhatsApp.";

function fieldId(name: string): string {
  return \`inquiry-\${name}\`;
}

function fieldA11y(name: string, errors: Record<string, string>) {
  const invalid = Boolean(errors[name]);
  return {
    id: fieldId(name),
    "data-inquiry-field": name,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? \`\${fieldId(name)}-error\` : undefined,
  };
}

function FieldError({ name, errors }: { name: string; errors: Record<string, string> }) {
  return errors[name] ? <p id={\`\${fieldId(name)}-error\`} className="mt-1 text-xs text-destructive" role="alert">{errors[name]}</p> : null;
}
`);

replaceOnce(inquiry,
`  const setField = useCallback(<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, []);`,
`  const setField = useCallback(<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((current) => {
      const key = String(k);
      if (!(key in current)) return current;
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  }, []);`);

replaceOnce(inquiry,
`    setErrors(errs);
    return Object.keys(errs).length === 0;`,
`    setErrors(errs);
    const firstInvalidField = Object.keys(errs)[0];
    if (!firstInvalidField) return true;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(\`[data-inquiry-field="\${firstInvalidField}"]\`)?.focus();
    });
    return false;`);

replaceOnce(inquiry,
`    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });`,
`    } catch {
      toast({
        title: "Inquiry not sent",
        description: SAFE_SUBMISSION_ERROR,
        variant: "destructive",
      });`);

replaceOnce(inquiry,
`                    <span
                      className={\`w-7 h-7 md:w-8 md:h-8 inline-flex items-center justify-center border text-[11px] \${`,
`                    <span
                      aria-current={active ? "step" : undefined}
                      className={\`w-7 h-7 md:w-8 md:h-8 inline-flex items-center justify-center border text-[11px] \${`);

for (const [before, after] of [
  ["inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground/70", "inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground/70"],
  ["inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:opacity-90", "inline-flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:opacity-90"],
  ["inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:opacity-90 disabled:opacity-60", "inline-flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:opacity-90 disabled:opacity-60"],
]) replaceOnce(inquiry, before, after);

replaceOnce(inquiry,
`              type="button"
              onClick={() => setField("intent", id)}`,
`              type="button"
              aria-pressed={active}
              onClick={() => setField("intent", id)}`);

const fieldReplacements = [
  [
`          <label className={label}>Company / Brand *</label>
          <input required autoComplete="organization" className={input} value={draft.company ?? ""} onChange={(e) => setField("company", e.target.value)} />
          {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}`,
`          <label htmlFor={fieldId("company")} className={label}>Company / Brand *</label>
          <input {...fieldA11y("company", errors)} required autoComplete="organization" className={input} value={draft.company ?? ""} onChange={(e) => setField("company", e.target.value)} />
          <FieldError name="company" errors={errors} />`],
  [
`          <label className={label}>Destination country *</label>
          <input className={input} placeholder="e.g. Germany" value={draft.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}`,
`          <label htmlFor={fieldId("country")} className={label}>Destination country *</label>
          <input {...fieldA11y("country", errors)} required className={input} placeholder="e.g. Germany" value={draft.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          <FieldError name="country" errors={errors} />`],
  [
`            <label className={label}>Estimated quantity *</label>
            <input className={input} placeholder="e.g. 500 pcs / style" value={draft.quantity ?? ""} onChange={(e) => setField("quantity", e.target.value)} />
            {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity}</p>}`,
`            <label htmlFor={fieldId("quantity")} className={label}>Estimated quantity *</label>
            <input {...fieldA11y("quantity", errors)} required className={input} placeholder="e.g. 500 pcs / style" value={draft.quantity ?? ""} onChange={(e) => setField("quantity", e.target.value)} />
            <FieldError name="quantity" errors={errors} />`],
  [
`            <label className={label}>Sample quantity *</label>
            <input className={input} placeholder="e.g. 2 pcs / style" value={draft.sampleQty ?? ""} onChange={(e) => setField("sampleQty", e.target.value)} />
            {errors.sampleQty && <p className="text-xs text-destructive mt-1">{errors.sampleQty}</p>}`,
`            <label htmlFor={fieldId("sampleQty")} className={label}>Sample quantity *</label>
            <input {...fieldA11y("sampleQty", errors)} required className={input} placeholder="e.g. 2 pcs / style" value={draft.sampleQty ?? ""} onChange={(e) => setField("sampleQty", e.target.value)} />
            <FieldError name="sampleQty" errors={errors} />`],
  [
`            <label className={label}>Topic *</label>
            <input className={input} placeholder="e.g. AW26 uniform program" value={draft.meetingTopic ?? ""} onChange={(e) => setField("meetingTopic", e.target.value)} />
            {errors.meetingTopic && <p className="text-xs text-destructive mt-1">{errors.meetingTopic}</p>}`,
`            <label htmlFor={fieldId("meetingTopic")} className={label}>Topic *</label>
            <input {...fieldA11y("meetingTopic", errors)} required className={input} placeholder="e.g. AW26 uniform program" value={draft.meetingTopic ?? ""} onChange={(e) => setField("meetingTopic", e.target.value)} />
            <FieldError name="meetingTopic" errors={errors} />`],
  [
`          <label className={label}>Full name *</label>
          <input required autoComplete="name" className={input} value={draft.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}`,
`          <label htmlFor={fieldId("name")} className={label}>Full name *</label>
          <input {...fieldA11y("name", errors)} required autoComplete="name" className={input} value={draft.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
          <FieldError name="name" errors={errors} />`],
  [
`          <label className={label}>Company *</label>
          <input required autoComplete="organization" className={input} value={draft.company ?? ""} onChange={(e) => setField("company", e.target.value)} />
          {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}`,
`          <label htmlFor={fieldId("company")} className={label}>Company *</label>
          <input {...fieldA11y("company", errors)} required autoComplete="organization" className={input} value={draft.company ?? ""} onChange={(e) => setField("company", e.target.value)} />
          <FieldError name="company" errors={errors} />`],
  [
`          <label className={label}>Email *</label>
          <input required type="email" autoComplete="email" className={input} value={draft.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}`,
`          <label htmlFor={fieldId("email")} className={label}>Email *</label>
          <input {...fieldA11y("email", errors)} required type="email" autoComplete="email" className={input} value={draft.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
          <FieldError name="email" errors={errors} />`],
  [
`          <label className={label}>WhatsApp / phone *</label>
          <input required type="tel" autoComplete="tel" className={input} placeholder="+1 555 000 0000" value={draft.whatsapp ?? ""} onChange={(e) => setField("whatsapp", e.target.value)} />
          {errors.whatsapp && <p className="text-xs text-destructive mt-1">{errors.whatsapp}</p>}`,
`          <label htmlFor={fieldId("whatsapp")} className={label}>WhatsApp / phone *</label>
          <input {...fieldA11y("whatsapp", errors)} required type="tel" autoComplete="tel" className={input} placeholder="+1 555 000 0000" value={draft.whatsapp ?? ""} onChange={(e) => setField("whatsapp", e.target.value)} />
          <FieldError name="whatsapp" errors={errors} />`],
  [
`          <label className={label}>Country *</label>
          <input required autoComplete="country-name" className={input} value={draft.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}`,
`          <label htmlFor={fieldId("country")} className={label}>Country *</label>
          <input {...fieldA11y("country", errors)} required autoComplete="country-name" className={input} value={draft.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          <FieldError name="country" errors={errors} />`],
];
for (const [before, after] of fieldReplacements) replaceOnce(inquiry, before, after);

replaceOnce(inquiry,
`        <input
          type="checkbox"
          checked={draft.consent === true}
          onChange={(event) => setField("consent", event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />`,
`        <input
          id={fieldId("consent")}
          data-inquiry-field="consent"
          type="checkbox"
          checked={draft.consent === true}
          onChange={(event) => setField("consent", event.target.checked)}
          aria-invalid={Boolean(errors.consent) || undefined}
          aria-describedby={errors.consent ? \`\${fieldId("consent")}-error\` : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />`);
replaceOnce(inquiry,
`      {errors.consent && <p className="text-xs text-destructive" role="alert">{errors.consent}</p>}`,
`      <FieldError name="consent" errors={errors} />`);

const navbar = "src/components/layout/Navbar.tsx";
replaceOnce(navbar, `import { useEffect, useState } from "react";`, `import { useEffect, useRef, useState } from "react";`);
replaceOnce(navbar,
`  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);`,
`  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);`);
replaceOnce(navbar,
`    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };`,
`    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    };`);
replaceOnce(navbar,
`    if (href === "/") return homeHref;
    if (href === "/materials")`,
`    if (href === "/") return homeHref;
    if (href === "/#process") return \`\${homeHref.replace(/\\\/$/, "")}/#process\`;
    if (href === "/materials")`);
replaceOnce(navbar,
`? <a key={item.href} href={href} hrefLang={locale === "en" ? undefined : "en"}`,
`? <a key={item.href} href={href}`);
replaceOnce(navbar,
`<button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-12`,
`<button ref={menuButtonRef} type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-12`);

const language = "src/components/LanguageSelector.tsx";
replaceOnce(language,
`inline-flex min-h-9 items-center justify-center rounded px-3`,
`inline-flex min-h-11 min-w-11 items-center justify-center rounded px-3`);

mkdirSync("src/test", { recursive: true });
writeFileSync("src/test/finalBuyerReadinessPolish.test.ts", `import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("IA-B2B-E003 final buyer-readiness polish", () => {
  it("never exposes raw backend errors in the public inquiry flow", () => {
    const source = read("src/pages/InquiryBase.tsx");
    expect(source).toContain("SAFE_SUBMISSION_ERROR");
    expect(source).toContain("Your draft is still saved on this device");
    expect(source).not.toContain("err instanceof Error ? err.message");
    expect(source).not.toContain("description: msg");
  });

  it("moves validation focus and associates errors with inquiry fields", () => {
    const source = read("src/pages/InquiryBase.tsx");
    expect(source).toContain("data-inquiry-field");
    expect(source).toContain("aria-invalid");
    expect(source).toContain("aria-describedby");
    expect(source).toContain('role="alert"');
    expect(source).toContain("document.querySelector<HTMLElement>");
    for (const field of ["company", "country", "quantity", "sampleQty", "meetingTopic", "name", "email", "whatsapp", "consent"]) {
      expect(source).toContain(\`fieldId("\${field}")\`);
    }
  });

  it("announces wizard state and selection without reducing touch targets", () => {
    const inquirySource = read("src/pages/InquiryBase.tsx");
    const languageSource = read("src/components/LanguageSelector.tsx");
    expect(inquirySource).toContain('aria-current={active ? "step" : undefined}');
    expect(inquirySource).toContain("aria-pressed={active}");
    expect(inquirySource).toContain("inline-flex min-h-11 items-center");
    expect(languageSource).toContain("min-h-11 min-w-11");
  });

  it("keeps localized process navigation in the selected language", () => {
    const source = read("src/components/layout/Navbar.tsx");
    expect(source).toContain('if (href === "/#process")');
    expect(source).toContain("homeHref.replace");
    expect(source).not.toContain('hrefLang={locale === "en" ? undefined : "en"}');
  });

  it("returns keyboard focus to the mobile menu trigger after Escape", () => {
    const source = read("src/components/layout/Navbar.tsx");
    expect(source).toContain("const menuButtonRef = useRef<HTMLButtonElement>(null)");
    expect(source).toContain("menuButtonRef.current?.focus()");
    expect(source).toContain("ref={menuButtonRef}");
  });

  it("preserves the exact five-division product architecture", () => {
    const source = read("src/data/buyerCapabilities.ts");
    for (const slug of ["bavarian-trachten-wear", "premium-leather-apparel", "sportswear", "streetwear-activewear", "leisure-nightwear"]) {
      expect(source).toContain(slug);
    }
  });
});
`);

console.log("IA-B2B-E003 focused source transformation completed");
