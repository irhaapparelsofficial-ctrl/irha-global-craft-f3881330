import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const patch = readFileSync(resolve("scripts/patch-worker-route-parity.mjs"), "utf8");

const expectedAliases = new Map([
  [
    "/products/bavarian-trachten-wear/alpine-trachten-hat",
    "/products/bavarian-trachten-wear/accessories/alpine-hats/alpine-trachten-hat",
  ],
  [
    "/products/bavarian-trachten-wear/bavarian-checkered-shirt",
    "/products/bavarian-trachten-wear/men/trachten-shirts/bavarian-checkered-shirt",
  ],
  [
    "/products/bavarian-trachten-wear/bavarian-embroidered-vest",
    "/products/bavarian-trachten-wear/men/trachten-vests/bavarian-embroidered-vest",
  ],
  [
    "/products/sportswear-baseball",
    "/products/sportswear/team-club/baseball-uniforms",
  ],
  [
    "/products/sportswear-basketball",
    "/products/sportswear/team-club/basketball-uniforms",
  ],
  [
    "/products/sportswear-cricket",
    "/products/sportswear/team-club/cricket-uniforms",
  ],
  [
    "/products/sportswear-rugby",
    "/products/sportswear/team-club/rugby-kits",
  ],
  [
    "/products/sportswear-soccer",
    "/products/sportswear/team-club/football-kits",
  ],
  [
    "/products/sportswear/athletic-onesie",
    "/products/sportswear/unisex/athletic-bodysuits/athletic-onesie",
  ],
  [
    "/products/sportswear/baseball-jersey",
    "/products/sportswear/team-club/baseball-uniforms/baseball-jersey",
  ],
  [
    "/products/sportswear/baseball-uniform-kit",
    "/products/sportswear/team-club/baseball-uniforms/baseball-uniform-kit",
  ],
  [
    "/products/sportswear/basketball-mesh-jersey",
    "/products/sportswear/team-club/basketball-uniforms/basketball-mesh-jersey",
  ],
  [
    "/products/sportswear/basketball-uniform-kit",
    "/products/sportswear/team-club/basketball-uniforms/basketball-uniform-kit",
  ],
]);

describe("Cloudflare worker redirect precedence patch", () => {
  it("pins every production mismatch to its verified one-hop canonical target", () => {
    for (const [source, target] of expectedAliases) {
      expect(patch).toContain(`"${source}"`);
      expect(patch).toContain(`"${target}"`);
    }
  });

  it("fails closed on missing maps or unexpected existing destinations", () => {
    expect(patch).toContain("Cloudflare worker legacy alias map is missing");
    expect(patch).toContain("points to unexpected target");
    expect(patch).toContain("alias could not be aligned");
    expect(patch).not.toContain("process.exitCode = 0");
  });
});
