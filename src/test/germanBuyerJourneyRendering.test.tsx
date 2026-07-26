import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import BuyerIntentLandingPage from "@/pages/BuyerIntentLandingPage";
import GermanBavarianWear from "@/pages/GermanBavarianWear";
import GermanGateway from "@/pages/GermanGateway";
import { GERMAN_BUYER_JOURNEY_PAGES } from "@/lib/germanBuyerJourneyPages";
import { GERMAN_GATEWAY_CONTENT } from "@/lib/germanGatewayContent";

function renderAt(path: string, element: React.ReactNode) {
  return renderToStaticMarkup(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
    </HelmetProvider>,
  );
}

const forbiddenFallbackCopy = [
  "Buyer FAQ",
  "Request Quote",
  "Explore related products",
  "Related sourcing pages",
  "Experienced manufacturer in Sialkot",
];

describe("rendered German buyer journey", () => {
  it.each(GERMAN_BUYER_JOURNEY_PAGES)("renders native German content for $path", (page) => {
    const markup = renderAt(page.path, <BuyerIntentLandingPage />);

    expect(markup).toContain(page.h1);
    expect(markup).toContain("FAQ für Einkäufer");
    expect(markup).toContain(page.primaryLabel);
    expect(markup).toContain("Weitere Beschaffungsseiten");
    for (const forbidden of forbiddenFallbackCopy) expect(markup).not.toContain(forbidden);
  });

  it("renders the German gateway without mixed-language action copy", () => {
    const markup = renderAt("/de/", <GermanGateway />);

    expect(markup).toContain(GERMAN_GATEWAY_CONTENT.h1);
    expect(markup).toContain(GERMAN_GATEWAY_CONTENT.sectionTitle);
    expect(markup).toContain(GERMAN_GATEWAY_CONTENT.primaryCta);
    for (const forbidden of forbiddenFallbackCopy) expect(markup).not.toContain(forbidden);
  });

  it("renders the Bavarian route with German guidance and explicit English-catalogue boundaries", () => {
    const markup = renderAt("/de/bavarian-wear", <GermanBavarianWear />);

    expect(markup).toContain("Trachtenfertigung für");
    expect(markup).toContain("Ausschließlich B2B");
    expect(markup).toContain("Englischer Produktkatalog");
    expect(markup).not.toContain('href="/intl/de/');
    for (const forbidden of forbiddenFallbackCopy) expect(markup).not.toContain(forbidden);
  });
});
