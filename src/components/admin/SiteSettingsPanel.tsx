import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Globe2,
  History,
  LayoutList,
  RefreshCw,
  RotateCcw,
  Save,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_HOME_LAYOUT,
  GLOBAL_SETTINGS_DOCUMENT_KEY,
  HOME_LAYOUT_DOCUMENT_KEY,
  normalizeGlobalSettings,
  normalizeHomeLayout,
  type HomeSectionLayout,
  type SiteGlobalSettings,
} from "@/lib/siteConfiguration";
import { Field, PrimaryButton, SecondaryButton, TextArea, Toggle } from "@/components/admin/content/ContentFormPrimitives";
import { isMissingSchemaError } from "@/components/admin/content/contentCmsTypes";

type Revision<T> = {
  id: string;
  version: number;
  action: "draft_saved" | "published" | "restored";
  content: T;
  createdAt: string;
};

type Snapshot<T> = {
  id: string;
  key: string;
  documentType: string;
  title: string;
  status: "draft" | "published";
  version: number;
  publishedVersion: number | null;
  draftContent: T;
  publishedContent: T | null;
  updatedAt: string;
  publishedAt: string | null;
  revisions: Revision<T>[];
};

type Tab = "global" | "layout";
type Busy = "load" | "save-global" | "publish-global" | "save-layout" | "publish-layout" | "restore" | null;

const db = supabase as any;

