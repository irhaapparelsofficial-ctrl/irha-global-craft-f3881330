import {
  ArrowUpRight,
  Check,
  GitCompareArrows,
  MessageCircle,
  PackagePlus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { ProductCatalogCard } from "@/components/catalog/CatalogListingCard";
import { usePublicCategories } from "@/hooks/usePublicCategoryData";
import { whatsappLink } from "@/lib/constants";
import {
  filterProductFinder,
  flattenProductCatalog,
  type ProductFinderSort,
} from "@/lib/productFinder";
import { useCompare, useShortlist } from "@/lib/shortlist";
import { findPublishedProductRoute, usePublishedCatalogTaxonomyRelease } from "@/hooks/usePublishedCatalogTaxonomy";

const SITE = "https://irhaapparels.com";
const PAGE_SIZE = 24;

function validSort(value: string | null): ProductFinderSort {
  return value === "name-asc" || value === "newest" ? value : "relevance";
}

export default function AllProductsPage() {
  const { categories, isLoading, isError } = usePublicCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const shortlist = useShortlist();
  const compare = useCompare();
  const taxonomyRelease = usePublishedCatalogTaxonomyRelease();

  const deferredQuery = useDeferredValue(query.trim());
  const requestedCategory = searchParams.get("category") ?? "all";
  const categorySlug = categories.some((category) => category.slug === requestedCategory)
    ? requestedCategory
    : "all";
  const sort = validSort(searchParams.get("sort"));

  const allItems = useMemo(() => flattenProductCatalog(categories), [categories]);
  const results = useMemo(
    () =>
      filterProductFinder(allItems, {
        query: deferredQuery,
        categorySlug,
        sort,
      }),
    [allItems, categorySlug, deferredQuery, sort],
  );
  const visibleResults = results.slice(0, visibleCount);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    setQuery((current) => (current === nextQuery ? current : nextQuery));
  }, [searchParams]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [categorySlug, deferredQuery, sort]);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all" || (key === "sort" && value === "relevance")) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    updateParam("q", value.trim() || undefined);
  };

  const clearFilters = () => {
    setQuery("");
    setSearchParams({}, { replace: true });
  };

  const hasFilters = Boolean(deferredQuery) || categorySlug !== "all" || sort !== "relevance";
  const totalProducts = allItems.length;
  const selectedCategoryName =
    categorySlug === "all"
      ? "All categories"
      : categories.find((category) => category.slug === categorySlug)?.name ?? "All categories";
  const assistanceMessage = deferredQuery
    ? `Hello Irha Apparels — I searched the catalogue for "${deferredQuery}" and need help finding the right B2B product.`
    : `Hello Irha Apparels — I need help selecting products from ${selectedCategoryName}.`;

  return (
    <>
      <SEO
        title="Search All Custom Apparel Products | Irha Apparels"
        description="Search and filter the complete Irha Apparels B2B product catalogue across Bavarian Trachten, leather apparel, sportswear, streetwear, activewear, leisurewear and nightwear."
        path="/products/all"
        noindex
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Search All Irha Apparels Products",
          url: `${SITE}/products/all`,
          description:
            "Utility catalogue search covering custom apparel manufacturing categories available from Irha Apparels.",
          isPartOf: {
            "@type": "WebSite",
            name: "Irha Apparels",
            url: `${SITE}/`,
          },
        }}
      />

      <section className="border-b border-border/60 pb-10 pt-36 md:pb-16 md:pt-40">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Complete Product Finder</p>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl font-display text-4xl leading-[0.98] md:text-6xl">
                Find the right <span className="text-gold italic">manufacturing style</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/65 md:text-base">
                Search product names, SKUs, categories and construction descriptions. Add suitable styles to one inquiry cart, define quantities and size breakdowns, then submit one structured RFQ.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] sm:gap-3 sm:text-[10px] sm:tracking-[0.2em]">
              <span className="rounded-md border border-border/60 px-3 py-2.5 text-foreground/60 sm:px-4">
                {totalProducts} products in this catalogue
              </span>
              <Link to="/inquiry-cart" className="rounded-md border border-border/60 px-3 py-2.5 hover:border-primary hover:text-primary sm:px-4">
                Inquiry cart {shortlist.items.length > 0 ? `(${shortlist.items.length})` : ""}
              </Link>
              <Link to="/compare" className="rounded-md border border-border/60 px-3 py-2.5 hover:border-primary hover:text-primary sm:px-4">
                Compare {compare.items.length > 0 ? `(${compare.items.length}/4)` : ""}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-background/96 py-3 backdrop-blur-xl md:sticky md:top-20 md:z-30 md:py-4">
        <div className="container-luxe">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1fr)_240px_190px_auto] lg:gap-3">
            <label className="relative col-span-2 block lg:col-span-1">
              <span className="sr-only">Search all products</span>
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/45" />
              <input
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Search product, category or SKU…"
                autoComplete="off"
                enterKeyHint="search"
                className="min-h-12 w-full rounded-md border border-border/60 bg-card/35 pl-11 pr-11 text-sm outline-none transition-colors focus:border-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  aria-label="Clear product search"
                  className="absolute right-3 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-foreground/45 hover:text-primary"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <label className="relative col-span-2 sm:col-span-1 lg:col-span-1">
              <span className="sr-only">Filter by category</span>
              <SlidersHorizontal size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/45" />
              <select
                value={categorySlug}
                onChange={(event) => updateParam("category", event.target.value)}
                className="min-h-12 w-full appearance-none rounded-md border border-border/60 bg-card/35 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
              >
                <option value="all">All categories ({totalProducts})</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name} ({category.productCount})
                  </option>
                ))}
              </select>
            </label>

            <label className="col-span-1">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => updateParam("sort", event.target.value)}
                className="min-h-12 w-full rounded-md border border-border/60 bg-card/35 px-3 text-sm outline-none transition-colors focus:border-primary sm:px-4"
              >
                <option value="relevance">Best match</option>
                <option value="name-asc">Name A–Z</option>
                <option value="newest">Newest added</option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="col-span-1 min-h-12 rounded-md border border-border/60 px-3 text-[9px] uppercase tracking-[0.16em] text-foreground/65 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 sm:px-5 sm:text-[10px] sm:tracking-[0.2em]"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <section className="pb-32 pt-8 md:pb-16 md:pt-12">
        <div className="container-luxe">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-sm text-foreground/60" role="status" aria-live="polite">
              Loading catalogue…
            </div>
          ) : (
            <>
              {isError && (
                <div className="mb-8 rounded-xl border border-amber-500/35 bg-amber-500/5 p-4 text-xs text-foreground/70" role="status">
                  Live catalogue data could not be refreshed. Available fallback products are shown; confirm the current style before quotation.
                </div>
              )}

              <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-5">
                <div>
                  <p className="eyebrow mb-2">Search Results</p>
                  <h2 className="font-display text-2xl md:text-3xl">
                    {results.length} product{results.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <p className="text-xs text-foreground/50" aria-live="polite">
                  {deferredQuery ? `Matching “${deferredQuery}” · ` : ""}{selectedCategoryName}
                </p>
              </div>

              {results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
                  <Search size={28} className="mx-auto mb-4 text-foreground/35" />
                  <h3 className="font-display text-2xl">No matching product</h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground/60">
                    Try a broader product name, remove the category filter, or share your reference with our team for a custom manufacturing review.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="min-h-11 rounded-md border border-border/60 px-5 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
                    >
                      Reset search
                    </button>
                    <a
                      href={whatsappLink(assistanceMessage)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gold/70 px-5 text-[10px] uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-background"
                    >
                      <MessageCircle size={14} /> Ask on WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-6">
                    {visibleResults.map((item) => {
                      const { product } = item;
                      const saved = shortlist.has(product.slug);
                      const inCompare = compare.has(product.slug);
                      const compareFull = !inCompare && compare.items.length >= 4;
                      const storedProduct = {
                        slug: product.slug,
                        name: product.name,
                        image: product.image,
                        categorySlug: item.categorySlug,
                        categoryName: item.categoryName,
                        addedAt: Date.now(),
                      };
                      const publishedRoute = findPublishedProductRoute(taxonomyRelease.data, product.id, product.slug);
                      const productPath = publishedRoute?.canonicalPath ?? `/products/${item.categorySlug}/${product.slug}`;
                      const eyebrow = `${product.sku ? `${product.sku} · ` : ""}${item.categoryName} · ${item.subName}`;

                      return (
                        <ProductCatalogCard
                          key={`${item.categorySlug}:${product.slug}`}
                          href={productPath}
                          name={product.name}
                          image={product.image}
                          originalImage={product.originalImage}
                          eyebrow={eyebrow}
                          actions={(
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => shortlist.toggle(storedProduct)}
                                aria-pressed={saved}
                                aria-label={saved ? `Remove ${product.name} from inquiry cart` : `Add ${product.name} to inquiry cart`}
                                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-2 text-[8px] font-semibold uppercase tracking-[0.12em] ${
                                  saved ? "border-primary text-primary" : "border-border/60 hover:border-primary"
                                }`}
                              >
                                {saved ? <Check size={12} /> : <PackagePlus size={12} />}
                                {saved ? "Added" : "Add to inquiry"}
                              </button>
                              <button
                                type="button"
                                onClick={() => compare.toggle(storedProduct)}
                                disabled={compareFull}
                                aria-pressed={inCompare}
                                title={compareFull ? "Comparison is limited to four products" : undefined}
                                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-2 text-[8px] font-semibold uppercase tracking-[0.12em] ${
                                  inCompare
                                    ? "border-primary text-primary"
                                    : "border-border/60 hover:border-primary disabled:cursor-not-allowed disabled:opacity-35"
                                }`}
                              >
                                <GitCompareArrows size={12} />
                                {inCompare ? "Added" : "Compare"}
                              </button>
                              <Link
                                to={productPath}
                                aria-label={`Open ${product.name}`}
                                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gradient-gold text-[8px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
                              >
                                View product <ArrowUpRight size={13} />
                              </Link>
                            </div>
                          )}
                        />
                      );
                    })}
                  </div>

                  {visibleCount < results.length && (
                    <div className="mt-12 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                        className="min-h-12 rounded-md border border-border/60 px-7 text-[10px] uppercase tracking-[0.22em] hover:border-primary hover:text-primary"
                      >
                        Show more ({results.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
