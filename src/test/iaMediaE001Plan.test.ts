import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { IA_MEDIA_E001_PRODUCT_MEDIA } from "@/lib/iaMediaE001Runtime";

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

const STORAGE_ORIGIN = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media";
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

  it("binds every buyer-facing runtime URL to the exact canonical product path", () => {
    expect(Object.keys(IA_MEDIA_E001_PRODUCT_MEDIA).sort()).toEqual(
      plan.PRODUCTS.map((product) => product.slug).sort(),
    );

    for (const product of plan.PRODUCTS) {
      const code = product.sku.replace(/^IRHA-/, "").toLowerCase();
      const expected = [...product.images]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((image) => {
          const order = String(image.displayOrder).padStart(2, "0");
          return `${STORAGE_ORIGIN}/catalog/products/${code}-${product.slug}/${plan.MEDIA_VERSION}/${order}-${image.role}-${image.driveFileId}.webp`;
        });
      expect(IA_MEDIA_E001_PRODUCT_MEDIA[product.slug]?.gallery).toEqual(expected);
      expect(expected[0]).toContain("/01-hero-");
      expect(expected.every((url) => url.includes("/catalog/products/"))).toBe(true);
      expect(expected.every((url) => !url.includes("/catalog/recovery/"))).toBe(true);
      expect(new Set(expected).size).toBe(expected.length);
    }
  });

  it("uses the current responsive contract and excludes retired delivery tiers", () => {
    expect(plan.RESPONSIVE_WIDTHS).toEqual([360, 720, 1200, 1600]);
    expect(plan.RESPONSIVE_WIDTHS).not.toContain(480);
    expect(plan.RESPONSIVE_WIDTHS).not.toContain(2400);

    const executor = readFileSync(resolve(process.cwd(), "scripts/remediate-p001-p007-media.mjs"), "utf8");
    const staging = readFileSync(resolve(process.cwd(), "scripts/stage-p001-p007-media.mjs"), "utf8");

    expect(staging).toContain("thumbnails/${originalPath}.webp");
    expect(staging).toContain("responsive/${width}/${originalPath}.webp");
    expect(staging).toContain("catalog/products/${productCode(product)}-${product.slug}/${MEDIA_VERSION}");
    expect(staging).toContain("upsert: false");
    expect(staging).toContain("Original checksum mismatch");
    expect(staging).toContain("verifyWebp");

    expect(executor).toContain('const root = (product) => `catalog/products/${code(product)}-${product.slug}/${MEDIA_VERSION}`;');
    expect(executor).toContain('const canonicalPath = (product, image) => `${root(product)}/${String(image.displayOrder).padStart(2, "0")}-${image.role}-${image.driveFileId}.webp`;');
    expect(executor).toContain('const variantPath = (path, width) => width === 720 ? `thumbnails/${path}.webp` : `responsive/${width}/${path}.webp`;');
    expect(executor).toContain("verifyObject");
    expect(executor).toContain("storageObjects.length !== 205");

    for (const implementation of [executor, staging]) {
      expect(implementation).not.toContain("responsive/480/");
      expect(implementation).not.toContain("responsive/2400/");
    }
    expect(executor).toContain("rollback-manifest.json");
    expect(executor).toContain("mediaAssets");
    expect(executor).toContain("media_asset_id");
    expect(executor).toContain("checksum_sha256");
    expect(executor).toContain("UPDATE public.media_assets");
  });

  it("keeps branch staging immutable and database-independent", () => {
    const staging = readFileSync(resolve(process.cwd(), "scripts/stage-p001-p007-media.mjs"), "utf8");
    expect(staging).toContain("databaseMutated: false");
    expect(staging).toContain("stage-result.json");
    expect(staging).toContain("Staged and verified");
    expect(staging).not.toContain("/database/query");
    expect(staging).not.toContain('.from("products")');
    expect(staging).not.toContain("UPDATE public.products");
    expect(staging).not.toContain("UPDATE public.catalog_drive_files");
  });

  it("records the P001 filename contradiction instead of inventing a rear view", () => {
    const p001 = plan.PRODUCTS.find((product) => product.sku === "IRHA-P001");
    expect(p001).toBeDefined();
    expect(p001?.images.some((image) => image.role === "rear_three_quarter")).toBe(false);
    expect(p001?.images.find((image) => image.driveFileId === "1pMkT7GnFg1UV1hhC6So9z4hOERF7cAXw"))
      .toMatchObject({ role: "three_quarter", roleIndex: 2, displayOrder: 3, confidence: "verified" });
    expect(plan.REJECTED_CANDIDATES.some(
      (candidate) => candidate.sku === "IRHA-P001"
        && candidate.reason.includes("filename-labelled candidate visibly showed the front bib"),
    )).toBe(true);
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
    const serialized = JSON.stringify({ plan: plan.PRODUCTS, runtime: IA_MEDIA_E001_PRODUCT_MEDIA }).toLowerCase();
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
