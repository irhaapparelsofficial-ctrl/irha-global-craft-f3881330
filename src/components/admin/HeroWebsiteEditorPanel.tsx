import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  History,
  LayoutTemplate,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_HERO_CONTENT,
  HOME_HERO_DOCUMENT_KEY,
  normalizeHeroContent,
  type HeroCmsContent,
  type HeroSlideContent,
} from "@/lib/cms";

type CmsRevision = {
  id: string;
  version: number;
  action: "draft_saved" | "published" | "restored";
  content: HeroCmsContent;
  createdAt: string;
};

type CmsSnapshot = {
  id: string;
  key: string;
  documentType: string;
  title: string;
  status: "draft" | "published";
  version: number;
  publishedVersion: number | null;
  draftContent: HeroCmsContent;
  publishedContent: HeroCmsContent | null;
  updatedAt: string;
  publishedAt: string | null;
  revisions: CmsRevision[];
};

type BusyAction = "load" | "save" | "publish" | "restore" | null;
const db = supabase as any;

export default function HeroWebsiteEditorPanel() {
  const [snapshot, setSnapshot] = useState<CmsSnapshot | null>(null);
  const [content, setContent] = useState<HeroCmsContent>(DEFAULT_HERO_CONTENT);
  const [busy, setBusy] = useState<BusyAction>("load");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const applySnapshot = useCallback((value: CmsSnapshot | null) => {
    setSnapshot(value);
    setContent(normalizeHeroContent(value?.draftContent || DEFAULT_HERO_CONTENT));
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    setBusy("load");
    const { data, error: queryError } = await db.rpc("cms_get_admin_document", { _key: HOME_HERO_DOCUMENT_KEY });
    if (queryError) {
      setError(queryError.message || "Website CMS could not load");
      setBusy(null);
      return;
    }
    applySnapshot((data as CmsSnapshot | null) || null);
    setError(null);
    setBusy(null);
  }, [applySnapshot]);

  useEffect(() => { void load(); }, [load]);
  const validationErrors = useMemo(() => validateDraft(content), [content]);

  const setSlideField = (index: number, field: keyof HeroSlideContent, value: string) => {
    setContent((current) => ({ ...current, slides: current.slides.map((slide, slideIndex) => slideIndex === index ? { ...slide, [field]: value } : slide) }));
    setDirty(true);
  };

  const saveDraft = async (quiet = false) => {
    const errors = validateDraft(content);
    if (errors.length > 0) {
      toast({ title: "Draft is incomplete", description: errors.slice(0, 3).join(" · "), variant: "destructive" });
      return null;
    }
    setBusy("save");
    const { data, error: mutationError } = await db.rpc("cms_save_draft", {
      _key: HOME_HERO_DOCUMENT_KEY,
      _document_type: "section",
      _title: "Homepage Hero",
      _content: normalizeHeroContent(content),
    });
    if (mutationError) {
      setError(mutationError.message || "Draft could not be saved");
      setBusy(null);
      toast({ title: "Save failed", description: mutationError.message, variant: "destructive" });
      return null;
    }
    const next = data as CmsSnapshot;
    applySnapshot(next);
    setError(null);
    setBusy(null);
    if (!quiet) toast({ title: "Draft saved", description: `Version ${next.version} is private until you publish it.` });
    return next;
  };

  const publish = async () => {
    const saved = await saveDraft(true);
    if (!saved) return;
    setBusy("publish");
    const { data, error: mutationError } = await db.rpc("cms_publish_document", { _key: HOME_HERO_DOCUMENT_KEY });
    if (mutationError) {
      setError(mutationError.message || "Website content could not be published");
      setBusy(null);
      toast({ title: "Publish failed", description: mutationError.message, variant: "destructive" });
      return;
    }
    const next = data as CmsSnapshot;
    applySnapshot(next);
    setError(null);
    setBusy(null);
    toast({ title: "Homepage hero published", description: `Published version ${next.publishedVersion}.` });
  };

  const restoreRevision = async (revision: CmsRevision) => {
    if (!window.confirm(`Restore revision ${revision.version} as a new private draft? The live website will not change until you publish.`)) return;
    setBusy("restore");
    const { data, error: mutationError } = await db.rpc("cms_restore_revision", { _key: HOME_HERO_DOCUMENT_KEY, _revision_id: revision.id });
    if (mutationError) {
      setError(mutationError.message || "Revision could not be restored");
      setBusy(null);
      toast({ title: "Restore failed", description: mutationError.message, variant: "destructive" });
      return;
    }
    const next = data as CmsSnapshot;
    applySnapshot(next);
    setError(null);
    setBusy(null);
    toast({ title: "Revision restored", description: `Revision ${revision.version} is now a new private draft.` });
  };

  const resetToPublished = () => {
    setContent(normalizeHeroContent(snapshot?.publishedContent || DEFAULT_HERO_CONTENT));
    setDirty(true);
    toast({ title: "Published content loaded into editor", description: "Save the draft to record this change." });
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3 min-w-0">
            <LayoutTemplate className="text-gold shrink-0 mt-1" size={22} />
            <div><p className="eyebrow mb-2">Homepage CMS</p><h2 className="font-display text-2xl md:text-4xl">Hero carousel editor</h2><p className="mt-3 text-sm text-foreground/65 leading-relaxed max-w-3xl">Edit buyer-facing homepage hero copy with private drafts, explicit publishing and version rollback.</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2 min-w-0 xl:min-w-[310px]">
            <Status label="State" value={snapshot?.status || "Not loaded"} tone={snapshot?.status === "published" ? "good" : "warn"} />
            <Status label="Draft version" value={snapshot ? String(snapshot.version) : "—"} />
            <Status label="Live version" value={snapshot?.publishedVersion ? String(snapshot.publishedVersion) : "—"} />
            <Status label="Unsaved" value={dirty ? "Yes" : "No"} tone={dirty ? "warn" : "good"} />
          </div>
        </div>
      </section>

      {error && <section className="border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-200"><AlertTriangle size={17} className="shrink-0 mt-0.5" /><div><p className="font-medium">CMS backend activation is deferred</p><p className="mt-1 break-words">{error}</p></div></section>}

      <section className="border border-border/60 bg-card/25 p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Homepage</p><h3 className="font-display text-2xl mt-1">Hero carousel content</h3><p className="text-xs text-muted-foreground mt-2">Use Media Library URLs for approved assets during the final connected-backend stage.</p></div>
          <div className="flex flex-wrap gap-2"><Action onClick={() => void load()} disabled={busy !== null} icon={<RefreshCw size={13} className={busy === "load" ? "animate-spin" : ""} />}>Refresh</Action><Action onClick={resetToPublished} disabled={busy !== null} icon={<RotateCcw size={13} />}>Load live</Action><a href="/" target="_blank" rel="noopener noreferrer" className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><ExternalLink size={13} /> Open site</a></div>
        </div>

        <div className="space-y-5">{content.slides.map((slide, index) => <SlideEditor key={index} index={index} slide={slide} onChange={(field, value) => setSlideField(index, field, value)} />)}</div>

        {validationErrors.length > 0 && <div className="mt-5 border border-amber-500/35 bg-amber-500/[0.06] p-4"><p className="text-xs uppercase tracking-[0.18em] text-amber-300">Before saving</p><ul className="mt-2 space-y-1 text-xs text-foreground/70">{validationErrors.map((message) => <li key={message}>• {message}</li>)}</ul></div>}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/50 pt-5"><div className="flex items-start gap-2 text-xs text-muted-foreground max-w-xl"><ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" /><p>Save Draft never changes public content. Publish releases the reviewed draft.</p></div><div className="flex flex-wrap gap-2"><Action onClick={() => void saveDraft()} disabled={busy !== null || validationErrors.length > 0} icon={<Save size={13} />}>{busy === "save" ? "Saving…" : "Save draft"}</Action><Action onClick={() => void publish()} disabled={busy !== null || validationErrors.length > 0} icon={<UploadCloud size={14} />} primary>{busy === "publish" ? "Publishing…" : "Save & publish"}</Action></div></div>
      </section>

      <section className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="border border-border/60 bg-card/25 p-4 md:p-6"><div className="flex items-center gap-2 mb-5"><Eye size={16} className="text-gold" /><h3 className="font-display text-xl">Content preview</h3></div><div className="grid md:grid-cols-3 gap-3">{content.slides.map((slide, index) => <article key={index} className="border border-border/50 bg-background/40 p-4 min-w-0"><p className="text-[9px] uppercase tracking-[0.18em] text-gold break-words">{slide.eyebrow || "Eyebrow"}</p><h4 className="font-display text-xl mt-3 break-words">{slide.title || "Title"}</h4><p className="font-display italic text-gold mt-1 break-words">{slide.highlight || "Highlight"}</p><p className="text-xs text-muted-foreground mt-3 leading-relaxed break-words">{slide.subtitle || "Subtitle"}</p><p className="text-[9px] uppercase tracking-[0.15em] mt-4 break-all">{slide.ctaLabel || "CTA"} → {slide.ctaHref || "/"}</p></article>)}</div></div>
        <div className="border border-border/60 bg-card/25 p-4 md:p-6"><div className="flex items-center gap-2 mb-5"><History size={16} className="text-gold" /><h3 className="font-display text-xl">Revision history</h3></div>{!snapshot?.revisions?.length ? <p className="text-xs text-muted-foreground">No saved revision is available yet.</p> : <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">{snapshot.revisions.map((revision) => <div key={revision.id} className="border border-border/40 p-3 text-xs"><div className="flex items-start justify-between gap-3"><div><p className="font-medium capitalize">Version {revision.version} · {revision.action.replaceAll("_", " ")}</p><p className="text-muted-foreground mt-1">{new Date(revision.createdAt).toLocaleString()}</p></div><button type="button" onClick={() => void restoreRevision(revision)} disabled={busy !== null} className="min-h-9 inline-flex items-center gap-1.5 border border-border/60 px-2.5 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-50"><RotateCcw size={11} /> Restore</button></div></div>)}</div>}</div>
      </section>
    </div>
  );
}

function SlideEditor({ index, slide, onChange }: { index: number; slide: HeroSlideContent; onChange: (field: keyof HeroSlideContent, value: string) => void }) {
  return <fieldset className="border border-border/50 p-4 md:p-5 min-w-0"><legend className="px-2 text-[10px] uppercase tracking-[0.2em] text-gold">Slide {index + 1}</legend><div className="grid md:grid-cols-2 gap-4"><Field label="Eyebrow" value={slide.eyebrow} maxLength={140} onChange={(value) => onChange("eyebrow", value)} /><Field label="Main title" value={slide.title} maxLength={90} onChange={(value) => onChange("title", value)} /><Field label="Gold highlight" value={slide.highlight} maxLength={90} onChange={(value) => onChange("highlight", value)} /><Field label="CTA label" value={slide.ctaLabel} maxLength={70} onChange={(value) => onChange("ctaLabel", value)} /><div className="md:col-span-2"><TextArea label="Buyer-facing subtitle" value={slide.subtitle} maxLength={280} onChange={(value) => onChange("subtitle", value)} /></div><div className="md:col-span-2"><Field label="CTA destination" value={slide.ctaHref} maxLength={300} onChange={(value) => onChange("ctaHref", value)} placeholder="/products/... or https://..." /></div></div></fieldset>;
}

function Field({ label, value, onChange, maxLength, placeholder }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; placeholder?: string }) {
  return <label className="block min-w-0"><span className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}<span>{value.length}/{maxLength}</span></span><input value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} placeholder={placeholder} className="min-h-11 w-full bg-background border border-border/60 px-3 text-sm outline-none focus:border-gold" /></label>;
}

