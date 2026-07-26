import { describe, expect, it } from "vitest";
import { GERMAN_GATEWAY_CONTENT } from "./germanGatewayContent";

const expectedRoutes = [
  "/de/bavarian-wear",
  "/de/lederhosen-hersteller",
  "/de/dirndl-grosshandel",
  "/de/trachten-private-label",
  "/de/bekleidungshersteller-deutschland",
  "/de/sportbekleidung-hersteller",
  "/de/lederbekleidung-hersteller",
].sort();

describe("German gateway publication content", () => {
  it("contains complete required metadata and H1", () => {
    expect(GERMAN_GATEWAY_CONTENT.path).toBe("/de/");
    expect(GERMAN_GATEWAY_CONTENT.title.length).toBeGreaterThan(30);
    expect(GERMAN_GATEWAY_CONTENT.description.length).toBeGreaterThan(80);
    expect(GERMAN_GATEWAY_CONTENT.h1.length).toBeGreaterThan(30);
  });

  it("links exactly the seven reviewed German routes", () => {
    const routes = GERMAN_GATEWAY_CONTENT.links.map((link) => link.href).sort();
    expect(routes).toEqual(expectedRoutes);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("states the honest English-catalogue fallback boundary", () => {
    expect(GERMAN_GATEWAY_CONTENT.scopeNote).toContain("Englisch");
    expect(GERMAN_GATEWAY_CONTENT.scopeNote).toContain("nicht");
  });
});
