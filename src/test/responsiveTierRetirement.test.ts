import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const assetResolver = read("src/lib/assetResolver.ts");
const thumbnails = read("src/lib/imageThumbnails.ts");
const publicGenerator = read("scripts/generate-image-thumbnails.mjs");
const aiProcessor = read("scripts/image-ai/process_image.py");
const aiQueue = read("scripts/image-ai/run_queue.py");
const aiGateway = read("supabase/functions/image-processing-gateway/index.ts");

describe("responsive 2400 tier retirement", () => {
  it("keeps every active generator and publisher capped at 1600px", () => {
    expect(assetResolver).toContain('w: "360;720;1200;1600"');
    expect(assetResolver).not.toContain('w: "360;720;1200;1600;2400"');
    expect(thumbnails).toContain("RESPONSIVE_IMAGE_WIDTHS = [360, 720, 1200, 1600]");
    expect(publicGenerator).toContain("const WIDTHS = [360, 720, 1200, 1600]");
    expect(aiProcessor).toContain("RESPONSIVE_WIDTHS = (360, 720, 1200, 1600)");
    expect(aiGateway).toContain("const WIDTHS = [360, 720, 1200, 1600] as const");
  });

  it("does not create, upload or require a responsive 2400 derivative", () => {
    expect(publicGenerator).not.toContain("[360, 720, 1200, 1600, 2400]");
    expect(aiProcessor).not.toContain("RESPONSIVE_WIDTHS = (360, 720, 1200, 1600, 2400)");
    expect(aiQueue).not.toContain("variant_2400");
    expect(aiQueue).not.toContain('"2400.webp"');
    expect(aiGateway).not.toContain("variant_2400");
    expect(aiGateway).not.toContain("responsive/2400/");
  });

  it("retains the internal high-resolution master without exposing it as a web tier", () => {
    expect(aiProcessor).toContain("MASTER_WIDTH = 2400");
    expect(aiProcessor).toContain("MASTER_HEIGHT = 3000");
    expect(aiProcessor).toContain('output_bytes["master"]');
    expect(aiProcessor).not.toContain("2400: 90");
  });

  it("keeps explicit legacy recognition only for canonical recovery and cleanup", () => {
    expect(thumbnails).toContain("LEGACY_2400_PREFIX");
    expect(thumbnails).toContain("legacyResponsive2400ObjectPath");
    expect(thumbnails).toContain("responsiveVariantObjectPathsForCleanup");
    expect(thumbnails).not.toContain("RESPONSIVE_IMAGE_WIDTHS = [360, 720, 1200, 1600, 2400]");
  });
});