function TextArea({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength: number }) {
  return <label className="block min-w-0"><span className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}<span>{value.length}/{maxLength}</span></span><textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} rows={4} className="w-full bg-background border border-border/60 px-3 py-3 text-sm leading-relaxed outline-none focus:border-gold resize-y" /></label>;
}

function Status({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "warn" }) {
  const valueClass = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-400" : "text-foreground";
  return <div className="border border-border/50 bg-background/35 p-3 min-w-0"><p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground truncate">{label}</p><p className={`font-display text-lg mt-1 capitalize truncate ${valueClass}`}>{value}</p></div>;
}

function Action({ onClick, disabled, icon, primary = false, children }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; primary?: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={primary ? "min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-background px-4 py-2 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50" : "min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"}>{icon}{children}</button>;
}

function validateDraft(value: HeroCmsContent) {
  const errors: string[] = [];
  value.slides.forEach((slide, index) => {
    const prefix = `Slide ${index + 1}`;
    if (slide.eyebrow.trim().length < 2) errors.push(`${prefix}: eyebrow is required`);
    if (slide.title.trim().length < 2) errors.push(`${prefix}: title is required`);
    if (slide.highlight.trim().length < 2) errors.push(`${prefix}: highlight is required`);
    if (slide.subtitle.trim().length < 20) errors.push(`${prefix}: subtitle needs at least 20 characters`);
    if (slide.ctaLabel.trim().length < 2) errors.push(`${prefix}: CTA label is required`);
    const href = slide.ctaHref.trim();
    if (!((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("https://"))) errors.push(`${prefix}: CTA destination must be an internal path or HTTPS URL`);
  });
  return errors;
}
