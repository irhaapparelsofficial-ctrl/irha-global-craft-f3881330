import { describe, it, expect } from "vitest";
import {
  FAMILIES,
  FAMILY_NODES,
  ALL_SLOTS,
  MAIN_CATEGORIES,
  TAXONOMY_TARGETS,
  familyCountByMain,
  slotCountByMain,
  isValidReferenceCode,
  isSlotPublishable,
  buildCanonicalUrl,
  buildBreadcrumbs,
} from "./catalogTaxonomyManifest";

describe("catalog taxonomy manifest (PR #2 foundation)", () => {
  it("targets: exactly 5 mains, 103 families, 206 planned slots", () => {
    expect(TAXONOMY_TARGETS).toEqual({
      mainCategoryCount: 5,
      productFamilyCount: 103,
      productSlotCount: 206,
    });
    expect(MAIN_CATEGORIES).toHaveLength(TAXONOMY_TARGETS.mainCategoryCount);
    expect(FAMILIES).toHaveLength(TAXONOMY_TARGETS.productFamilyCount);
    expect(FAMILY_NODES).toHaveLength(TAXONOMY_TARGETS.productFamilyCount);
    expect(ALL_SLOTS).toHaveLength(TAXONOMY_TARGETS.productSlotCount);
  });

  it("family distribution per main matches approved plan (22/20/22/20/19)", () => {
    expect(familyCountByMain()).toEqual({
      "bavarian-trachten-wear": 22,
      "premium-leather-apparel": 20,
      sportswear: 22,
      "streetwear-activewear": 20,
      "leisure-nightwear": 19,
    });
    expect(slotCountByMain()).toEqual({
      "bavarian-trachten-wear": 44,
      "premium-leather-apparel": 40,
      sportswear: 44,
      "streetwear-activewear": 40,
      "leisure-nightwear": 38,
    });
  });

  it("family slugs are globally unique", () => {
    const slugs = FAMILIES.map((f) => `${f.main}/${f.audience}/${f.slug}`);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every slot has a unique canonical path and unique reference code", () => {
    const paths = ALL_SLOTS.map((s) => s.fullSlugPath);
    const refs = ALL_SLOTS.map((s) => s.referenceCode);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(refs).size).toBe(refs.length);
    expect(paths).toHaveLength(206);
    expect(refs).toHaveLength(206);
  });

  it("every reference code matches the IRHA-<MAIN>-<AUD>-<FAM>-<NNN> pattern", () => {
    for (const s of ALL_SLOTS) {
      expect(isValidReferenceCode(s.referenceCode)).toBe(true);
    }
  });

  it("every slot ships as draft/unpublished/missing media (no fake public content)", () => {
    for (const s of ALL_SLOTS) {
      expect(s.draftStatus).toBe("draft");
      expect(s.publicationStatus).toBe("unpublished");
      expect(s.mediaStatus).toBe("missing");
      expect(isSlotPublishable(s)).toBe(false);
    }
  });

  it("exactly 2 slots per family (Design 01 + Design 02)", () => {
    for (const fn of FAMILY_NODES) {
      expect(fn.slots).toHaveLength(2);
      expect(fn.slots.map((s) => s.designIndex).sort()).toEqual([1, 2]);
    }
  });

  it("parent-child paths are complete: every family resolves to a known main", () => {
    const mainSlugs = new Set(MAIN_CATEGORIES.map((m) => m.slug));
    for (const f of FAMILIES) {
      expect(mainSlugs.has(f.main)).toBe(true);
    }
    for (const s of ALL_SLOTS) {
      expect(mainSlugs.has(s.main)).toBe(true);
      const [main, aud, fam, slot] = s.fullSlugPath.split("/");
      expect(main).toBe(s.main);
      expect(aud).toBe(s.audience);
      expect(fam).toBe(s.familySlug);
      expect(slot).toBe(s.slug);
    }
  });

  it("canonical URLs use the apex origin only", () => {
    for (const s of ALL_SLOTS) {
      expect(s.canonicalUrl.startsWith("https://irhaapparels.com/")).toBe(true);
      expect(s.canonicalUrl).not.toMatch(/www\./);
    }
    expect(buildCanonicalUrl("a/b")).toBe("https://irhaapparels.com/a/b");
  });

  it("breadcrumbs match the full slug path exactly", () => {
    const crumbs = buildBreadcrumbs("sportswear/men/mens-football-soccer-kits");
    expect(crumbs).toEqual([
      { slug: "sportswear", path: "/sportswear" },
      { slug: "men", path: "/sportswear/men" },
      {
        slug: "mens-football-soccer-kits",
        path: "/sportswear/men/mens-football-soccer-kits",
      },
    ]);
  });
});
