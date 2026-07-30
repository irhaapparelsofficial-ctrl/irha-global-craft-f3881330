import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

type PlannedImage = {
  driveFileId: string;
  role: string;
  roleIndex: number;
  displayOrder: number;
  confidence: "verified" | "high" | "insufficient";
  visualIdentificationReasons: string;
};

type PlannedProduct = {
  sku: string;
  slug: string;
  name: string;
  driveFolderId: string;
  images: PlannedImage[];
};

type MediaPlanModule = {
  EXECUTION_ID: string;
  MEDIA_VERSION: string;
  RESPONSIVE_WIDTHS: number[];
  PRODUCTS: PlannedProduct[];
  REJECTED_CANDIDATES: Array<{ sku: string; driveFileId: string | null; reason: string }>;
};

let plan: MediaPlanModule;

beforeAll(async () => {
  const planPath = resolve(process.cwd(), "ops/ia-media-e001/media-plan.mjs");
  plan = await import(pathToFileURL(planPath).href) as MediaPlanModule;
});

describe("IA-MEDIA-E001 deterministic media plan", () => {
  it("is locked to exactly the seven requested published products", () => {
    expect(plan.EXECUTION_ID).toBe("IA-MEDIA-E001");
    expect(plan.MEDIA_VERSION).toBe("ia-media-e001-20260730");
    expect(plan.PRODUCTS.map((product) => product.sku)).toEqual([
      "IRHA-P001",
      "IRHA-P002",
      "IRHA-P003",
      "IRHA-P004",
      "IRHA-P005",
      "IRHA-P006",
      "IRHA-P007",
    ]);
    expect(plan.PRODUCTS.map((product) => product.slug)).toEqual([
      "short-lederhosen",
      "knee-length-lederhosen",
      "long-lederhosen",
      "vintage-lederhosen",
      "premium-embroidered-lederhosen",
      "goat-suede-lederhosen",
      "deer-suede-lederhosen",
    ]);
  });

  it("publishes only visually accepted sources with one resolvable hero per product", () => {
    const selectedIds = new Set<string>();

    for (const product of plan.PRODUCTS) {
      expect(product.driveFolderId).toMatch(/^[A-Za-z0-9_-]{20,}$/);
      expect(product.images.length).toBeGreaterThanOrEqual(5);
      expect(product.images.filter((image) => image.role === "hero")).toHaveLength(1);
      expect(product.images[0]).toMatchObject({ role: "hero", roleIndex: 1, displayOrder: 1 });
      expect(product.images.every((image) => image.confidence === "verified" || image.confidence === "high")).toBe(true);
      expect(product.images.some((image) => image.confidence === "insufficient")).toBe(false);

      const displayOrders = product.images.map((image) => image.displayOrder);
      expect(new Set(displayOrders).size).toBe(displayOrders.length);
      expect([...displayOrders].sort((a, b) => a - b)).toEqual(
        Array.from({ length: product.images.length }, (_, index) => index + 1),
      );

      for (const image of product.images) {
        expect(image.driveFileId).toMatch(/^[A-Za-z0-9_-]{20,}$/);
        expect(image.visualIdentificationReasons.length).toBeGreaterThan(40);
        expect(selectedIds.has(image.driveFileId)).toBe(false);
        selectedIds.add(image.driveFileId);
      }
    }
  });

  it("uses the current responsive contract and excludes retired delivery tiers", () => {
    expect(plan.RESPONSIVE_WIDTHS).toEqual([360, 720, 1200, 1600]);
    expect(plan.RESPONSIVE_WIDTHS).not.toContain(480);
    expect(plan.RESPONSIVE_WIDTHS).not.toContain(2400);

    const executor = readFileSync(resolve(process.cwd(), "scripts/remediate-p001-p007-media.mjs"), "utf8");
    expect(executor).toContain("thumbnails/${originalPath}.webp");
    expect(executor).toContain("responsive/${width}/${originalPath}.webp");
    expect(executor).toContain("upsert: false");
    expect(executor).toContain("Original checksum mismatch");
    expect(executor).toContain("verifyWebp");
    expect(executor).toContain("rollback-manifest.json");
    expect(executor).not.toContain("responsive/480/");
    expect(executor).not.toContain("responsive/2400/");
  });

  it("records the P001 filename contradiction instead of inventing a rear view", () => {
    const p001 = plan.PRODUCTS.find((product) => product.sku === "IRHA-P001");
    expect(p001).toBeDefined();
    expect(p001?.images.some((image) => image.role === "rear_three_quarter")).toBe(false);
    expect(p001?.images.find((image) => image.driveFileId === "1pMkT7GnFg1UV1hhC6So9z4hOERF7cAXw"))
      .toMatchObject({ role: "three_quarter", roleIndex: 2, displayOrder: 3, confidence: "verified" });
    expect(plan.REJECTED_CANDIDATES.some((candidate) =>
      candidate.sku === "IRHA-P001" && candidate.reason.includes("filename-labelled candidate visibly showed the front bib"),
    ).toBe(true);
  });

  it("rejects the checksum-identical P003 duplicate and never publishes exact duplicate Drive IDs", () => {
    const rejectedDuplicate = plan.REJECTED_CANDIDATES.find(
      (candidate) => candidate.driveFileId === "1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3",
    );
    expect(rejectedDuplicate?.reason).toContain("Checksum-identical duplicate");
    expect(plan.PRODUCTS.flatMap((product) => product.images).some(
      (image) => image.driveFileId === "1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3",
    )).toBe(false);
  });

  it("does not map any requested product to shoe or placeholder media", () => {
    const serialized = JSON.stringify(plan.PRODUCTS).toLowerCase();
    for (const forbidden of ["shoe", "footwear", "question-mark", "placeholder", "lovable"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("keeps goat and deer material confidence tied to source provenance", () => {
    const p006Hero = plan.PRODUCTS.find((product) => product.sku === "IRHA-P006")?.images[0];
    const p007Hero = plan.PRODUCTS.find((product) => product.sku === "IRHA-P007")?.images[0];
    expect(p006Hero?.visualIdentificationReasons).toContain("source-folder provenance, not appearance alone");
    expect(p007Hero?.visualIdentificationReasons).toContain("source-folder provenance, not color alone");
  });
});
