import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, History, Plus, RefreshCw, RotateCcw, Save, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_GLOBAL_SITE_SETTINGS,
  GLOBAL_SITE_SETTINGS_KEY,
  normalizeGlobalSiteSettings,
  validateGlobalSiteSettings,
  type BuyerReadinessItem,
  type GlobalSiteSettings,
  type SiteLink,
} from "@/lib/siteSettings";

const db = supabase as any;
type Tab = "brand" | "navigation" | "footer" | "announcement";
type Busy = "load" | "save" | "publish" | "restore" | null;

type Revision = { id: string; version: number; action: string; content: GlobalSiteSettings; createdAt: string };
type Snapshot = {
  status: "draft" | "published";
  version: number;
  publishedVersion: number | null;
  draftContent: GlobalSiteSettings;
  publishedContent: GlobalSiteSettings | null;
  revisions: Revision[];
  updatedAt: string;
  publishedAt: string | null;
};

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "brand", label: "Brand & Contact" },
  { key: "navigation", label: "Navigation & CTAs" },
  { key: "footer", label: "Footer" },
  { key: "announcement", label: "Announcement" },
];

export default function GlobalSiteSettingsPanel() {
  const [tab, setTab] = useState<Tab>("brand");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [settings, setSettings] = useState<GlobalSiteSettings>(DEFAULT_GLOBAL_SITE_SETTINGS);
  const [busy, setBusy] = useState<Busy>("load");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((value: Snapshot | null) => {
    setSnapshot(value);
    setSettings(normalizeGlobalSiteSettings(value?.draftContent || DEFAULT_GLOBAL_SITE_SETTINGS));
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    setBusy("load");
    const { data, error: queryError } = await db.rpc("cms_get_admin_document", { _key: GLOBAL_SITE_SETTINGS_KEY });
    if (queryError) {
      setError(queryError.message || "Global settings backend is not active yet");
      setBusy(null);
      return;
    }
    apply((data as Snapshot | null) || null);
    setError(null);
    setBusy(null);
  }, [apply]);

  useEffect(() => { void load(); }, [load]);

  const checked = useMemo(() => validateGlobalSiteSettings(settings), [settings]);
  const change = (next: GlobalSiteSettings) => { setSettings(next); setDirty(true); };

  const saveDraft = async (quiet = false) => {
    const validation = validateGlobalSiteSettings(settings);
    if (validation.errors.length) {
      toast({ title: "Settings need attention", description: validation.errors.join(" · "), variant: "destructive" });
      return null;
    }
    setBusy("save");
    const { data, error: mutationError } = await db.rpc("cms_save_draft", {
      _key: GLOBAL_SITE_SETTINGS_KEY,
      _document_type: "site_settings",
      _title: "Global Website Settings",
      _content: validation.settings,
    });
    if (mutationError) {
      setError(mutationError.message);
      setBusy(null);
      toast({ title: "Draft save failed", description: mutationError.message, variant: "destructive" });
      return null;
    }
    const next = data as Snapshot;
    apply(next);
    setError(null);
    setBusy(null);
    if (!quiet) toast({ title: "Global settings draft saved", description: `Version ${next.version} remains private.` });
    return next;
  };

  const publish = async () => {
    const saved = await saveDraft(true);
    if (!saved) return;
    setBusy("publish");
    const { data, error: mutationError } = await db.rpc("cms_publish_document", { _key: GLOBAL_SITE_SETTINGS_KEY });
    if (mutationError) {
      setError(mutationError.message);
      setBusy(null);
      toast({ title: "Publish failed", description: mutationError.message, variant: "destructive" });
      return;
    }
    const next = data as Snapshot;
    apply(next);
    setError(null);
    setBusy(null);
    toast({ title: "Global website settings published", description: `Live version ${next.publishedVersion}.` });
  };

  const restore = async (revision: Revision) => {
    if (!window.confirm(`Restore version ${revision.version} as a private draft?`)) return;
    setBusy("restore");
    const { data, error: mutationError } = await db.rpc("cms_restore_revision", {
      _key: GLOBAL_SITE_SETTINGS_KEY,
      _revision_id: revision.id,
    });
    if (mutationError) {
      setBusy(null);
      toast({ title: "Restore failed", description: mutationError.message, variant: "destructive" });
      return;
    }
    apply(data as Snapshot);
    setBusy(null);
    toast({ title: "Revision restored as draft" });
  };

  const loadLive = () => {
    change(normalizeGlobalSiteSettings(snapshot?.publishedContent || DEFAULT_GLOBAL_SITE_SETTINGS));
    toast({ title: "Live settings loaded into editor" });
  };

  return (
    <div className="space-y-5">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <p className="eyebrow mb-2">Global Website Control</p>
            <h2 className="font-display text-2xl md:text-4xl">Brand, navigation and contact settings</h2>
            <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">Update the shared header, footer, contact details, social profiles, buyer CTAs and announcement banner from one protected draft-and-publish workflow.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-[280px]">
            <Status label="State" value={snapshot?.status || "Fallback"} />
            <Status label="Draft" value={snapshot ? String(snapshot.version) : "—"} />
            <Status label="Live" value={snapshot?.publishedVersion ? String(snapshot.publishedVersion) : "—"} />
            <Status label="Unsaved" value={dirty ? "Yes" : "No"} />
          </div>
        </div>
      </section>

      {error && <div className="border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200">Backend activation is deferred. The editor keeps safe source defaults until the final database migration. Detail: {error}</div>}

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`min-h-11 px-4 text-[10px] uppercase tracking-[0.18em] border ${tab === item.key ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}>{item.label}</button>)}
      </div>

      <section className="border border-border/60 bg-card/25 p-4 md:p-6">
        {tab === "brand" && <BrandEditor settings={settings} change={change} />}
        {tab === "navigation" && <NavigationEditor settings={settings} change={change} />}
        {tab === "footer" && <FooterEditor settings={settings} change={change} />}
        {tab === "announcement" && <AnnouncementEditor settings={settings} change={change} />}
      </section>

      {checked.errors.length > 0 && <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{checked.errors.join(" · ")}</div>}

      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border border-border/60 bg-card/20 p-4">
        <div className="flex flex-wrap gap-2">
          <Action onClick={() => void load()} disabled={busy !== null}><RefreshCw size={13} /> Refresh</Action>
          <Action onClick={loadLive} disabled={busy !== null}><RotateCcw size={13} /> Load live</Action>
          <a href="/" target="_blank" rel="noopener noreferrer" className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><ExternalLink size={13} /> Preview site</a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Action onClick={() => void saveDraft()} disabled={busy !== null || checked.errors.length > 0}><Save size={13} /> {busy === "save" ? "Saving…" : "Save draft"}</Action>
          <Action onClick={() => void publish()} disabled={busy !== null || checked.errors.length > 0} primary><UploadCloud size={14} /> {busy === "publish" ? "Publishing…" : "Save & publish"}</Action>
        </div>
      </section>

      <section className="border border-border/60 bg-card/20 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4"><History size={16} className="text-gold" /><h3 className="font-display text-xl">Revision history</h3></div>
        {!snapshot?.revisions?.length ? <p className="text-sm text-muted-foreground">No CMS revisions are available before backend activation.</p> : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {snapshot.revisions.map((revision) => <div key={revision.id} className="flex items-center justify-between gap-3 border border-border/40 p-3 text-xs"><div><p className="text-foreground">Version {revision.version} · {revision.action}</p><p className="text-muted-foreground mt-1">{new Date(revision.createdAt).toLocaleString()}</p></div><button onClick={() => void restore(revision)} disabled={busy !== null} className="min-h-11 px-3 border border-border/60 hover:border-gold hover:text-gold">Restore draft</button></div>)}
          </div>
        )}
      </section>
    </div>
  );
}

function BrandEditor({ settings, change }: EditorProps) {
  const b = settings.brand;
  const set = (key: keyof typeof b, value: string) => change({ ...settings, brand: { ...b, [key]: value } });
  return <div className="grid md:grid-cols-2 gap-4">
    <Input label="Brand name" value={b.name} onChange={(v) => set("name", v)} />
    <Input label="Public tagline" value={b.tagline} onChange={(v) => set("tagline", v)} />
    <Input label="Location line" value={b.location} onChange={(v) => set("location", v)} />
    <Input label="Full address" value={b.address} onChange={(v) => set("address", v)} />
    <Input label="Business email" value={b.email} type="email" onChange={(v) => set("email", v)} />
    <Input label="Phone (machine format)" value={b.phone} onChange={(v) => set("phone", v)} />
    <Input label="Phone display" value={b.phoneDisplay} onChange={(v) => set("phoneDisplay", v)} />
    <Input label="WhatsApp number with country code" value={b.whatsappNumber} onChange={(v) => set("whatsappNumber", v)} />
    <div className="md:col-span-2"><Input label="Logo URL (Media Library URL, internal path or HTTPS)" value={b.logoUrl} onChange={(v) => set("logoUrl", v)} placeholder="Leave blank to use the verified source logo" /></div>
  </div>;
}

function NavigationEditor({ settings, change }: EditorProps) {
  const updateGroup = (group: keyof GlobalSiteSettings["navigation"], rows: SiteLink[]) => change({ ...settings, navigation: { ...settings.navigation, [group]: rows } });
  return <div className="space-y-7">
    <LinkEditor title="Primary navigation" rows={settings.navigation.main} onChange={(rows) => updateGroup("main", rows)} />
    <LinkEditor title="More menu" rows={settings.navigation.more} onChange={(rows) => updateGroup("more", rows)} />
    <LinkEditor title="Tail navigation" rows={settings.navigation.tail} onChange={(rows) => updateGroup("tail", rows)} />
    <div className="grid md:grid-cols-3 gap-4 border-t border-border/50 pt-6">
      <Input label="Quote button label" value={settings.ctas.quoteLabel} onChange={(v) => change({ ...settings, ctas: { ...settings.ctas, quoteLabel: v } })} />
      <Input label="Quote button route" value={settings.ctas.quoteHref} onChange={(v) => change({ ...settings, ctas: { ...settings.ctas, quoteHref: v } })} />
      <Input label="Mockup button label" value={settings.ctas.mockupLabel} onChange={(v) => change({ ...settings, ctas: { ...settings.ctas, mockupLabel: v } })} />
      <Input label="AI Studio label" value={settings.ctas.studioLabel} onChange={(v) => change({ ...settings, ctas: { ...settings.ctas, studioLabel: v } })} />
      <Input label="AI Studio route" value={settings.ctas.studioHref} onChange={(v) => change({ ...settings, ctas: { ...settings.ctas, studioHref: v } })} />
      <Input label="WhatsApp label" value={settings.ctas.whatsappLabel} onChange={(v) => change({ ...settings, ctas: { ...settings.ctas, whatsappLabel: v } })} />
    </div>
  </div>;
}

function FooterEditor({ settings, change }: EditorProps) {
  const f = settings.footer;
  const set = <K extends keyof typeof f>(key: K, value: typeof f[K]) => change({ ...settings, footer: { ...f, [key]: value } });
  return <div className="space-y-7">
    <div className="grid md:grid-cols-2 gap-4"><Input label="Footer intro" value={f.intro} onChange={(v) => set("intro", v)} /><Input label="Footer strip" value={f.stripText} onChange={(v) => set("stripText", v)} /><Input label="Factory-call label" value={f.factoryCallLabel} onChange={(v) => set("factoryCallLabel", v)} /><Input label="Factory-call route" value={f.factoryCallHref} onChange={(v) => set("factoryCallHref", v)} /><Input label="Copyright suffix" value={f.copyrightSuffix} onChange={(v) => set("copyrightSuffix", v)} /></div>
    <LinkEditor title="Footer collections" rows={f.collectionLinks} onChange={(rows) => set("collectionLinks", rows)} />
    <LinkEditor title="Footer company links" rows={f.companyLinks} onChange={(rows) => set("companyLinks", rows)} />
    <ReadinessEditor rows={f.buyerReadiness} onChange={(rows) => set("buyerReadiness", rows)} />
    <div className="grid md:grid-cols-3 gap-4 border-t border-border/50 pt-6"><Input label="Instagram URL" value={settings.socials.instagram} onChange={(v) => change({ ...settings, socials: { ...settings.socials, instagram: v } })} /><Input label="Facebook URL" value={settings.socials.facebook} onChange={(v) => change({ ...settings, socials: { ...settings.socials, facebook: v } })} /><Input label="TikTok URL" value={settings.socials.tiktok} onChange={(v) => change({ ...settings, socials: { ...settings.socials, tiktok: v } })} /></div>
  </div>;
}

function AnnouncementEditor({ settings, change }: EditorProps) {
  const a = settings.announcement;
  const set = <K extends keyof typeof a>(key: K, value: typeof a[K]) => change({ ...settings, announcement: { ...a, [key]: value } });
  return <div className="grid md:grid-cols-2 gap-4">
    <label className="space-y-2"><span className="text-xs text-muted-foreground">Mode</span><select value={a.mode} onChange={(e) => set("mode", e.target.value as typeof a.mode)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="calendar">Seasonal calendar</option><option value="custom">Custom announcement</option><option value="off">Off</option></select></label>
    <label className="space-y-2"><span className="text-xs text-muted-foreground">Theme</span><select value={a.theme} onChange={(e) => set("theme", e.target.value as typeof a.theme)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="gold">Gold</option><option value="ivory">Ivory</option><option value="emerald">Emerald</option><option value="crimson">Crimson</option></select></label>
    <Input label="Internal ID" value={a.id} onChange={(v) => set("id", v)} />
    <Input label="Eyebrow / label" value={a.label} onChange={(v) => set("label", v)} />
    <div className="md:col-span-2"><Input label="Message" value={a.message} onChange={(v) => set("message", v)} /></div>
    <Input label="CTA label" value={a.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
    <Input label="CTA route" value={a.ctaHref} onChange={(v) => set("ctaHref", v)} />
    <Input label="Start date (optional)" value={a.startDate} type="date" onChange={(v) => set("startDate", v)} />
    <Input label="End date (optional)" value={a.endDate} type="date" onChange={(v) => set("endDate", v)} />
    <label className="md:col-span-2 inline-flex items-center gap-3 text-sm"><input type="checkbox" checked={a.dismissible} onChange={(e) => set("dismissible", e.target.checked)} /> Allow visitors to dismiss this banner for the session</label>
  </div>;
}

type EditorProps = { settings: GlobalSiteSettings; change: (next: GlobalSiteSettings) => void };

function LinkEditor({ title, rows, onChange }: { title: string; rows: SiteLink[]; onChange: (rows: SiteLink[]) => void }) {
  const patch = (index: number, value: Partial<SiteLink>) => onChange(rows.map((row, i) => i === index ? { ...row, ...value } : row));
  return <div><div className="flex items-center justify-between gap-3 mb-3"><h3 className="font-display text-xl">{title}</h3><button onClick={() => onChange([...rows, { label: "New link", href: "/", enabled: false }])} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 text-xs hover:border-gold"><Plus size={13} /> Add link</button></div><div className="space-y-2">{rows.map((row, index) => <div key={`${title}-${index}`} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center"><input type="checkbox" checked={row.enabled} onChange={(e) => patch(index, { enabled: e.target.checked })} aria-label={`Enable ${row.label}`} /><input value={row.label} onChange={(e) => patch(index, { label: e.target.value })} className="min-h-11 bg-background border border-border/60 px-3 text-sm" aria-label="Link label" /><input value={row.href} onChange={(e) => patch(index, { href: e.target.value })} className="min-h-11 bg-background border border-border/60 px-3 text-sm" aria-label="Internal route" /><button onClick={() => onChange(rows.filter((_, i) => i !== index))} className="min-h-11 min-w-11 inline-flex items-center justify-center text-destructive" aria-label={`Remove ${row.label}`}><Trash2 size={14} /></button></div>)}</div></div>;
}

function ReadinessEditor({ rows, onChange }: { rows: BuyerReadinessItem[]; onChange: (rows: BuyerReadinessItem[]) => void }) {
  const patch = (index: number, value: Partial<BuyerReadinessItem>) => onChange(rows.map((row, i) => i === index ? { ...row, ...value } : row));
  return <div><div className="flex items-center justify-between gap-3 mb-3"><h3 className="font-display text-xl">Buyer readiness statements</h3><button onClick={() => onChange([...rows, { label: "New statement", note: "Confirmed per program" }])} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 text-xs hover:border-gold"><Plus size={13} /> Add</button></div><div className="space-y-2">{rows.map((row, index) => <div key={index} className="grid grid-cols-[1fr_1.5fr_auto] gap-2"><input value={row.label} onChange={(e) => patch(index, { label: e.target.value })} className="min-h-11 bg-background border border-border/60 px-3 text-sm" /><input value={row.note} onChange={(e) => patch(index, { note: e.target.value })} className="min-h-11 bg-background border border-border/60 px-3 text-sm" /><button onClick={() => onChange(rows.filter((_, i) => i !== index))} className="min-h-11 min-w-11 inline-flex items-center justify-center text-destructive"><Trash2 size={14} /></button></div>)}</div></div>;
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="space-y-2 block"><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm focus:border-gold outline-none" /></label>;
}

function Action({ children, onClick, disabled, primary = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 inline-flex items-center gap-2 px-4 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50 ${primary ? "bg-gradient-gold text-primary-foreground" : "border border-border/60 hover:border-gold hover:text-gold"}`}>{children}</button>;
}

function Status({ label, value }: { label: string; value: string }) {
  return <div className="border border-border/50 bg-background/35 p-3"><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 text-sm truncate">{value}</p></div>;
}
