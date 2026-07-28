import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ResilientImage from "@/components/ResilientImage";
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

type PublicCatalogRouteRow = {
  product_id: string;
  product_slug: string;
  product_name: string;
  canonical_path: string;
  main_category_slug: string;
  main_category_name: string;
  audience_slug: string;
  audience_name: string;
  product_type_slug: string;
  product_type_name: string;
  image_url: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  canonical_path: string;
  main_category_slug: string;
  main_category_name: string;
  audience_slug: string;
  audience_name: string;
  product_type_slug: string;
  product_type_name: string;
  collectionKey: string;
};

type PublicRpcClient = {
  rpc: (
    functionName: "get_public_catalog_route_manifest",
    args?: Record<string, never>,
  ) => Promise<{
    data: PublicCatalogRouteRow[] | null;
    error: { message: string } | null;
  }>;
};

const MOCKUP_SESSION_KEY = "irha:mockup-rate-session";
const MOCKUP_RATE_TOKEN_KEY = "irha:mockup-rate-token";
const MOCKUP_RESULT_CACHE_KEY = "irha:mockup-last-result";

function readMockupSessionId() {
  try {
    const stored = sessionStorage.getItem(MOCKUP_SESSION_KEY);
    if (stored) return stored;
    const created = `mockup-${crypto.randomUUID()}`;
    sessionStorage.setItem(MOCKUP_SESSION_KEY, created);
    return created;
  } catch {
    return `mockup-${crypto.randomUUID()}`;
  }
}

