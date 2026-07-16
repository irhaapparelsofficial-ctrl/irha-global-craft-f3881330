import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  ExternalLink,
  ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  auditProductUrls,
  nextAvailableProductSlug,
  productPublicUrl,
  PRODUCT_MEDIA_ALLOWED_TYPES,
  PRODUCT_MEDIA_MAX_BYTES,
  PRODUCT_MEDIA_MAX_FILES,
  rollbackUploadedProductMedia,
  slugifyProductName,
  uploadProductImages,
  type CategoryRef,
  type UploadedProductMedia,
} from "@/lib/productPublishing";

type Category = CategoryRef & {
  name: string;
  is_published: boolean;
};

type Product = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  image_url: string | null;
  gallery: string[];
  specs: string[];
  material_specifications: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  moq_display: string | null;
  sample_timeline: string | null;
  production_timeline: string | null;
  primary_material: string | null;
  fabric_composition: string | null;
  gsm: string | null;
  created_at: string;
  updated_at: string;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  state: "pending" | "optimizing" | "uploading" | "saved";
};

type Draft = {
  id?: string;
  category_id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  sku: string;
  image_url: string;
  galleryText: string;
  specsText: string;
  material_specifications: string;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  is_featured: boolean;
  moq_display: string;
  sample_timeline: string;
  production_timeline: string;
  primary_material: string;
  fabric_composition: string;
  gsm: string;
  pendingImages: PendingImage[];
};

type SaveMode = "draft" | "publish";

const emptyDraft = (categoryId = ""): Draft => ({
  category_id: categoryId,
  slug: "",
  name: "",
  description: "",
  short_description: "",
  sku: "",
  image_url: "",
  galleryText: "",
  specsText: "",
  material_specifications: "",
  seo_title: "",
  seo_description: "",
  sort_order: 0,
  is_featured: false,
  moq_display: "",
  sample_timeline: "",
  production_timeline: "",
  primary_material: "",
  fabric_composition: "",
  gsm: "",
  pendingImages: [],
});

const toDraft = (product: Product): Draft => ({
  id: product.id,
  category_id: product.category_id,
  slug: product.slug,
  name: product.name,
  description: product.description ?? "",
  short_description: product.short_description ?? "",
  sku: product.sku ?? "",
  image_url: product.image_url ?? "",
  galleryText: (product.gallery ?? []).join("\n"),
  specsText: (product.specs ?? []).join("\n"),
  material_specifications: product.material_specifications ?? "",
  seo_title: product.seo_title ?? "",
  seo_description: product.seo_description ?? "",
  sort_order: product.sort_order ?? 0,
  is_featured: product.is_featured,
  moq_display: product.moq_display ?? "",
  sample_timeline: product.sample_timeline ?? "",
  production_timeline: product.production_timeline ?? "",
  primary_material: product.primary_material ?? "",
  fabric_composition: product.fabric_composition ?? "",
  gsm: product.gsm ?? "",
  pendingImages: [],
});

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function releasePreviews(images: PendingImage[]) {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
}

