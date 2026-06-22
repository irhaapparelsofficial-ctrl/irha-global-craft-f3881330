import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCatalog";
import { MACRO_CATEGORIES } from "@/lib/fobCalculator";
import { ArrowRight, Layers } from "lucide-react";

export default function MacroGatewayPanel() {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">Public Homepage Architecture</p>
          <h2 className="font-display text-3xl">Two-Macro Production Gateways</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            The public site groups all 6 categories into 2 macro hubs. Edit child categories from the
            <Link to="#" className="text-industrial mx-1">Catalog</Link>tab.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] uppercase tracking-[0.25em] border border-industrial/60 text-industrial px-4 py-2 hover:bg-industrial hover:text-industrial-foreground transition-colors"
        >
          View Live Homepage ↗
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {MACRO_CATEGORIES.map((macro) => {
          const children = categories.filter((c) => macro.childSlugs.includes(c.slug as never));
          return (
            <div
              key={macro.id}
              className="border border-border/60 bg-card/40 p-6 flex flex-col justify-between hover:border-industrial/60 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} className="text-industrial" />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-industrial">Macro Hub</span>
                </div>
                <h3 className="font-display text-2xl">{macro.title}</h3>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{macro.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {isLoading ? (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  ) : children.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No matching categories</span>
                  ) : (
                    children.map((c) => (
                      <Link
                        key={c.id}
                        to={`/products/${c.slug}`}
                        className="text-[10px] uppercase tracking-[0.2em] border border-border/60 px-2.5 py-1 hover:border-industrial hover:text-industrial"
                      >
                        {c.name}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
                <code className="text-[10px] text-muted-foreground font-mono">/products/{macro.id}</code>
                <span className="text-xs text-industrial inline-flex items-center gap-1">
                  Preview <ArrowRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
