import { describe, expect, it } from "vitest";
import {
  enumerateApprovedRoutes,
  extractCatalogSegments,
  isPublicRoutable,
  resolveManifestPath,
  shouldNoIndex,
  type ManifestResolution,
} from "./plannedCatalogRouting";
import {
  CATALOG_TAXONOMY_MANIFEST,
  MAIN_CATEGORIES,
  type ProductTypeNode,
  type ProductSlot,
} from "./catalogTaxonomyRoutingManifest";

describe("plannedCatalogRouting", () => {
  it("returns null segments for out-of-catalog paths", () => {
    expect(extractCatalogSegments("/about")).toBeNull();
    expect(extractCatalogSegments("/")).toBeNull();
    expect(extractCatalogSegments("/products")).toBeNull();
    expect(extractCatalogSegments("/products/all")).toBeNull();
    expect(extractCatalogSegments("/products/sportswear/all-products")).toBeNull();
    expect(
      extractCatalogSegments("/products/sportswear/mens-shorts/spec-sheet"),
    ).toBeNull();
  });

  it("extracts segments from `/products/...` and bare taxonomy prefixes", () => {
    expect(extractCatalogSegments("/products/sportswear")).toEqual(["sportswear"]);
    expect(
      extractCatalogSegments("/sportswear/men/mens-shorts"),
    ).toEqual(["sportswear", "men", "mens-shorts"]);
  });

  it("resolves approved main-category paths", () => {
    for (const main of MAIN_CATEGORIES) {
      const res = resolveManifestPath(`/products/${main.slug}`);
      expect(res.status).toBe("approved-main");
      expect(isPublicRoutable(res)).toBe(true);
      expect(shouldNoIndex(res)).toBe(false);
    }
  });

  it("treats unknown main slugs as not-in-manifest", () => {
    const res = resolveManifestPath("/products/does-not-exist");
    expect(res.status).toBe("not-in-manifest");
  });

  it("returns not-in-manifest for audience segments while manifest spine is empty", () => {
    // PR #2 shipped the spine only; audience/family/slot land per approved
    // review batch. Until they do, existing catalog pages must keep serving.
    const res = resolveManifestPath("/products/sportswear/men");
    expect(res.status).toBe("not-in-manifest");
  });

  it("planned-family + planned-slot are marked noindex, not publicly routable", () => {
    // Simulate a family/slot that WILL land in a future batch, still draft.
    const draftSlot: ProductSlot = {
      referenceCode: "IRHA-SPT-MEN-SHR-001",
      workingTitle: "Draft Men's Shorts",
      slug: "mens-shorts-design-01",
      fullSlugPath: "sportswear/men/mens-shorts/mens-shorts-design-01",
      canonicalUrl: "https://irhaapparels.com/products/sportswear/men/mens-shorts/mens-shorts-design-01",
      breadcrumbs: [],
      main: "sportswear",
      audience: "men",
      familySlug: "mens-shorts",
      familyName: "Men's Shorts",
      designIndex: 1,
      draftStatus: "in_review",
      publicationStatus: "unpublished",
      mediaStatus: "missing",
    };
    const draftFamily: ProductTypeNode = {
      slug: "mens-shorts",
      name: "Men's Shorts",
      fullSlugPath: "sportswear/men/mens-shorts",
      draftStatus: "in_review",
      productSlots: [draftSlot],
    };
    const sportswear = CATALOG_TAXONOMY_MANIFEST.find(
      (m) => m.slug === "sportswear",
    )!;
    sportswear.audienceGroups.push({
      slug: "men",
      name: "Men",
      fullSlugPath: "sportswear/men",
      draftStatus: "approved",
      productTypes: [draftFamily],
    });
    try {
      const famRes = resolveManifestPath("/products/sportswear/men/mens-shorts");
      expect(famRes.status).toBe("planned-family");
      expect(isPublicRoutable(famRes)).toBe(false);
      expect(shouldNoIndex(famRes)).toBe(true);

      const slotRes = resolveManifestPath(
        "/products/sportswear/men/mens-shorts/mens-shorts-design-01",
      );
      expect(slotRes.status).toBe("planned-slot");
      expect(isPublicRoutable(slotRes)).toBe(false);
      expect(shouldNoIndex(slotRes)).toBe(true);
    } finally {
      sportswear.audienceGroups.length = 0;
    }
  });

  it("enumerateApprovedRoutes only emits fully-approved paths", () => {
    const routes = enumerateApprovedRoutes();
    expect(routes).toEqual(
      MAIN_CATEGORIES.map((m) => `/products/${m.slug}`),
    );
  });

  it("never yields a slot URL for an unpublishable slot via enumerateApprovedRoutes", () => {
    const sportswear = CATALOG_TAXONOMY_MANIFEST.find(
      (m) => m.slug === "sportswear",
    )!;
    sportswear.audienceGroups.push({
      slug: "men",
      name: "Men",
      fullSlugPath: "sportswear/men",
      draftStatus: "approved",
      productTypes: [
        {
          slug: "mens-shorts",
          name: "Men's Shorts",
          fullSlugPath: "sportswear/men/mens-shorts",
          draftStatus: "approved",
          productSlots: [
            {
              referenceCode: "IRHA-SPT-MEN-SHR-001",
              workingTitle: "Draft",
              slug: "d-01",
              fullSlugPath: "sportswear/men/mens-shorts/d-01",
              canonicalUrl: "https://irhaapparels.com/products/sportswear/men/mens-shorts/d-01",
              breadcrumbs: [],
              main: "sportswear",
              audience: "men",
              familySlug: "mens-shorts",
              familyName: "Men's Shorts",
              designIndex: 1,
              draftStatus: "approved",
              publicationStatus: "published",
              mediaStatus: "missing",
            },
          ],
        },
      ],
    });
    try {
      const routes = enumerateApprovedRoutes();
      expect(
        routes.some((r) => r.endsWith("/mens-shorts/d-01")),
      ).toBe(false);
      expect(routes).toContain("/products/sportswear/men/mens-shorts");
    } finally {
      sportswear.audienceGroups.length = 0;
    }
  });

  it("ManifestResolution status is one of the closed union values", () => {
    const allowed: ManifestResolution["status"][] = [
      "not-in-manifest",
      "approved-main",
      "approved-audience",
      "approved-family",
      "approved-slot",
      "planned-family",
      "planned-slot",
    ];
    expect(allowed).toHaveLength(7);
  });
});
