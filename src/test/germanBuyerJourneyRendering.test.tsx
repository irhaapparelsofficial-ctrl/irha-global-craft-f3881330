import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GERMAN_BUYER_JOURNEY_PAGES } from "@/lib/germanBuyerJourneyPages";
import { GERMAN_GATEWAY_CONTENT } from "@/lib/germanGatewayContent";

const forbiddenFallbackCopy = [
  "Buyer FAQ",
  "Request Quote",
  "Explore related products",
  "Related sourcing pages",
  "Experienced manufacturer in Sialkot",
];

function renderGermanBuyerPage(page: (typeof GERMAN_BUYER_JOURNEY_PAGES)[number]) {
  return renderToStaticMarkup(
    <main lang="de">
      <h1>{page.h1}</h1>
      <p>{page.intro}</p>
      <a href={`/inquiry?intent=rfq&source=${encodeURIComponent(page.path)}`}>{page.primaryLabel}</a>
      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
          <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        </section>
      ))}
      <section aria-label="FAQ für Einkäufer">
        {page.faqs.map((faq) => (
          <article key={faq.question}>
            <h2>{faq.question}</h2>
            <p>{faq.answer}</p>
          </article>
        ))}
      </section>
      <nav aria-label="Weitere Beschaffungsseiten">
        {page.relatedPaths.map((path) => <a key={path} href={path}>{path}</a>)}
      </nav>
    </main>,
  );
}

describe("rendered German buyer journey", () => {
  it.each(GERMAN_BUYER_JOURNEY_PAGES)("renders native German content for $path", (page) => {
    const markup = renderGermanBuyerPage(page);

    expect(markup).toContain('lang="de"');
    expect(markup).toContain(page.h1);
    expect(markup).toContain(page.primaryLabel);
    expect(markup).toContain(page.faqs[0].question);
    expect(markup).toContain("FAQ für Einkäufer");
    expect(markup).toContain("Weitere Beschaffungsseiten");
    for (const forbidden of forbiddenFallbackCopy) expect(markup).not.toContain(forbidden);
  });

  it("renders the German gateway content without mixed-language action copy", () => {
    const markup = renderToStaticMarkup(
      <main lang="de">
        <h1>{GERMAN_GATEWAY_CONTENT.h1}</h1>
        <h2>{GERMAN_GATEWAY_CONTENT.sectionTitle}</h2>
        <a href="/inquiry?intent=rfq&source=%2Fde%2F">{GERMAN_GATEWAY_CONTENT.primaryCta}</a>
        {GERMAN_GATEWAY_CONTENT.links.map((link) => <a key={link.href} href={link.href}>{link.title}</a>)}
      </main>,
    );

    expect(markup).toContain(GERMAN_GATEWAY_CONTENT.h1);
    expect(markup).toContain(GERMAN_GATEWAY_CONTENT.sectionTitle);
    expect(markup).toContain(GERMAN_GATEWAY_CONTENT.primaryCta);
    for (const forbidden of forbiddenFallbackCopy) expect(markup).not.toContain(forbidden);
  });

  it("renders the Bavarian route copy with explicit English-catalogue boundaries", () => {
    const markup = renderToStaticMarkup(
      <main lang="de">
        <h1>Trachtenfertigung für Großhandel und Eigenmarken</h1>
        <p>Ausschließlich B2B</p>
        <a href="/products/bavarian-trachten-wear" hrefLang="en" lang="en">Englischer Produktkatalog</a>
      </main>,
    );

    expect(markup).toContain("Trachtenfertigung für");
    expect(markup).toContain("Ausschließlich B2B");
    expect(markup).toContain("Englischer Produktkatalog");
    expect(markup).not.toContain('href="/intl/de/');
    for (const forbidden of forbiddenFallbackCopy) expect(markup).not.toContain(forbidden);
  });
});
