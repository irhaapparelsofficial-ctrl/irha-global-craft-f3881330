// Page counts for each generated catalog PDF (matches /public/catalogs/thumbs/*.jpg)
export const CATALOG_PAGES: Record<string, number> = {
  bavarian: 7,
  leatherwear: 7,
  sportswear: 6,
  streetwear: 6,
  leisurewear: 6,
  nightwear: 6,
  "master-catalogue-2026": 22,
};

export const catalogThumb = (slug: string, page: number) => {
  const base = slug === "master-catalogue-2026" ? slug : `${slug}-catalog`;
  return `/catalogs/thumbs/${base}-${page}.jpg`;
};

export const catalogPdf = (slug: string) => {
  const file = slug === "master-catalogue-2026" ? slug : `${slug}-catalog`;
  return `/catalogs/${file}.pdf`;
};
