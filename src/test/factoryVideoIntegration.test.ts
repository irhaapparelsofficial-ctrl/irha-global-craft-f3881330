import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("GP-4V real factory video integration", () => {
  it("keeps the homepage poster-first without embedding or preloading the full video", () => {
    const homeSection = read("src/components/sections/HomeManufacturingEditorial.tsx");
    expect(homeSection).toContain("FactoryCapabilityPosterLink");
    expect(homeSection).not.toContain("<video");
    expect(homeSection).not.toContain("factory/irha-apparels-factory-capability-2026.mp4");
  });

  it("uses a conservative, accessible full player contract", () => {
    const media = read("src/components/factory/FactoryCapabilityMedia.tsx");
    expect(media).toContain("controls");
    expect(media).toContain("playsInline");
    expect(media).toContain('preload="none"');
    expect(media).toContain("poster={FACTORY_CAPABILITY_POSTER_URL}");
    expect(media).toContain("width={910}");
    expect(media).toContain("height={512}");
    expect(media).not.toContain("autoPlay");
  });

  it("places the full player on manufacturing and keeps the live call distinct", () => {
    const manufacturing = read("src/pages/Manufacturing.tsx");
    const factoryCall = read("src/pages/FactoryVideoCall.tsx");
    expect(manufacturing).toContain("<FactoryCapabilityPlayer");
    expect(manufacturing).toContain('id="factory-video"');
    expect(factoryCall).toContain("Recorded factory overview and live factory verification are separate");
    expect(factoryCall).not.toContain("No prerecorded or concept factory media is presented here as proof while genuine media is pending");
  });
});
