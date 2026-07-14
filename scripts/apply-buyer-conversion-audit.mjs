import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${path}: expected exactly one matching source block, found ${occurrences}`);
  }
  writeFileSync(path, source.replace(before, after));
}

const navbarPath = "src/components/layout/Navbar.tsx";
replaceOnce(
  navbarPath,
  'import { useSiteSettings } from "@/hooks/useSiteSettings";',
  'import { useSiteSettings } from "@/hooks/useSiteSettings";\nimport { usePublicCatalogTree } from "@/hooks/usePublicCatalog";',
);
replaceOnce(
  navbarPath,
  '  const [moreOpen, setMoreOpen] = useState(false);\n  const { pathname } = useLocation();',
  '  const [moreOpen, setMoreOpen] = useState(false);\n  const [collectionsOpen, setCollectionsOpen] = useState(false);\n  const { pathname } = useLocation();',
);
replaceOnce(
  navbarPath,
  '  const { data: settings } = useSiteSettings();\n  const savedCount = shortlist.items.length;',
  `  const { data: settings } = useSiteSettings();
  const { data: catalogTree = [] } = usePublicCatalogTree();
  const collectionCategories = catalogTree
    .filter((category) => category.is_published)
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      productCount:
        category.directProducts.filter((product) => product.is_published).length +
        category.subs.reduce(
          (total, subCategory) =>
            total + subCategory.products.filter((product) => product.is_published).length,
          0,
        ),
    }))
    .filter((category) => category.productCount > 0)
    .slice(0, 6);
  const savedCount = shortlist.items.length;`,
);
replaceOnce(
  navbarPath,
  '  useEffect(() => { setOpen(false); setMoreOpen(false); }, [pathname]);',
  '  useEffect(() => { setOpen(false); setMoreOpen(false); setCollectionsOpen(false); }, [pathname]);',
);
replaceOnce(
  navbarPath,
  `          {mainLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === "/"}
              className={({ isActive }) => cn(
                "text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors",
                isActive ? "text-primary" : "text-foreground/80 hover:text-foreground",
              )}
            >
              {link.label}
            </NavLink>
          ))}`,
  `          {mainLinks.map((link) => {
            if (link.href !== "/products") {
              return (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === "/"}
                  className={({ isActive }) => cn(
                    "text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors",
                    isActive ? "text-primary" : "text-foreground/80 hover:text-foreground",
                  )}
                >
                  {link.label}
                </NavLink>
              );
            }

            return (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => setCollectionsOpen(true)}
                onMouseLeave={() => setCollectionsOpen(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCollectionsOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setCollectionsOpen(false);
                    (event.currentTarget.querySelector("button") as HTMLButtonElement | null)?.focus();
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  <NavLink
                    to={link.href}
                    className={({ isActive }) => cn(
                      "text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors",
                      isActive ? "text-primary" : "text-foreground/80 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => setCollectionsOpen((value) => !value)}
                    aria-label="Open collections menu"
                    aria-expanded={collectionsOpen}
                    aria-haspopup="menu"
                    aria-controls="desktop-collections-menu"
                    className="inline-flex min-h-11 min-w-8 items-center justify-center text-foreground/70 transition-colors hover:text-primary"
                  >
                    <ChevronDown size={12} className={cn("transition-transform", collectionsOpen && "rotate-180")} />
                  </button>
                </div>

                {collectionsOpen && (
                  <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3 animate-fade-in">
                    <div
                      id="desktop-collections-menu"
                      role="menu"
                      className="min-w-[390px] border border-border/60 bg-background p-2 shadow-elegant"
                    >
                      <NavLink
                        to="/products"
                        role="menuitem"
                        className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary hover:bg-card"
                      >
                        <span>All collections</span>
                        <span aria-hidden="true">→</span>
                      </NavLink>
                      {collectionCategories.map((category) => (
                        <NavLink
                          key={category.slug}
                          to={\`/products/\${category.slug}\`}
                          role="menuitem"
                          className={({ isActive }) => cn(
                            "flex items-center justify-between gap-5 px-4 py-3 text-sm transition-colors hover:bg-card hover:text-primary",
                            isActive ? "text-primary" : "text-foreground/78",
                          )}
                        >
                          <span>{category.name}</span>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            {category.productCount} products
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}`,
);
replaceOnce(
  navbarPath,
  `          {[...mainLinks, ...moreLinks, ...tailLinks].map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === "/"}
              className={({ isActive }) => cn(
                "min-h-11 inline-flex items-center text-sm uppercase tracking-[0.22em]",
                isActive ? "text-primary" : "text-foreground/80",
              )}
            >
              {link.label}
            </NavLink>
          ))}`,
  `          {mainLinks.map((link) => (
            <div key={link.href} className="flex flex-col">
              <NavLink
                to={link.href}
                end={link.href === "/"}
                className={({ isActive }) => cn(
                  "min-h-11 inline-flex items-center text-sm uppercase tracking-[0.22em]",
                  isActive ? "text-primary" : "text-foreground/80",
                )}
              >
                {link.label}
              </NavLink>
              {link.href === "/products" && collectionCategories.length > 0 && (
                <div className="ml-3 flex flex-col border-l border-border/60 pl-4">
                  {collectionCategories.map((category) => (
                    <NavLink
                      key={category.slug}
                      to={\`/products/\${category.slug}\`}
                      className={({ isActive }) => cn(
                        "min-h-10 inline-flex items-center justify-between gap-4 py-2 text-xs",
                        isActive ? "text-primary" : "text-foreground/65",
                      )}
                    >
                      <span>{category.name}</span>
                      <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        {category.productCount}
                      </span>
                    </NavLink>
                  ))}
                  <NavLink
                    to="/products/all"
                    className="min-h-10 inline-flex items-center py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
                  >
                    Search all products
                  </NavLink>
                </div>
              )}
            </div>
          ))}
          {[...moreLinks, ...tailLinks].map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) => cn(
                "min-h-11 inline-flex items-center text-sm uppercase tracking-[0.22em]",
                isActive ? "text-primary" : "text-foreground/80",
              )}
            >
              {link.label}
            </NavLink>
          ))}`,
);

const categoryPath = "src/pages/CategoryTaxonomyPage.tsx";
replaceOnce(
  categoryPath,
  'import { ArrowRight, ChevronRight, Globe2, MessageCircle } from "lucide-react";',
  'import { ArrowRight, ChevronRight, FileText, Globe2, MessageCircle } from "lucide-react";',
);
replaceOnce(
  categoryPath,
  '  const heroLabel = collectionName ?? audienceName ?? topName;\n  const heroProducts = collection',
  '  const heroLabel = collectionName ?? audienceName ?? topName;\n  const quoteHref = `/inquiry?intent=rfq&category=${encodeURIComponent(category.slug)}&utm_source=category-page&utm_content=${encodeURIComponent(collection?.slug ?? audience?.slug ?? "category")}`;\n  const heroProducts = collection',
);
replaceOnce(
  categoryPath,
  `              <a
                href={whatsappLink(\`Hello Irha Apparels — I need a B2B quote for \${collection?.name ?? audience?.name ?? category.name}.\`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.25em]"
              >
                <MessageCircle size={15} aria-hidden="true" /> {ui.requestQuote}
              </a>`,
  `              <Link
                to={quoteHref}
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.25em]"
              >
                <FileText size={15} aria-hidden="true" /> {ui.requestQuote}
              </Link>
              <a
                href={whatsappLink(\`Hello Irha Apparels — I need a B2B quote for \${collection?.name ?? audience?.name ?? category.name}.\`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 border border-border/60 bg-background/70 px-6 py-4 text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <MessageCircle size={15} aria-hidden="true" /> WhatsApp
              </a>`,
);

const inquiryPath = "src/pages/Inquiry.tsx";
replaceOnce(
  inquiryPath,
  `  const initialIntent: InquiryIntent = isValidIntent(params.get("intent")) ? (params.get("intent") as InquiryIntent) : "rfq";
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Omit<InquiryDraft, "v" | "updatedAt">>(() => ({
    step: 1,`,
  `  const explicitIntent: InquiryIntent | null = isValidIntent(params.get("intent"))
    ? (params.get("intent") as InquiryIntent)
    : null;
  const initialIntent: InquiryIntent = explicitIntent ?? "rfq";
  const initialStep: Step = explicitIntent ? 2 : 1;
  const [step, setStep] = useState<Step>(initialStep);
  const [draft, setDraft] = useState<Omit<InquiryDraft, "v" | "updatedAt">>(() => ({
    step: initialStep,`,
);
replaceOnce(
  inquiryPath,
  '        productContext: urlContext.productSlug || urlContext.shortlistSlugs || urlContext.compareSlugs ? urlContext : d.productContext,',
  '        productContext: urlContext.productSlug || urlContext.categorySlug || urlContext.shortlistSlugs || urlContext.compareSlugs ? urlContext : d.productContext,',
);
replaceOnce(
  inquiryPath,
  '      setStep((d.step as Step) || 1);\n      setRestored(true);',
  `      const restoredStep = (d.step as Step) || initialStep;
      const intentChanged = Boolean(explicitIntent && d.intent !== explicitIntent);
      setStep(intentChanged ? 2 : explicitIntent && restoredStep < 2 ? 2 : restoredStep);
      setRestored(true);`,
);
replaceOnce(
  inquiryPath,
  'onClick={() => { clearDraft(); setDraft({ step: 1, intent: initialIntent, files: [], productContext: urlContext }); setStep(1); setRestored(false); }}',
  'onClick={() => { clearDraft(); setDraft({ step: initialStep, intent: initialIntent, files: [], productContext: urlContext }); setStep(initialStep); setRestored(false); }}',
);

writeFileSync(
  "src/lib/__checks__/homeNavigationConversion.test.ts",
  `import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("homepage navigation and B2B conversion journey", () => {
  it("exposes buyer-facing collection categories on desktop and mobile navigation", () => {
    const navbar = read("src/components/layout/Navbar.tsx");
    expect(navbar).toContain('usePublicCatalogTree');
    expect(navbar).toContain('aria-controls="desktop-collections-menu"');
    expect(navbar).toContain('to={\`/products/\${category.slug}\`}');
    expect(navbar).toContain('Search all products');
    expect(navbar).toContain('category.productCount');
  });

  it("routes category quote actions into the structured inquiry while keeping WhatsApp optional", () => {
    const category = read("src/pages/CategoryTaxonomyPage.tsx");
    expect(category).toContain('const quoteHref = `/inquiry?intent=rfq&category=');
    expect(category).toContain('to={quoteHref}');
    expect(category).toContain('<FileText size={15}');
    expect(category).toContain('whatsappLink');
    expect(category).toContain('> WhatsApp');
  });

  it("skips the redundant intent screen only when the incoming CTA already supplied a valid intent", () => {
    const inquiry = read("src/pages/Inquiry.tsx");
    expect(inquiry).toContain('const explicitIntent: InquiryIntent | null');
    expect(inquiry).toContain('const initialStep: Step = explicitIntent ? 2 : 1;');
    expect(inquiry).toContain('useState<Step>(initialStep)');
    expect(inquiry).toContain('step: initialStep');
    expect(inquiry).toContain('urlContext.categorySlug');
    expect(inquiry).toContain('intentChanged ? 2');
    expect(inquiry).toContain('setStep(initialStep)');
  });

  it("keeps the homepage primary and final calls to action on the structured RFQ route", () => {
    const hero = read("src/components/HeroCarousel.tsx");
    const finalCta = read("src/components/sections/StartProgramCTA.tsx");
    expect(hero).toContain('to="/inquiry?intent=rfq"');
    expect(finalCta).toContain('to="/inquiry?intent=rfq"');
    expect(finalCta).toContain('Upload reference');
    expect(finalCta).toContain('Request catalogue');
  });
});
`,
);