async function mockupFingerprint(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCachedMockup(fingerprint: string) {
  try {
    const raw = sessionStorage.getItem(MOCKUP_RESULT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      fingerprint?: string;
      result?: { frontUrl: string; backUrl: string; fallback?: boolean; message?: string };
    };
    return cached.fingerprint === fingerprint && cached.result?.frontUrl && cached.result?.backUrl
      ? cached.result
      : null;
  } catch {
    return null;
  }
}

function writeCachedMockup(fingerprint: string, result: { frontUrl: string; backUrl: string; fallback?: boolean; message?: string }) {
  try {
    const serialized = JSON.stringify({ fingerprint, result });
    if (serialized.length <= 2_000_000) sessionStorage.setItem(MOCKUP_RESULT_CACHE_KEY, serialized);
  } catch {
    // Cache is optional; server-side controls remain authoritative.
  }
}

function classifyHub(mainCategorySlug: string): HubId | null {
  if (HUBS.bavarian.categorySlugPrefixes.includes(mainCategorySlug)) return "bavarian";
  if (HUBS.textile.categorySlugPrefixes.includes(mainCategorySlug)) return "textile";
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
  const mockupSessionIdRef = useRef(readMockupSessionId());

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["studio-products", "canonical-route-manifest"],
    queryFn: async (): Promise<ProductRow[]> => {
      const publicRpc = supabase as unknown as PublicRpcClient;
      const { data, error } = await publicRpc.rpc("get_public_catalog_route_manifest");
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.product_id,
        slug: row.product_slug,
        name: row.product_name,
        image_url: row.image_url,
        canonical_path: row.canonical_path,
        main_category_slug: row.main_category_slug,
        main_category_name: row.main_category_name,
        audience_slug: row.audience_slug,
        audience_name: row.audience_name,
        product_type_slug: row.product_type_slug,
        product_type_name: row.product_type_name,
        collectionKey: `${row.audience_slug}/${row.product_type_slug}`,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const hubProducts = useMemo(
    () => products.filter((item) => classifyHub(item.main_category_slug) === hub),
    [products, hub],
  );

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    hubProducts.forEach((item) => {
      map.set(item.collectionKey, `${item.audience_name} · ${item.product_type_name}`);
    });
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [hubProducts]);

  const visible = useMemo(
    () => (activeCat === "all" ? hubProducts : hubProducts.filter((item) => item.collectionKey === activeCat)),
    [hubProducts, activeCat],
  );

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
      const designInput = {
        productId: product.id,
        productName: product.name,
        color: { label: color.label, hex: color.hex },
        placement: placement.id,
        presetId: preset.id,
        presetLabel: preset.label,
        logoBase64: logo?.dataUrl ?? null,
      };
      const fingerprint = await mockupFingerprint(designInput);
      const cached = readCachedMockup(fingerprint);
      if (cached) {
        setResult(cached);
        return;
      }
      let rateLimitToken: string | null = null;
      try { rateLimitToken = sessionStorage.getItem(MOCKUP_RATE_TOKEN_KEY); } catch { /* bootstrap */ }
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: {
          ...designInput,
          clientSessionId: mockupSessionIdRef.current,
          rateLimitToken,
        },
      });
      if (error) throw error;
      if (!data?.frontUrl || !data?.backUrl) throw new Error("Mockup generation failed");
      if (typeof data.rateLimitToken === "string" && data.rateLimitToken.length <= 2_000) {
        try { sessionStorage.setItem(MOCKUP_RATE_TOKEN_KEY, data.rateLimitToken); } catch { /* optional */ }
      }
      const generated = { frontUrl: data.frontUrl, backUrl: data.backUrl, fallback: !!data.fallback, message: data.message };
      writeCachedMockup(fingerprint, generated);
      setResult(generated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed — please retry");
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
    logo: true,
    preset: !!preset,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      <Helmet>
        <title>B2B Custom Lab — Visual Requirement Builder | Irha Apparels</title>
        <meta
          name="description"
          content="Build a non-binding visual direction from the published Irha Apparels catalogue. Upload a logo and select preferred colors, placement and decoration before submitting a B2B requirement review."
        />
        <link rel="canonical" href="https://irhaapparels.com/studio" />
      </Helmet>

      <div className="sticky top-20 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">B2B Custom Lab · Published Product References</p>
            <h1 className="font-serif text-xl md:text-2xl leading-tight">Build a Visual Requirement Direction</h1>
          </div>
          <div className="inline-flex border border-border rounded-full p-1 bg-card/40 self-start md:self-auto">
            {(Object.keys(HUBS) as HubId[]).map((item) => (
              <button
                key={item}
                onClick={() => setHub(item)}
                className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.2em] transition ${
                  hub === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {HUBS[item].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-primary mb-6">
          <Sparkles className="h-3 w-3" /> Requirements Reviewed Before Quotation
        </div>

        <ol className="flex flex-wrap gap-2 mb-8 text-[10px] uppercase tracking-[0.2em]">
          {[
            { k: "product", n: 1, label: "Product" },
            { k: "color", n: 2, label: "Color" },
            { k: "logo", n: 3, label: "Logo" },
            { k: "preset", n: 4, label: "Pattern" },
          ].map((step) => (
            <li
              key={step.k}
              className={`flex items-center gap-2 px-3 py-1.5 border ${
                stepDone[step.k as keyof typeof stepDone]
                  ? "border-primary/60 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              <span className="font-mono">{step.n}</span> {step.label}
              {stepDone[step.k as keyof typeof stepDone] && <Check className="h-3 w-3" />}
            </li>
          ))}
        </ol>

        <section className="mb-10">
          <h2 className="font-serif text-lg md:text-xl mb-3">1. Choose your product</h2>
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            Showing approved, published products from the same canonical catalogue used by product pages and search.
          </p>
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
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setActiveCat(category.key)}
                  className={`px-3 py-1 text-[10px] uppercase tracking-[0.2em] border ${
                    activeCat === category.key ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading published catalogue…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {visible.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setProduct(item); setResult(null); }}
                  className={`group relative aspect-[3/4] overflow-hidden border-2 transition ${
                    product?.id === item.id ? "border-primary" : "border-border/60 hover:border-foreground/40"
                  }`}
                >
                  <ResilientImage
                    sources={[item.image_url]}
                    alt={`${item.name} product reference`}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={853}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                    <p className="text-[10px] text-white line-clamp-2">{item.name}</p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/65">{item.audience_name} · {item.product_type_name}</p>
                  </div>
                  {product?.id === item.id && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={`mb-10 ${!product ? "opacity-40 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-lg md:text-xl mb-3">2. Select a preferred base color</h2>
          <div className="flex flex-wrap gap-3">
            {swatches.map((swatch) => (
              <button
                key={swatch.id}
                onClick={() => { setColor(swatch); setResult(null); }}
                className={`flex items-center gap-3 px-3 py-2 border-2 ${
                  color?.id === swatch.id ? "border-primary" : "border-border/60 hover:border-foreground/40"
                }`}
              >
                <span className="h-6 w-6 rounded-full border border-border/60" style={{ background: swatch.hex }} />
                <span className="text-xs uppercase tracking-[0.15em]">{swatch.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={`mb-10 ${!color ? "opacity-40 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-lg md:text-xl mb-3">3. Upload logo & choose placement <span className="text-xs text-muted-foreground">(optional)</span></h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(event) => event.target.files?.[0] && handleLogo(event.target.files[0])}
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
              {PLACEMENTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setPlacement(item); setResult(null); }}
                  className={`px-4 py-3 border text-left text-xs uppercase tracking-[0.15em] ${
                    placement.id === item.id ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={`mb-10 ${!color ? "opacity-40 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-lg md:text-xl mb-3">4. Choose a decoration direction</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {presets.map((item) => (
              <button
                key={item.id}
                onClick={() => { setPreset(item); setResult(null); }}
                className={`p-4 border-2 text-left ${
                  preset?.id === item.id ? "border-primary" : "border-border/60 hover:border-foreground/40"
                }`}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{item.description}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="border-t border-border/60 pt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-xs text-muted-foreground">
            Concept preview only — non-binding. Materials, specifications, quantity, pricing, production timing and delivery are confirmed only after requirement review and written quotation.
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

        {(generating || result) && (
          <section className="mt-10">
            <h2 className="font-serif text-lg md:text-xl mb-4">Your Concept Preview</h2>
            {result?.fallback && (
              <div className="mb-4 border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs p-3">
                The customized preview was not available. The original product image is shown for reference. Retry generation or send the selected requirements to our team for manual review.
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {(["frontUrl", "backUrl"] as const).map((key, index) => (
                <div key={key} className="border border-border/60 bg-card/30">
                  <div className="aspect-[3/4] bg-muted/40 flex items-center justify-center overflow-hidden">
                    {result?.[key] ? (
                      <img src={result[key]} alt={index === 0 ? "Front concept view" : "Back concept view"} className="h-full w-full object-cover" />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{index === 0 ? "Front" : "Back"}</span>
                    {result?.[key] && (
                      <button
                        onClick={() => forceDownload(result[key], `irha-mockup-${product?.slug}-${index === 0 ? "front" : "back"}.png`)}
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
                  <MessageCircle className="h-4 w-4" /> Send Requirements to WhatsApp
                </a>
                <span className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-3 text-[10px] uppercase tracking-[0.25em] text-primary">
                  <Sparkles className="h-3 w-3" /> Reference Visualization · Review Before Quote
                </span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