export default function ProductsPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const subcategories = useMemo(() => categories.filter((category) => category.parent_id !== null), [categories]);
  const parentCategories = useMemo(
    () => categories.filter((category) => category.parent_id === null && category.is_published),
    [categories],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    const [categoryResult, productResult] = await Promise.all([
      supabase.from("categories").select("id,name,slug,parent_id,is_published").order("sort_order"),
      supabase.from("products").select("*").order("sort_order", { ascending: true }).limit(500),
    ]);
    if (categoryResult.error || productResult.error) {
      setError(categoryResult.error?.message ?? productResult.error?.message ?? "Could not load products");
    }
    setCategories((categoryResult.data as Category[]) ?? []);
    setProducts((productResult.data as unknown as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter !== "all" && product.category_id !== categoryFilter) return false;
      if (statusFilter === "published" && !product.is_published) return false;
      if (statusFilter === "draft" && product.is_published) return false;
      if (!needle) return true;
      return [product.name, product.slug, product.sku, product.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [products, query, categoryFilter, statusFilter]);

  const closeEditor = () => {
    if (editing) releasePreviews(editing.pendingImages);
    setEditing(null);
  };

  const openNew = () => {
    if (subcategories.length === 0) {
      toast({ title: "Create a subcategory first", variant: "destructive" });
      return;
    }
    setEditing(emptyDraft(subcategories[0].id));
  };

  const auditUrls = () => {
    const result = auditProductUrls(products, categories);
    toast({
      title: result.complete === result.total ? "All product URLs are complete" : "Product URL audit complete",
      description: `${result.total} checked · ${result.missingProductUrl} missing product URL · ${result.missingCoverUrl} missing cover · ${result.missingGalleryUrl} missing gallery`,
      variant: result.complete === result.total ? "default" : "destructive",
    });
  };

  const save = async (mode: SaveMode) => {
    if (!editing || saving) return;
    const draft = editing;
    const selectedCategory = categoryMap.get(draft.category_id);
    if (!draft.name.trim() || !selectedCategory || selectedCategory.parent_id === null) {
      toast({ title: "Name and subcategory are required", variant: "destructive" });
      return;
    }

    const existingGallery = lines(draft.galleryText);
    const hasMedia = Boolean(draft.image_url.trim() || existingGallery.length || draft.pendingImages.length);
    if (mode === "publish" && !hasMedia) {
      toast({ title: "Add at least one product image before publishing", variant: "destructive" });
      return;
    }

    setSaving(true);
    let uploaded: UploadedProductMedia[] = [];
    let productWriteCompleted = false;
    try {
      const { data: slugRows, error: slugError } = await supabase
        .from("products")
        .select("id,category_id,slug")
        .eq("category_id", draft.category_id);
      if (slugError) throw slugError;

      const slug = nextAvailableProductSlug(
        draft.slug,
        draft.name,
        draft.category_id,
        (slugRows ?? []) as { id: string; category_id: string; slug: string }[],
        draft.id,
      );

      uploaded = await uploadProductImages(
        supabase,
        draft.pendingImages.map((item) => item.file),
        slug,
        (index, state) => {
          setEditing((current) => current ? {
            ...current,
            pendingImages: current.pendingImages.map((item, itemIndex) => itemIndex === index ? { ...item, state } : item),
          } : current);
        },
      );

      const uploadedUrls = uploaded.map((item) => item.publicUrl);
      const gallery = [...existingGallery, ...uploadedUrls];
      const coverUrl = draft.image_url.trim() || gallery[0] || null;
      const payload = {
        category_id: draft.category_id,
        slug,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        short_description: draft.short_description.trim() || null,
        sku: draft.sku.trim() || null,
        image_url: coverUrl,
        gallery,
        specs: lines(draft.specsText),
        material_specifications: draft.material_specifications.trim() || null,
        seo_title: draft.seo_title.trim() || null,
        seo_description: draft.seo_description.trim() || null,
        sort_order: Number(draft.sort_order) || 0,
        is_published: mode === "publish",
        is_featured: draft.is_featured,
        moq_display: draft.moq_display.trim() || null,
        sample_timeline: draft.sample_timeline.trim() || null,
        production_timeline: draft.production_timeline.trim() || null,
        primary_material: draft.primary_material.trim() || null,
        fabric_composition: draft.fabric_composition.trim() || null,
        gsm: draft.gsm.trim() || null,
      };

      let savedId = draft.id;
      if (draft.id) {
        const { error: updateError } = await supabase.from("products").update(payload).eq("id", draft.id);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase.from("products").insert(payload).select("id").single();
        if (insertError) throw insertError;
        savedId = inserted.id;
      }
      productWriteCompleted = true;

      const { data: verified, error: verifyError } = await supabase
        .from("products")
        .select("*")
        .eq("id", savedId!)
        .single();
      if (verifyError) throw new Error(`Product was written but verification failed: ${verifyError.message}`);

      const savedProduct = verified as unknown as Product;
      setProducts((current) => [...current.filter((product) => product.id !== savedProduct.id), savedProduct]);
      const liveUrl = productPublicUrl(categories, savedProduct.category_id, savedProduct.slug);
      window.dispatchEvent(new CustomEvent("catalog:updated", { detail: { productId: savedProduct.id } }));
      releasePreviews(draft.pendingImages);
      setEditing(null);
      toast({
        title: mode === "publish" ? "Product is live" : "Draft saved",
        description: mode === "publish" && liveUrl ? liveUrl : savedProduct.name,
      });
    } catch (saveError) {
      if (!productWriteCompleted && uploaded.length > 0) {
        await rollbackUploadedProductMedia(supabase, uploaded).catch(() => undefined);
      }
      toast({
        title: productWriteCompleted ? "Saved, but verification needs attention" : "Save failed",
        description: saveError instanceof Error ? saveError.message : String(saveError),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
    if (deleteError) {
      toast({ title: "Delete failed", description: deleteError.message, variant: "destructive" });
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== product.id));
    toast({ title: "Product deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, slug or product code…" className={`${inputClass} pl-9`} />
        </div>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={inputClass}>
          <option value="all">All categories</option>
          {parentCategories.map((parent) => (
            <optgroup key={parent.id} label={parent.name}>
              {subcategories.filter((child) => child.parent_id === parent.id).map((child) => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={inputClass}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <button type="button" onClick={() => void load()} className={secondaryButton}><RefreshCw size={13} /> Refresh</button>
        <button type="button" onClick={auditUrls} className={secondaryButton}><ClipboardCheck size={13} /> Audit URLs</button>
        <button type="button" onClick={openNew} className={primaryButton}><Plus size={14} /> New product</button>
      </div>

      <div className="text-xs text-muted-foreground">{loading ? "Loading…" : `${filtered.length} of ${products.length} products`}</div>
      {error && <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {!loading && filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/30 p-12 text-center">
          <ImageIcon className="mx-auto mb-3 text-muted-foreground" size={28} />
          <h3 className="font-display text-xl">No products found</h3>
        </div>
      ) : (
        <div className="border border-border/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Category</th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">Code</th>
                <th className="text-left py-3 px-4">URL health</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const category = categoryMap.get(product.category_id);
                const liveUrl = productPublicUrl(categories, product.category_id, product.slug);
                const mediaReady = Boolean(product.image_url && product.gallery?.length);
                return (
                  <tr key={product.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.image_url ? <img src={product.image_url} alt="" className="w-11 h-11 object-cover border border-border/40" loading="lazy" /> : <div className="w-11 h-11 border border-dashed border-border/50 flex items-center justify-center"><ImageIcon size={15} /></div>}
                        <div className="min-w-0">
                          <p className="truncate flex items-center gap-1.5">{product.name}{product.is_featured && <Star size={11} className="text-gold fill-gold" />}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-foreground/70">{category?.name ?? "—"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{product.sku ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] ${liveUrl && mediaReady ? "text-emerald-500" : "text-amber-500"}`}>
                        <CheckCircle2 size={12} /> {liveUrl && mediaReady ? `${product.gallery.length} images` : "Check URLs"}
                      </span>
                    </td>
                    <td className="py-3 px-4"><span className={product.is_published ? publishedBadge : draftBadge}>{product.is_published ? "Published" : "Draft"}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {liveUrl && <a href={liveUrl} target="_blank" rel="noreferrer" title="Open product" className={iconButton}><ExternalLink size={14} /></a>}
                        <button type="button" onClick={() => setEditing(toDraft(product))} title="Edit" className={iconButton}><Edit3 size={14} /></button>
                        <button type="button" onClick={() => void remove(product)} title="Delete" className={`${iconButton} text-destructive`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductEditor
          draft={editing}
          setDraft={setEditing}
          categories={categories}
          saving={saving}
          onCancel={closeEditor}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("publish")}
        />
      )}
    </div>
  );
}

function ProductEditor({
  draft,
  setDraft,
  categories,
  saving,
  onCancel,
  onSaveDraft,
  onPublish,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  categories: Category[];
  saving: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const selectedCategory = categories.find((category) => category.id === draft.category_id);
  const parentCategory = selectedCategory ? categories.find((category) => category.id === selectedCategory.parent_id) : null;
  const previewSlug = slugifyProductName(draft.slug) || slugifyProductName(draft.name) || "product";
  const liveUrl = productPublicUrl(categories, draft.category_id, previewSlug);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });

  useEffect(() => () => releasePreviews(draft.pendingImages), []);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const availableSlots = PRODUCT_MEDIA_MAX_FILES - draft.pendingImages.length;
    const accepted: PendingImage[] = [];
    for (const file of incoming.slice(0, Math.max(0, availableSlots))) {
      if (!PRODUCT_MEDIA_ALLOWED_TYPES.has(file.type)) {
        toast({ title: `${file.name}: use JPG, PNG or WebP`, variant: "destructive" });
        continue;
      }
      if (file.size > PRODUCT_MEDIA_MAX_BYTES) {
        toast({ title: `${file.name}: maximum size is 25 MB`, variant: "destructive" });
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), state: "pending" });
    }
    if (incoming.length > availableSlots) toast({ title: `Maximum ${PRODUCT_MEDIA_MAX_FILES} new images per save`, variant: "destructive" });
    set("pendingImages", [...draft.pendingImages, ...accepted]);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.pendingImages.length) return;
    const next = [...draft.pendingImages];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    set("pendingImages", next);
  };

  const removePending = (index: number) => {
    const target = draft.pendingImages[index];
    URL.revokeObjectURL(target.previewUrl);
    set("pendingImages", draft.pendingImages.filter((_, itemIndex) => itemIndex !== index));
  };

  const copyUrl = async () => {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    toast({ title: "Product URL copied" });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/85 backdrop-blur-sm p-3 md:p-8">
      <div className="mx-auto max-w-4xl bg-card border border-border/60 shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/60 bg-card/95 px-5 py-4">
          <div>
            <p className="eyebrow">{draft.id ? "Edit product" : "New product"}</p>
            <h2 className="font-display text-2xl mt-1">{draft.name || "Untitled product"}</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} className={iconButton}><X size={18} /></button>
        </div>

        <div className="p-5 md:p-7 space-y-8">
          <Section title="Product details">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Product name *"><input value={draft.name} onChange={(event) => set("name", event.target.value)} className={inputClass} /></Field>
              <Field label="Product code / SKU"><input value={draft.sku} onChange={(event) => set("sku", event.target.value)} placeholder="e.g. IA-LH-001" className={inputClass} /></Field>
              <Field label="Subcategory *">
                <select value={draft.category_id} onChange={(event) => set("category_id", event.target.value)} className={inputClass}>
                  {categories.filter((category) => category.parent_id === null && category.is_published).map((parent) => (
                    <optgroup key={parent.id} label={parent.name}>
                      {categories.filter((category) => category.parent_id === parent.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="URL slug" hint="Generated from name; duplicates get -2, -3 automatically"><input value={draft.slug} onChange={(event) => set("slug", event.target.value)} placeholder={previewSlug} className={inputClass} /></Field>
            </div>
            <Field label="Short description"><textarea rows={2} value={draft.short_description} onChange={(event) => set("short_description", event.target.value)} className={inputClass} /></Field>
            <Field label="Full description"><textarea rows={5} value={draft.description} onChange={(event) => set("description", event.target.value)} className={inputClass} /></Field>
          </Section>

          <Section title="Images" description="Select images here. Upload & Publish creates Supabase Storage URLs automatically and makes the product live.">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
            <button type="button" onClick={() => fileInput.current?.click()} disabled={saving || draft.pendingImages.length >= PRODUCT_MEDIA_MAX_FILES} className="w-full min-h-28 border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-sm disabled:opacity-50">
              <UploadCloud size={24} className="text-primary" />
              <span>Select JPG, PNG or WebP images</span>
              <span className="text-xs text-muted-foreground">Up to {PRODUCT_MEDIA_MAX_FILES} new images · 25 MB each</span>
            </button>

            {draft.pendingImages.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {draft.pendingImages.map((image, index) => (
                  <div key={image.id} className="border border-border/60 p-2 bg-background/40">
                    <img src={image.previewUrl} alt={image.file.name} className="w-full aspect-square object-cover" />
                    <p className="text-xs truncate mt-2" title={image.file.name}>{index === 0 && !draft.image_url.trim() ? "Cover · " : ""}{image.file.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1">{image.state}</p>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={saving || index === 0} className={iconButton}><ArrowUp size={13} /></button>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={saving || index === draft.pendingImages.length - 1} className={iconButton}><ArrowDown size={13} /></button>
                      <button type="button" onClick={() => removePending(index)} disabled={saving} className={`${iconButton} text-destructive`}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Field label="Existing cover image URL" hint="Usually generated automatically"><input value={draft.image_url} onChange={(event) => set("image_url", event.target.value)} placeholder="https://…" className={inputClass} /></Field>
            {draft.image_url && <img src={draft.image_url} alt="Current cover" className="w-28 h-28 object-cover border border-border/60" />}
            <Field label="Existing gallery URLs" hint="One URL per line; preserved unless removed"><textarea rows={5} value={draft.galleryText} onChange={(event) => set("galleryText", event.target.value)} className={inputClass} /></Field>
          </Section>

          <Section title="Buyer information">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Primary material"><input value={draft.primary_material} onChange={(event) => set("primary_material", event.target.value)} className={inputClass} /></Field>
              <Field label="GSM / weight"><input value={draft.gsm} onChange={(event) => set("gsm", event.target.value)} className={inputClass} /></Field>
              <Field label="MOQ display"><input value={draft.moq_display} onChange={(event) => set("moq_display", event.target.value)} placeholder="Flexible per program" className={inputClass} /></Field>
              <Field label="Sample timeline"><input value={draft.sample_timeline} onChange={(event) => set("sample_timeline", event.target.value)} className={inputClass} /></Field>
              <Field label="Production timeline"><input value={draft.production_timeline} onChange={(event) => set("production_timeline", event.target.value)} className={inputClass} /></Field>
              <Field label="Sort order"><input type="number" value={draft.sort_order} onChange={(event) => set("sort_order", Number(event.target.value))} className={inputClass} /></Field>
            </div>
            <Field label="Fabric composition"><textarea rows={2} value={draft.fabric_composition} onChange={(event) => set("fabric_composition", event.target.value)} className={inputClass} /></Field>
            <Field label="Material specifications"><textarea rows={2} value={draft.material_specifications} onChange={(event) => set("material_specifications", event.target.value)} className={inputClass} /></Field>
            <Field label="Specs / highlights" hint="One per line"><textarea rows={4} value={draft.specsText} onChange={(event) => set("specsText", event.target.value)} className={inputClass} /></Field>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_featured} onChange={(event) => set("is_featured", event.target.checked)} /> Featured product</label>
            <p className="text-xs text-muted-foreground">Pricing remains quotation-only; no public price is added.</p>
          </Section>

          <Section title="SEO and live URL">
            <Field label="SEO title"><input value={draft.seo_title} onChange={(event) => set("seo_title", event.target.value)} className={inputClass} /></Field>
            <Field label="SEO description"><textarea rows={2} value={draft.seo_description} onChange={(event) => set("seo_description", event.target.value)} className={inputClass} /></Field>
            <div className="border border-border/60 bg-background/40 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Generated product URL</p>
              <p className="text-sm break-all mt-2">{liveUrl ?? "Choose a valid subcategory and product name"}</p>
              {parentCategory && liveUrl && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => void copyUrl()} className={secondaryButton}><Copy size={13} /> Copy</button>
                  <a href={liveUrl} target="_blank" rel="noreferrer" className={secondaryButton}><ExternalLink size={13} /> Open</a>
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-border/60 bg-card/95 px-5 py-4">
          <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>Cancel</button>
          <button type="button" onClick={onSaveDraft} disabled={saving} className={secondaryButton}>{saving ? "Working…" : "Save Draft"}</button>
          <button type="button" onClick={onPublish} disabled={saving} className={primaryButton}>{saving ? "Uploading & saving…" : draft.id ? "Save & Publish" : "Upload & Publish"}</button>
        </div>
      </div>
    </div>
  );
}

const inputClass = "min-h-10 w-full bg-background/60 border border-border/60 focus:border-primary outline-none px-3 py-2 text-sm";
const primaryButton = "min-h-10 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] bg-gradient-gold text-primary-foreground px-4 py-2 hover:shadow-gold disabled:opacity-50";
const secondaryButton = "min-h-10 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.16em] border border-border/60 px-3 py-2 hover:border-primary disabled:opacity-50";
const iconButton = "min-h-9 min-w-9 inline-flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-40";
const publishedBadge = "text-[10px] uppercase tracking-[0.16em] px-2 py-1 border border-emerald-500/50 text-emerald-500";
const draftBadge = "text-[10px] uppercase tracking-[0.16em] px-2 py-1 border border-border/60 text-muted-foreground";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground/70 ml-2">· {hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-xl">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}
