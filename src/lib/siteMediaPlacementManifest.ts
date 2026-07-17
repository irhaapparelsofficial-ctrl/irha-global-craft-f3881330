// PR #5 — Site-wide media placement manifest.
//
// Declarative list of every buyer-facing image slot on the site.
// Actual media_asset_id links live in `public.site_media_placements`
// (page_type + page_slug + role). This file is the read-side spine that
// admin dashboards use to compute "mapped vs missing" placements without
// guessing what pages exist.

import { MAIN_CATEGORIES } from "@/lib/catalogTaxonomyManifest";

export type PlacementPageType =
  | "home"
  | "main_category"
  | "audience"
  | "family"
  | "product"
  | "static";

export type PlacementSpec = {
  pageType: PlacementPageType;
  pageSlug: string;
  role: string;
  isLcpEligible?: boolean;
  description: string;
  /** Static asset path when the placement is wired via bundled asset,
   *  independent of `site_media_placements` DB row. Kept in review state
   *  until owner QA marks the placement verified. */
  localAssetPath?: string;
  localAssetStatus?: "pending_qa" | "approved" | "rejected" | "unassigned";
  /** Owner/admin note explaining why an asset was rejected or is pending. */
  reviewNote?: string;
};


const HOMEPAGE: PlacementSpec[] = [
  // Homepage hero (desktop + mobile) — currently UNASSIGNED. The previous
  // generated candidates were rejected by the owner as generic suit-only
  // tailoring imagery that does not represent Irha Apparels' multi-category
  // B2B range (Bavarian/Trachten, sportswear, leatherwear, streetwear/
  // activewear, nightwear/private-label). See
  // docs/PR5A_HOMEPAGE_HERO_BRIEF_V2.md for the corrected brief. Do NOT
  // wire a public hero image until the admin approves the new candidate.
  {
    pageType: "home",
    pageSlug: "/",
    role: "hero_desktop",
    isLcpEligible: true,
    description: "Above-the-fold desktop hero (21:9)",
    localAssetStatus: "unassigned",
    reviewNote:
      "Rejected 20260717: 'hero-b2b-manufacturer-desktop.jpg' — generic suit-only concept; does not represent multi-category B2B manufacturing. Awaiting corrected candidate per PR5A_HOMEPAGE_HERO_BRIEF_V2.md.",
  },
  {
    pageType: "home",
    pageSlug: "/",
    role: "hero_mobile",
    isLcpEligible: true,
    description: "Above-the-fold mobile hero (4:5)",
    localAssetStatus: "unassigned",
    reviewNote:
      "Rejected 20260717: 'hero-b2b-manufacturer-mobile.jpg' — generic suit-only concept; does not represent multi-category B2B manufacturing. Awaiting corrected candidate per PR5A_HOMEPAGE_HERO_BRIEF_V2.md.",
  },

  { pageType: "home", pageSlug: "/", role: "private_label_visual", description: "Woven labels + hang tags + packaging" },
  { pageType: "home", pageSlug: "/", role: "sampling_qc_visual", description: "Sampling / QC / customization" },
  { pageType: "home", pageSlug: "/", role: "factory_call_cta", description: "Factory live-video-call CTA visual" },
  { pageType: "home", pageSlug: "/", role: "quotation_cta", description: "Final quotation / catalogue CTA visual" },
];

const STATIC_PAGES: PlacementSpec[] = [
  { pageType: "static", pageSlug: "/about", role: "hero", description: "About / factory hero" },
  { pageType: "static", pageSlug: "/capabilities", role: "hero", description: "Capabilities hero" },
  { pageType: "static", pageSlug: "/private-label", role: "hero", description: "Private label hero" },
  { pageType: "static", pageSlug: "/quality", role: "hero", description: "Quality hero" },
  { pageType: "static", pageSlug: "/sampling", role: "hero", description: "Sampling hero" },
  { pageType: "static", pageSlug: "/contact", role: "hero", description: "Contact / quote hero" },
  { pageType: "static", pageSlug: "/catalogue", role: "hero", description: "Catalogue hero" },
];

const MAIN_CATEGORY_HEROES: PlacementSpec[] = MAIN_CATEGORIES.map((m) => ({
  pageType: "main_category" as const,
  pageSlug: `/products/${m.slug}`,
  role: "hero",
  isLcpEligible: true,
  description: `${m.name} category hero`,
}));

export const SITE_MEDIA_PLACEMENT_MANIFEST: PlacementSpec[] = [
  ...HOMEPAGE,
  ...MAIN_CATEGORY_HEROES,
  ...STATIC_PAGES,
];

export function placementKey(spec: Pick<PlacementSpec, "pageType" | "pageSlug" | "role">) {
  return `${spec.pageType}::${spec.pageSlug}::${spec.role}`;
}