export default function SiteSettingsPanel() {
  const [tab, setTab] = useState<Tab>("global");
  const [globalSnapshot, setGlobalSnapshot] = useState<Snapshot<SiteGlobalSettings> | null>(null);
  const [layoutSnapshot, setLayoutSnapshot] = useState<Snapshot<HomeSectionLayout> | null>(null);
  const [globalDraft, setGlobalDraft] = useState<SiteGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [layoutDraft, setLayoutDraft] = useState<HomeSectionLayout>(DEFAULT_HOME_LAYOUT);
  const [globalDirty, setGlobalDirty] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [busy, setBusy] = useState<Busy>("load");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy("load");
    const [globalResult, layoutResult] = await Promise.all([
      db.rpc("cms_get_admin_document", { _key: GLOBAL_SETTINGS_DOCUMENT_KEY }),
      db.rpc("cms_get_admin_document", { _key: HOME_LAYOUT_DOCUMENT_KEY }),
    ]);

    const nextGlobal = (globalResult.data as Snapshot<SiteGlobalSettings> | null) || null;
    const nextLayout = (layoutResult.data as Snapshot<HomeSectionLayout> | null) || null;
    setGlobalSnapshot(nextGlobal);
    setLayoutSnapshot(nextLayout);
    setGlobalDraft(normalizeGlobalSettings(nextGlobal?.draftContent || DEFAULT_GLOBAL_SETTINGS));
    setLayoutDraft(normalizeHomeLayout(nextLayout?.draftContent || DEFAULT_HOME_LAYOUT));
    setGlobalDirty(false);
    setLayoutDirty(false);
    setError(globalResult.error?.message || layoutResult.error?.message || null);
    setBusy(null);
  };

  useEffect(() => { void load(); }, []);

  const saveDocument = async <T,>(
    key: string,
    title: string,
    documentType: "site_settings" | "page",
    content: T,
    action: Busy,
  ): Promise<Snapshot<T> | null> => {
    setBusy(action);
    const { data, error: saveError } = await db.rpc("cms_save_draft", {
      _key: key,
      _document_type: documentType,
      _title: title,
      _content: content,
    });
    if (saveError) {
      setBusy(null);
      setError(saveError.message);
      toast({ title: "Draft save failed", description: saveError.message, variant: "destructive" });
      return null;
    }
    setError(null);
    setBusy(null);
    return data as Snapshot<T>;
  };

  const publishDocument = async <T,>(key: string, action: Busy): Promise<Snapshot<T> | null> => {
    setBusy(action);
    const { data, error: publishError } = await db.rpc("cms_publish_document", { _key: key });
    if (publishError) {
      setBusy(null);
      setError(publishError.message);
      toast({ title: "Publish failed", description: publishError.message, variant: "destructive" });
      return null;
    }
    setError(null);
    setBusy(null);
    return data as Snapshot<T>;
  };

  const saveGlobal = async (quiet = false) => {
    const normalized = normalizeGlobalSettings(globalDraft);
    if (normalized.announcement.enabled && normalized.announcement.message.length < 5) {
      toast({ title: "Announcement message is required", variant: "destructive" });
      return null;
    }
    const saved = await saveDocument(
      GLOBAL_SETTINGS_DOCUMENT_KEY,
      "Global Site Settings",
      "site_settings",
      normalized,
      "save-global",
    );
    if (!saved) return null;
    setGlobalSnapshot(saved);
    setGlobalDraft(normalizeGlobalSettings(saved.draftContent));
    setGlobalDirty(false);
    if (!quiet) toast({ title: "Global settings draft saved", description: `Private version ${saved.version}.` });
    return saved;
  };

  const publishGlobal = async () => {
    const saved = await saveGlobal(true);
    if (!saved) return;
    const published = await publishDocument<SiteGlobalSettings>(GLOBAL_SETTINGS_DOCUMENT_KEY, "publish-global");
    if (!published) return;
    setGlobalSnapshot(published);
    setGlobalDraft(normalizeGlobalSettings(published.draftContent));
    setGlobalDirty(false);
    toast({ title: "Global settings published", description: `Live version ${published.publishedVersion}.` });
  };

  const saveLayout = async (quiet = false) => {
    const normalized = normalizeHomeLayout(layoutDraft);
    const saved = await saveDocument(
      HOME_LAYOUT_DOCUMENT_KEY,
      "Homepage Section Layout",
      "page",
      normalized,
      "save-layout",
    );
    if (!saved) return null;
    setLayoutSnapshot(saved);
    setLayoutDraft(normalizeHomeLayout(saved.draftContent));
    setLayoutDirty(false);
    if (!quiet) toast({ title: "Homepage layout draft saved", description: `Private version ${saved.version}.` });
    return saved;
  };

  const publishLayout = async () => {
    const saved = await saveLayout(true);
    if (!saved) return;
    const published = await publishDocument<HomeSectionLayout>(HOME_LAYOUT_DOCUMENT_KEY, "publish-layout");
    if (!published) return;
    setLayoutSnapshot(published);
    setLayoutDraft(normalizeHomeLayout(published.draftContent));
    setLayoutDirty(false);
    toast({ title: "Homepage layout published", description: `Live version ${published.publishedVersion}.` });
  };

  const restoreRevision = async <T,>(
    key: string,
    revision: Revision<T>,
    target: "global" | "layout",
  ) => {
    if (!window.confirm(`Restore version ${revision.version} as a new private draft? The public site will not change until publish.`)) return;
    setBusy("restore");
    const { data, error: restoreError } = await db.rpc("cms_restore_revision", {
      _key: key,
      _revision_id: revision.id,
    });
    setBusy(null);
    if (restoreError) {
      toast({ title: "Restore failed", description: restoreError.message, variant: "destructive" });
      return;
    }
    if (target === "global") {
      const next = data as Snapshot<SiteGlobalSettings>;
      setGlobalSnapshot(next);
      setGlobalDraft(normalizeGlobalSettings(next.draftContent));
      setGlobalDirty(false);
    } else {
      const next = data as Snapshot<HomeSectionLayout>;
      setLayoutSnapshot(next);
      setLayoutDraft(normalizeHomeLayout(next.draftContent));
      setLayoutDirty(false);
    }
    toast({ title: "Revision restored", description: "It is now a private draft." });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= layoutDraft.sections.length) return;
    if (layoutDraft.sections[index].locked || layoutDraft.sections[nextIndex].locked) return;
    const next = [...layoutDraft.sections];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setLayoutDraft({ sections: next.map((section, position) => ({ ...section, order: position * 10 })) });
    setLayoutDirty(true);
  };

  const activeSnapshot = tab === "global" ? globalSnapshot : layoutSnapshot;
  const activeDirty = tab === "global" ? globalDirty : layoutDirty;
  const versions = useMemo(() => activeSnapshot?.revisions?.slice(0, 10) || [], [activeSnapshot]);

  return (
    <div className="space-y-6">
      <section className="border border-gold/35 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3 min-w-0">
            <Globe2 className="text-gold shrink-0 mt-1" size={22} />
            <div>
              <p className="eyebrow mb-2">Phase 2 · Global Control</p>
              <h2 className="font-display text-2xl md:text-4xl">Site Settings & Layout</h2>
              <p className="mt-3 text-sm text-foreground/65 leading-relaxed max-w-3xl">
                Control company contact details, social links, announcements, footer content, legal links and homepage section order through private drafts and explicit publishing.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
            <RefreshCw size={13} className={busy === "load" ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="State" value={activeSnapshot?.status || "Fallback"} good={activeSnapshot?.status === "published"} />
          <Metric label="Draft version" value={activeSnapshot ? String(activeSnapshot.version) : "—"} />
          <Metric label="Live version" value={activeSnapshot?.publishedVersion ? String(activeSnapshot.publishedVersion) : "—"} />
          <Metric label="Unsaved" value={activeDirty ? "Yes" : "No"} warn={activeDirty} />
        </div>
      </section>

      {error && (
        <section className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70">
          <p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "Site settings activation is pending" : "Site settings could not load"}</p>
          <p className="mt-1 break-words">{error}</p>
        </section>
      )}

      <section className="border border-border/60 bg-card/20">
        <div className="flex overflow-x-auto border-b border-border/60" role="tablist">
          <TabButton active={tab === "global"} onClick={() => setTab("global")} icon={<Globe2 size={14} />}>Global Settings</TabButton>
          <TabButton active={tab === "layout"} onClick={() => setTab("layout")} icon={<LayoutList size={14} />}>Homepage Layout</TabButton>
        </div>

        <div className="p-4 md:p-6">
          {tab === "global" ? (
            <GlobalEditor draft={globalDraft} onChange={(next) => { setGlobalDraft(next); setGlobalDirty(true); }} />
          ) : (
            <LayoutEditor
              draft={layoutDraft}
              onToggle={(index) => {
                const next = [...layoutDraft.sections];
                if (next[index].locked) return;
                next[index] = { ...next[index], visible: !next[index].visible };
                setLayoutDraft({ sections: next });
                setLayoutDirty(true);
              }}
              onMove={moveSection}
              onReset={() => { setLayoutDraft(DEFAULT_HOME_LAYOUT); setLayoutDirty(true); }}
            />
          )}
        </div>

        <div className="border-t border-border/60 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <p className="text-xs text-muted-foreground max-w-2xl">
            Saving creates a private revision. Publishing is the only action that changes buyer-facing settings after the backend is activated.
          </p>
          <div className="flex flex-wrap gap-2">
            {tab === "global" ? (
              <>
                <SecondaryButton onClick={() => void saveGlobal()} disabled={busy !== null}><span className="inline-flex items-center gap-2"><Save size={13} />Save draft</span></SecondaryButton>
                <PrimaryButton onClick={() => void publishGlobal()} disabled={busy !== null}><span className="inline-flex items-center gap-2"><UploadCloud size={13} />Save & publish</span></PrimaryButton>
              </>
            ) : (
              <>
                <SecondaryButton onClick={() => void saveLayout()} disabled={busy !== null}><span className="inline-flex items-center gap-2"><Save size={13} />Save draft</span></SecondaryButton>
                <PrimaryButton onClick={() => void publishLayout()} disabled={busy !== null}><span className="inline-flex items-center gap-2"><UploadCloud size={13} />Save & publish</span></PrimaryButton>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border border-border/60 bg-card/20 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4"><History size={15} className="text-gold" /><h3 className="font-display text-xl">Revision history</h3></div>
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Revision history becomes available after final backend activation and the first saved version.</p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {versions.map((revision) => (
              <div key={revision.id} className="border border-border/40 p-3">
                <p className="text-xs capitalize">Version {revision.version} · {revision.action.replaceAll("_", " ")}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(revision.createdAt).toLocaleString()}</p>
                <button
                  type="button"
                  onClick={() => tab === "global"
                    ? void restoreRevision(GLOBAL_SETTINGS_DOCUMENT_KEY, revision as Revision<SiteGlobalSettings>, "global")
                    : void restoreRevision(HOME_LAYOUT_DOCUMENT_KEY, revision as Revision<HomeSectionLayout>, "layout")}
                  disabled={busy !== null}
                  className="mt-3 min-h-9 inline-flex items-center gap-1.5 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  <RotateCcw size={11} /> Restore draft
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GlobalEditor({ draft, onChange }: { draft: SiteGlobalSettings; onChange: (next: SiteGlobalSettings) => void }) {
  const setCompany = (key: keyof SiteGlobalSettings["company"], value: string) => onChange({ ...draft, company: { ...draft.company, [key]: value } });
  const setContact = (key: keyof SiteGlobalSettings["contact"], value: string) => onChange({ ...draft, contact: { ...draft.contact, [key]: value } });
  const setSocial = (key: keyof SiteGlobalSettings["social"], value: string) => onChange({ ...draft, social: { ...draft.social, [key]: value } });
  const setAnnouncement = <K extends keyof SiteGlobalSettings["announcement"]>(key: K, value: SiteGlobalSettings["announcement"][K]) => onChange({ ...draft, announcement: { ...draft.announcement, [key]: value } });
  const setFooter = <K extends keyof SiteGlobalSettings["footer"]>(key: K, value: SiteGlobalSettings["footer"][K]) => onChange({ ...draft, footer: { ...draft.footer, [key]: value } });

  return (
    <div className="space-y-8">
      <SettingsGroup title="Company identity">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Company name" value={draft.company.name} onChange={(value) => setCompany("name", value)} maxLength={120} required />
          <Field label="Tagline" value={draft.company.tagline} onChange={(value) => setCompany("tagline", value)} maxLength={180} />
          <Field label="Location label" value={draft.company.locationLabel} onChange={(value) => setCompany("locationLabel", value)} maxLength={120} />
          <Field label="Address" value={draft.company.address} onChange={(value) => setCompany("address", value)} maxLength={300} />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Contact">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Email" value={draft.contact.email} onChange={(value) => setContact("email", value)} required />
          <Field label="Phone display" value={draft.contact.phoneDisplay} onChange={(value) => setContact("phoneDisplay", value)} />
          <Field label="WhatsApp digits" value={draft.contact.whatsappNumber} onChange={(value) => setContact("whatsappNumber", value)} placeholder="923204110066" required />
          <Field label="Default WhatsApp message" value={draft.contact.whatsappMessage} onChange={(value) => setContact("whatsappMessage", value)} maxLength={500} />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Social profiles">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Instagram" value={draft.social.instagram} onChange={(value) => setSocial("instagram", value)} />
          <Field label="Facebook" value={draft.social.facebook} onChange={(value) => setSocial("facebook", value)} />
          <Field label="TikTok" value={draft.social.tiktok} onChange={(value) => setSocial("tiktok", value)} />
          <Field label="LinkedIn" value={draft.social.linkedin} onChange={(value) => setSocial("linkedin", value)} />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Announcement banner">
        <div className="grid md:grid-cols-2 gap-4">
          <Toggle label="Enable CMS announcement" checked={draft.announcement.enabled} onChange={(value) => setAnnouncement("enabled", value)} description="When disabled, the verified seasonal occasion engine remains available as fallback." />
          <Toggle label="Allow visitor dismissal" checked={draft.announcement.dismissible} onChange={(value) => setAnnouncement("dismissible", value)} />
          <Field label="Announcement ID" value={draft.announcement.id} onChange={(value) => setAnnouncement("id", value)} maxLength={120} />
          <Field label="Eyebrow label" value={draft.announcement.label} onChange={(value) => setAnnouncement("label", value)} maxLength={120} />
          <div className="md:col-span-2"><TextArea label="Message" value={draft.announcement.message} onChange={(value) => setAnnouncement("message", value)} rows={3} maxLength={300} /></div>
          <Field label="CTA text" value={draft.announcement.ctaText} onChange={(value) => setAnnouncement("ctaText", value)} maxLength={80} />
          <Field label="CTA destination" value={draft.announcement.ctaHref} onChange={(value) => setAnnouncement("ctaHref", value)} />
          <label className="block"><span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5 block">Theme</span><select value={draft.announcement.theme} onChange={(event) => setAnnouncement("theme", event.target.value as SiteGlobalSettings["announcement"]["theme"])} className="min-h-11 w-full border border-border/60 bg-background px-3 text-sm"><option value="gold">Gold</option><option value="ivory">Ivory</option><option value="emerald">Emerald</option><option value="crimson">Crimson</option></select></label>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Footer & legal">
        <div className="space-y-4">
          <TextArea label="Company blurb" value={draft.footer.companyBlurb} onChange={(value) => setFooter("companyBlurb", value)} rows={3} maxLength={500} />
          <Toggle label="Show Buyer Journal link" checked={draft.footer.showBlogLink} onChange={(value) => setFooter("showBlogLink", value)} />
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Buyer readiness points</p>
            <div className="space-y-2">
              {draft.footer.buyerReadiness.map((item, index) => (
                <div key={index} className="grid md:grid-cols-[1fr_1.4fr_auto] gap-2">
                  <input value={item.label} onChange={(event) => { const next = [...draft.footer.buyerReadiness]; next[index] = { ...item, label: event.target.value }; setFooter("buyerReadiness", next); }} className="min-h-11 border border-border/60 bg-background px-3 text-sm" placeholder="Label" />
                  <input value={item.note} onChange={(event) => { const next = [...draft.footer.buyerReadiness]; next[index] = { ...item, note: event.target.value }; setFooter("buyerReadiness", next); }} className="min-h-11 border border-border/60 bg-background px-3 text-sm" placeholder="Note" />
                  <button type="button" onClick={() => setFooter("buyerReadiness", draft.footer.buyerReadiness.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 border border-destructive/40 text-destructive px-3 text-xs">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFooter("buyerReadiness", [...draft.footer.buyerReadiness, { label: "", note: "" }].slice(0, 8))} className="mt-2 min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] hover:border-gold">Add readiness point</button>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Legal links</p>
            <div className="space-y-2">
              {draft.footer.legalLinks.map((item, index) => (
                <div key={index} className="grid md:grid-cols-[1fr_1.4fr_auto] gap-2">
                  <input value={item.label} onChange={(event) => { const next = [...draft.footer.legalLinks]; next[index] = { ...item, label: event.target.value }; setFooter("legalLinks", next); }} className="min-h-11 border border-border/60 bg-background px-3 text-sm" placeholder="Label" />
                  <input value={item.href} onChange={(event) => { const next = [...draft.footer.legalLinks]; next[index] = { ...item, href: event.target.value }; setFooter("legalLinks", next); }} className="min-h-11 border border-border/60 bg-background px-3 text-sm" placeholder="/legal-route" />
                  <button type="button" onClick={() => setFooter("legalLinks", draft.footer.legalLinks.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 border border-destructive/40 text-destructive px-3 text-xs">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFooter("legalLinks", [...draft.footer.legalLinks, { label: "", href: "" }].slice(0, 8))} className="mt-2 min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] hover:border-gold">Add legal link</button>
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
}

function LayoutEditor({ draft, onToggle, onMove, onReset }: { draft: HomeSectionLayout; onToggle: (index: number) => void; onMove: (index: number, direction: -1 | 1) => void; onReset: () => void }) {
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div><h3 className="font-display text-2xl">Homepage sections</h3><p className="text-xs text-muted-foreground mt-1">Hero is locked first and visible so the homepage always retains a primary buyer message.</p></div>
        <button type="button" onClick={onReset} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] hover:border-gold"><RotateCcw size={12} /> Reset default order</button>
      </div>
      <div className="space-y-2">
        {draft.sections.map((section, index) => (
          <div key={section.key} className="border border-border/50 bg-background/35 p-3 flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0 || section.locked || draft.sections[index - 1]?.locked} className="min-h-8 min-w-8 inline-flex items-center justify-center border border-border/50 disabled:opacity-25"><ArrowUp size={12} /></button>
              <button type="button" onClick={() => onMove(index, 1)} disabled={index === draft.sections.length - 1 || section.locked} className="min-h-8 min-w-8 inline-flex items-center justify-center border border-border/50 disabled:opacity-25"><ArrowDown size={12} /></button>
            </div>
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{section.label}</p><p className="text-[10px] text-muted-foreground mt-1">{section.key} · order {section.order}{section.locked ? " · locked" : ""}</p></div>
            <button type="button" onClick={() => onToggle(index)} disabled={section.locked} className={`min-h-11 inline-flex items-center gap-2 border px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-60 ${section.visible ? "border-emerald-500/40 text-emerald-400" : "border-border/60 text-muted-foreground"}`}>
              {section.visible ? <Eye size={13} /> : <EyeOff size={13} />}{section.visible ? "Visible" : "Hidden"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-border/50 bg-background/20 p-4 md:p-5"><h3 className="font-display text-xl mb-4">{title}</h3>{children}</section>;
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`min-h-12 shrink-0 inline-flex items-center gap-2 px-5 text-[10px] uppercase tracking-[0.17em] border-b-2 ${active ? "border-gold text-gold bg-gold/[0.05]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{icon}{children}</button>;
}

function Metric({ label, value, good = false, warn = false }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  return <div className="border border-border/50 bg-background/35 p-3 min-w-0"><p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground truncate">{label}</p><p className={`font-display text-xl mt-1 capitalize truncate ${good ? "text-emerald-500" : warn ? "text-amber-400" : ""}`}>{value}</p></div>;
}
