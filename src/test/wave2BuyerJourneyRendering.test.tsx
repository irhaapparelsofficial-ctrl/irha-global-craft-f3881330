import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUYER_JOURNEY_COPY, getBuyerJourneyLocaleForPage } from "@/lib/buyerJourneyLocaleCopy";
import { WAVE2_BUYER_JOURNEY_PAGES } from "@/lib/wave2BuyerJourneyPages";

function renderBuyerPage(page: (typeof WAVE2_BUYER_JOURNEY_PAGES)[number]) {
  const locale = getBuyerJourneyLocaleForPage(page);
  const copy = BUYER_JOURNEY_COPY[locale];
  return renderToStaticMarkup(
    <main lang={locale} data-route={page.path}>
      <nav aria-label={copy.primaryNavigation}><a href={`/${locale}/`}>{copy.home}</a></nav>
      <h1>{page.h1}</h1>
      <p>{page.intro}</p>
      <a href={`/inquiry?intent=rfq&source=${encodeURIComponent(page.path)}`}>{page.primaryLabel}</a>
      {page.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p><ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></section>)}
      <section aria-label={copy.faqEyebrow}>{page.faqs.map((faq) => <article key={faq.question}><h2>{faq.question}</h2><p>{faq.answer}</p></article>)}</section>
      <nav aria-label={copy.relatedAria}>{page.relatedPaths.map((path) => <a key={path} href={path}>{path}</a>)}</nav>
    </main>,
  );
}

const forbiddenEnglishChrome = ["Buyer FAQ", "Request Quote", "Related sourcing pages", "Primary navigation"];

describe("browser-rendered Wave 2 buyer journeys", () => {
  it.each(WAVE2_BUYER_JOURNEY_PAGES)("renders native browser content for $path", (page) => {
    const locale = getBuyerJourneyLocaleForPage(page);
    const markup = renderBuyerPage(page);
    expect(markup).toContain(`lang="${locale}"`);
    expect(markup).toContain(page.h1);
    expect(markup).toContain(page.primaryLabel);
    expect(markup).toContain(page.faqs[0].question);
    expect(markup).toContain(BUYER_JOURNEY_COPY[locale].relatedAria);
    for (const forbidden of forbiddenEnglishChrome) expect(markup).not.toContain(forbidden);
  });
});
