import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCatalog";
import { ExternalLink, Layers } from "lucide-react";

export default function MacroGatewayPanel() {
  const { data: categories = [], isLoading } = useCategories();
  const topLevel = categories
    .filter((category) => category.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">Public Catalog Architecture</p>
          <h2 className="font-display text-3xl">Canonical Category Overview</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            This view reflects the current database-backed top-level category structure. It no longer assumes a hard-coded two-hub or six-category homepage model.
          </p>
        </div>
        <a
          href="/products"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] border border-industrial/60 text-industrial px-4 py-2 hover:bg-industrial hover:text-industrial-foreground transition-colors"
        >
          View Live Collections <ExternalLink size={12} />
        </a>
      </div>

      {isLoading ? (
        <div className="border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">Loading category structure…</div>
      ) : topLevel.length === 0 ? (
        <div className="border border-dashed border-border/60 p-6 text-sm text-muted-foreground">No top-level categories found.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {topLevel.map((category) => {
            const childCount = categories.filter((item) => item.parent_id === category.id).length;
            return (
              <div
                key={category.id}
                className="border border-border/60 bg-card/40 p-6 flex flex-col justify-between hover:border-industrial/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-industrial" />
                      <span className="text-[10px] uppercase tracking-[0.25em] text-industrial">Top-level category</span>
                    </div>
                    <span className={`text-[10px] uppercase tracking-[0.2em] ${category.is_published ? "text-industrial" : "text-amber-500"}`}>
                      {category.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl">{category.name}</h3>
                  <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{category.description || "No category description yet."}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="border border-border/60 px-2.5 py-1">{childCount} sub-categories</span>
                    <span className="border border-border/60 px-2.5 py-1">/{category.slug}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60">
                  {category.is_published ? (
                    <Link
                      to={`/products/${category.slug}`}
                      className="text-xs text-industrial inline-flex items-center gap-2 hover:underline"
                    >
                      View live category <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not visible on the public site until published.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}