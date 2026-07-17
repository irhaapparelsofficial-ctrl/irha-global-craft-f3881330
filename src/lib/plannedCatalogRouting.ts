// Planned-catalog routing gate — PR #3.
//
// The taxonomy routing manifest is the single source of truth for what is /
// isn't allowed to render publicly.
//
// Rules enforced here (per project business controls):
//   - Draft, in-review, or unapproved slots return `not-found` publicly.
//   - Slots missing media, rejected, or awaiting review return `not-found`.
//   - Only `isSlotPublishable(slot) === true` slots become `approved-slot`.
//   - Families / audiences are eligible when their `draftStatus === 'approved'`.
//   - Paths not tracked by the manifest at all return `not-in-manifest` so
//     existing catalog pages (categories, curated collections, spec sheets)
//     continue to render unchanged.
//
// The resolver is pure (no I/O), deterministic, and covered by unit tests.

import {
  CATALOG_TAXONOMY_MANIFEST,
  MAIN_CATEGORIES,
  type AudienceGroupNode,
  type MainCategoryNode,
  type ProductSlot,
  type ProductTypeNode,
  isSlotPublishable,
} from "./catalogTaxonomyRoutingManifest";

export type ManifestResolution =
  | { status: "not-in-manifest"; segments: string[] }
  | { status: "approved-main"; main: MainCategoryNode; segments: string[] }
  | {
      status: "approved-audience";
      main: MainCategoryNode;
      audience: AudienceGroupNode;
      segments: string[];
    }
  | {
      status: "approved-family";
      main: MainCategoryNode;
      audience: AudienceGroupNode;
      family: ProductTypeNode;
      segments: string[];
    }
  | {
      status: "approved-slot";
      main: MainCategoryNode;
      audience: AudienceGroupNode;
      family: ProductTypeNode;
      slot: ProductSlot;
      segments: string[];
    }
  | {
      status: "planned-family";
      main: MainCategoryNode;
      audience: AudienceGroupNode;
      family: ProductTypeNode;
      segments: string[];
    }
  | {
      status: "planned-slot";
      main: MainCategoryNode;
      audience: AudienceGroupNode;
      family: ProductTypeNode;
      slot: ProductSlot;
      segments: string[];
    };

const MAIN_SLUGS = new Set<string>(MAIN_CATEGORIES.map((m) => m.slug));

/**
 * Normalise a request path into taxonomy segments, stripping the leading
 * `/products/` prefix used by the public catalog routes. Returns `null` when
 * the path is definitely outside the catalog namespace.
 */
export function extractCatalogSegments(pathname: string): string[] | null {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const parts = clean.split("/").filter(Boolean);
  const [head, ...rest] = parts;
  if (head === "products") {
    if (rest.length === 0) return null;
    // `/products/all` and `/products/:categorySlug/all-products` are catalog
    // *listing* URLs, not taxonomy nodes. Leave them to their own routes.
    if (rest[0] === "all") return null;
    if (rest[rest.length - 1] === "all-products") return null;
    if (rest[rest.length - 1] === "spec-sheet") return null;
    return rest;
  }
  if (MAIN_SLUGS.has(head)) return parts;
  return null;
}

/**
 * Match segments against the manifest. Public rendering is gated on the
 * returned `status`; anything other than `approved-*` MUST be treated as
 * non-indexable by callers.
 */
export function resolveManifestPath(pathname: string): ManifestResolution {
  const segments = extractCatalogSegments(pathname);
  if (!segments) return { status: "not-in-manifest", segments: [] };

  const [mainSlug, audSlug, famSlug, slotSlug, ...extra] = segments;
  if (extra.length) return { status: "not-in-manifest", segments };

  const main = CATALOG_TAXONOMY_MANIFEST.find((m) => m.slug === mainSlug);
  if (!main) return { status: "not-in-manifest", segments };

  if (!audSlug) {
    return main.draftStatus === "approved"
      ? { status: "approved-main", main, segments }
      : { status: "not-in-manifest", segments };
  }

  const audience = main.audienceGroups.find((a) => a.slug === audSlug);
  if (!audience) return { status: "not-in-manifest", segments };

  if (!famSlug) {
    return audience.draftStatus === "approved"
      ? { status: "approved-audience", main, audience, segments }
      : { status: "not-in-manifest", segments };
  }

  const family = audience.productTypes.find((p) => p.slug === famSlug);
  if (!family) return { status: "not-in-manifest", segments };

  if (!slotSlug) {
    if (family.draftStatus !== "approved") {
      return { status: "planned-family", main, audience, family, segments };
    }
    return { status: "approved-family", main, audience, family, segments };
  }

  const slot = family.productSlots.find((s) => s.slug === slotSlug);
  if (!slot) return { status: "not-in-manifest", segments };

  if (!isSlotPublishable(slot)) {
    return { status: "planned-slot", main, audience, family, slot, segments };
  }
  return { status: "approved-slot", main, audience, family, slot, segments };
}

/** A resolution is publicly indexable ONLY when every ancestor is approved. */
export function isPublicRoutable(res: ManifestResolution): boolean {
  return (
    res.status === "approved-main" ||
    res.status === "approved-audience" ||
    res.status === "approved-family" ||
    res.status === "approved-slot"
  );
}

/** A resolution should serve HTTP 200 with `noindex` (drafts) vs. 404. */
export function shouldNoIndex(res: ManifestResolution): boolean {
  return res.status === "planned-family" || res.status === "planned-slot";
}

/**
 * The manifest currently ships as the spine only; families/slots land through
 * reviewed release batches. Helpers below let downstream code (sitemap
 * generator, admin panels, tests) enumerate what IS routable today without
 * fabricating placeholders.
 */
export function enumerateApprovedRoutes(): string[] {
  const out: string[] = [];
  for (const main of CATALOG_TAXONOMY_MANIFEST) {
    if (main.draftStatus !== "approved") continue;
    out.push(`/products/${main.slug}`);
    for (const aud of main.audienceGroups) {
      if (aud.draftStatus !== "approved") continue;
      out.push(`/products/${main.slug}/${aud.slug}`);
      for (const fam of aud.productTypes) {
        if (fam.draftStatus !== "approved") continue;
        out.push(`/products/${main.slug}/${aud.slug}/${fam.slug}`);
        for (const slot of fam.productSlots) {
          if (isSlotPublishable(slot)) {
            out.push(
              `/products/${main.slug}/${aud.slug}/${fam.slug}/${slot.slug}`,
            );
          }
        }
      }
    }
  }
  return out;
}
