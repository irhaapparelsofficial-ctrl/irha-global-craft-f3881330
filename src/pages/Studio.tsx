import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  COLORS_BY_HUB,
  HUBS,
  PLACEMENTS,
  PRESETS_BY_HUB,
  buildWhatsAppLink,
  type ColorSwatch,
  type HubId,
  type Placement,
  type Preset,
} from "@/lib/customLab";
import { forceDownload } from "@/lib/download";
import { Loader2, Upload, Check, MessageCircle, Download, Sparkles, RotateCcw } from "lucide-react";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  category_id: string;
  categories: { slug: string; name: string } | null;
};

function classifyHub(slug: string): HubId | null {
  if (HUBS.bavarian.categorySlugPrefixes.some((p) => slug.startsWith(p))) return "bavarian";
  if (HUBS.textile.categorySlugPrefixes.some((p) => slug.startsWith(p))) return "textile";
  return null;
}

export default function Studio() {
  const [hub, setHub] = useState<HubId>("bavarian");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [color, setColor] = useState<ColorSwatch | null>(null);
  const [placement, setPlacement] = useState<Placement>(PLACEMENTS[0]);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [logo, setLogo] = useState<{ name: string; dataUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ frontUrl: string; backUrl: string; fallback?: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["studio-products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, image_url, category_id, categories!inner(slug, name)")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

  const hubProducts = useMemo(
    () => products.filter((p) => p.categories && classifyHub(p.categories.slug) === hub),
    [products, hub],
  );

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    hubProducts.forEach((p) => {
      if (p.categories) map.set(p.categories.slug, p.categories.name);
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [hubProducts]);

  const visible = useMemo(
    () => (activeCat === "all" ? hubProducts : hubProducts.filter((p) => p.categories?.slug === activeCat)),
    [hubProducts, activeCat],
  );

  // Reset downstream when hub changes
  useEffect(() => {
    setActiveCat("all");
    setProduct(null);
    setColor(null);
    setPreset(null);
    setResult(null);
  }, [hub]);

  const swatches = COLORS_BY_HUB[hub];
  const presets = PRESETS_BY_HUB[hub];
  const canGenerate = !!product && !!color && !!preset;

  async function handleLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo({ name: file.name, dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!canGenerate || !product || !color || !preset) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: {
          productId: product.id,
          productName: product.name,
          color: { label: color.label, hex: color.hex },
          placement: placement.id,
          presetId: preset.id,
          presetLabel: preset.label,
          logoBase64: logo?.dataUrl ?? null,
        },
      });
      if (error) throw error;
      if (!data?.frontUrl || !data?.backUrl) throw new Error("Mockup generation failed");
      setResult({ frontUrl: data.frontUrl, backUrl: data.backUrl, fallback: !!data.fallback, message: data.message });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed — please retry");
    } finally {
      setGenerating(false);
    }
  }

  function reset() {
    setProduct(null);
    setColor(null);
    setPreset(null);
    setLogo(null);
    setResult(null);
    setError(null);
  }

  const stepDone = {
    product: !!product,
    color: !!color,
    logo: true, // optional
    preset: !!preset,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">

      <Helmet>
        <title>B2B Custom Lab — Design Your Apparel | IRHA Apparels</title>
        <meta
          name="description"
          content="Design custom Bavarian, leather, sportswear & streetwear in 4 clicks. Upload your logo, pick a color, get a realistic front + back mockup. Flexible MOQ. FOB Sialkot."
        />
        <link rel="canonical" href="https://irhaapparels.com/studio" />
      </Helmet>

      {/* Header + hub toggle (sticky) */}
      <div className="sticky top-20 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">B2B Custom Lab · Sialkot Factory Direct</p>
            <h1 className="font-serif text-xl md:text-2xl leading-tight">Design Your Production Run</h1>
          </div>
          <div className="inline-flex border border-border rounded-full p-1 bg-card/40 self-start md:self-auto">
            {(Object.keys(HUBS) as HubId[]).map((h) => (
              <button
                key={h}
                onClick={() => setHub(h)}
                className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.2em] transition ${
                  hub === h ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {HUBS[h].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        {/* MOQ badge */}
        <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-primary mb-6">
          <Sparkles className="h-3 w-3" /> Flexible MOQ — Request FOB Quote
        </div>

        {/* Step rail */}
        <ol className="flex flex-wrap gap-2 mb-8 text-[10px] uppercase tracking-[0.2em]">
          {[
            { k: "product", n: 1, label: "Product" },
            { k: "color", n: 2, label: "Color" },
            { k: "logo", n: 3, label: "Logo" },
            { k: "preset", n: 4, label: "Pattern" },
          ].map((s) => (
            <li
              key={s.k}
              className={`flex items-center gap-2 px-3 py-1.5 border ${
                stepDone[s.k as keyof typeof stepDone]
                  ? "border-primary/60 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              <span className="font-mono">{s.n}</span> {s.label}
              {stepDone[s.k as keyof typeof stepDone] && <Check className="h-3 w-3" />}
            </li>
          ))}
        </ol>

        {/* STEP 1 — Product */}
        <section className="mb-10">
          <h2 className="font-serif text-lg md:text-xl mb-3">1. Choose your product</h2>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setActiveCat("all")}
                className={`px-3 py-1 text-[10px] uppercase tracking-[0.2em] border ${
                  activeCat === "all" ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({hubProducts.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setActiveCat(c.slug)}
                  className={`px-3 py-1 text-[10px] uppercase tracking-[0.2em] border ${
                    activeCat === c.slug ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading catalog…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {visible.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProduct(p); setResult(null); }}
                  className={`group relative aspect-[3/4] overflow-hidden border-2 transition ${
                    product?.id === p.id ? "border-primary" : "border-border/60 hover:border-foreground/40"
                  }`}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-[10px] text-white line-clamp-2">{p.name}</p>
                  </div>
                  {product?.id === p.id && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* STEP 2 — Color */}
        <section className={`mb-10 ${!product ? "opacity-40 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-lg md:text-xl mb-3">2. Pick a factory-approved base color</h2>
          <div className="flex flex-wrap gap-3">
            {swatches.map((s) => (
              <button
                key={s.id}
                onClick={() => { setColor(s); setResult(null); }}
                className={`flex items-center gap-3 px-3 py-2 border-2 ${
                  color?.id === s.id ? "border-primary" : "border-border/60 hover:border-foreground/40"
                }`}
              >
                <span className="h-6 w-6 rounded-full border border-border/60" style={{ background: s.hex }} />
                <span className="text-xs uppercase tracking-[0.15em]">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* STEP 3 — Logo + Placement */}
        <section className={`mb-10 ${!color ? "opacity-40 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-lg md:text-xl mb-3">3. Upload logo & choose placement <span className="text-xs text-muted-foreground">(optional)</span></h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border/60 hover:border-primary/60 p-6 flex flex-col items-center gap-2 transition"
              >
                {logo ? (
                  <>
                    <img src={logo.dataUrl} alt={logo.name} className="h-16 object-contain" />
                    <span className="text-xs text-muted-foreground">{logo.name} · click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">PNG / SVG / JPG · max 2MB</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Placement</p>
              {PLACEMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlacement(p); setResult(null); }}
                  className={`px-4 py-3 border text-left text-xs uppercase tracking-[0.15em] ${
                    placement.id === p.id ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* STEP 4 — Preset */}
        <section className={`mb-10 ${!color ? "opacity-40 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-lg md:text-xl mb-3">4. Choose an embroidery / print pattern</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPreset(p); setResult(null); }}
                className={`p-4 border-2 text-left ${
                  preset?.id === p.id ? "border-primary" : "border-border/60 hover:border-foreground/40"
                }`}
              >
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Generate */}
        <div className="border-t border-border/60 pt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-xs text-muted-foreground">
            Concept preview only — non-binding. Final specs, MOQ and pricing are confirmed after our team reviews your requirements.
          </div>
          <div className="flex gap-2">
            {(product || result) && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 border border-border/60 px-4 py-3 text-[11px] uppercase tracking-[0.2em] hover:bg-card/40"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
            <button
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-[11px] uppercase tracking-[0.3em] font-bold disabled:opacity-40"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate Mockup"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 border border-destructive/60 bg-destructive/10 text-destructive text-xs p-3">
            {error}
          </div>
        )}

        {/* Result */}
        {(generating || result) && (
          <section className="mt-10">
            <h2 className="font-serif text-lg md:text-xl mb-4">Your Mockup</h2>
            {result?.fallback && (
              <div className="mb-4 border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs p-3">
                ⚠️ AI preview is regenerating in the background — the image below is the original product while the customized mockup finishes rendering. Click <b>Generate</b> again in ~30s to fetch the finished mockup.
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {(["frontUrl", "backUrl"] as const).map((k, i) => (
                <div key={k} className="border border-border/60 bg-card/30">
                  <div className="aspect-[3/4] bg-muted/40 flex items-center justify-center overflow-hidden">
                    {result?.[k] ? (
                      <img src={result[k]} alt={i === 0 ? "Front view" : "Back view"} className="h-full w-full object-cover" />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{i === 0 ? "Front" : "Back"}</span>
                    {result?.[k] && (
                      <button
                        onClick={() => forceDownload(result[k], `irha-mockup-${product?.slug}-${i === 0 ? "front" : "back"}.png`)}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] hover:text-primary"
                      >
                        <Download className="h-3 w-3" /> PNG
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {result && product && color && preset && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={buildWhatsAppLink({
                    productName: product.name,
                    color: color.label,
                    placement: placement.label,
                    preset: preset.label,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 text-[11px] uppercase tracking-[0.3em] font-bold hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" /> Send to WhatsApp
                </a>
                <span className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-3 text-[10px] uppercase tracking-[0.25em] text-primary">
                  <Sparkles className="h-3 w-3" /> Flexible MOQ — Request FOB Quote
                </span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
