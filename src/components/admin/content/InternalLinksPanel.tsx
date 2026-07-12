import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, Link2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { InternalLinkRow } from "./contentCmsTypes";
import { isMissingSchemaError, normalizeRoute } from "./contentCmsTypes";
import { EditorModal, Field, PrimaryButton, SecondaryButton, StatusBadge, Toggle } from "./ContentFormPrimitives";

const db = supabase as any;

type Draft = {
  id?: string;
  from_route: string;
  to_route: string;
  anchor_text: string;
  locale: string;
  priority: number;
  is_published: boolean;
};

const emptyDraft = (): Draft => ({ from_route: "/", to_route: "/products", anchor_text: "View products", locale: "en", priority: 0, is_published: false });
const toDraft = (row: InternalLinkRow): Draft => ({ id: row.id, from_route: row.from_route, to_route: row.to_route, anchor_text: row.anchor_text, locale: row.locale, priority: row.priority, is_published: row.is_published });

export default function InternalLinksPanel({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<InternalLinkRow[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: queryError } = await db.from("internal_links").select("*").order("from_route").order("priority", { ascending: false }).limit(2000);
    setRows((data as InternalLinkRow[] | null) || []);
    setError(queryError?.message || null);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.from_route, row.to_route, row.anchor_text, row.locale].join(" ").toLowerCase().includes(needle));
  }, [query, rows]);

  const save = async () => {
    if (!editing) return;
    const fromRoute = normalizeRoute(editing.from_route);
    const toRoute = normalizeRoute(editing.to_route);
    if (!fromRoute || !toRoute) {
      toast({ title: "Both routes must be clean internal paths", description: "Use routes such as /products or /faq without query strings.", variant: "destructive" });
      return;
    }
    if (fromRoute === toRoute) {
      toast({ title: "Source and destination cannot be the same", variant: "destructive" });
      return;
    }
    if (editing.anchor_text.trim().length < 2) {
      toast({ title: "Anchor text is required", variant: "destructive" });
      return;
    }
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(editing.locale.trim())) {
      toast({ title: "Locale must look like en or de-DE", variant: "destructive" });
      return;
    }

    const payload = {
      from_route: fromRoute,
      to_route: toRoute,
      anchor_text: editing.anchor_text.trim(),
      locale: editing.locale.trim(),
      priority: Number(editing.priority) || 0,
      is_published: editing.is_published,
    };
    setSaving(true);
    const result = editing.id
      ? await db.from("internal_links").update(payload).eq("id", editing.id).select("*").single()
      : await db.from("internal_links").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) {
      toast({ title: "Internal link save failed", description: result.error.message, variant: "destructive" });
      return;
    }
    const saved = result.data as InternalLinkRow;
    setRows((current) => [...current.filter((row) => row.id !== saved.id), saved].sort((a, b) => a.from_route.localeCompare(b.from_route) || b.priority - a.priority));
    setEditing(null);
    toast({ title: editing.id ? "Internal link updated" : "Internal link created", description: saved.is_published ? `Visible on ${saved.from_route}.` : "Saved as a private draft." });
    onChanged();
  };

  const remove = async (row: InternalLinkRow) => {
    if (!window.confirm(`Delete link "${row.anchor_text}" from ${row.from_route}?`)) return;
    const { error: deleteError } = await db.from("internal_links").delete().eq("id", row.id);
    if (deleteError) {
      toast({ title: "Delete failed", description: deleteError.message, variant: "destructive" });
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast({ title: "Internal link deleted" });
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source, destination or anchor…" className="min-h-11 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" />
        </div>
        <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
        <button type="button" onClick={() => setEditing(emptyDraft())} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-background px-4 text-[10px] uppercase tracking-[0.18em]"><Plus size={13} /> New link</button>
      </div>

      {error && <div className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70"><p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "Final database activation pending" : "Internal links could not load"}</p><p className="mt-1 break-words">{error}</p></div>}

      {loading ? <div className="py-14 text-center text-sm text-muted-foreground">Loading internal links…</div> : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/25 p-10 text-center"><Link2 size={28} className="mx-auto text-muted-foreground mb-4" /><h3 className="font-display text-2xl">No matching internal link</h3><p className="text-sm text-muted-foreground mt-2">Published links appear before the footer only on their exact source route.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <article key={row.id} className="border border-border/50 bg-card/20 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">From {row.from_route} · {row.locale} · Priority {row.priority}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{row.anchor_text}</span><span className="text-muted-foreground">→</span><span className="text-gold break-all">{row.to_route}</span></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge published={row.is_published} />
                  <a href={row.to_route} target="_blank" rel="noreferrer" className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Open destination"><ExternalLink size={14} /></a>
                  <button type="button" onClick={() => setEditing(toDraft(row))} className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Edit"><Edit3 size={14} /></button>
                  <button type="button" onClick={() => void remove(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center text-destructive/70 hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <EditorModal eyebrow={editing.id ? "Edit internal link" : "New internal link"} title={editing.anchor_text || "Related buyer page"} onClose={() => setEditing(null)} footer={<><SecondaryButton onClick={() => setEditing(null)} disabled={saving}>Cancel</SecondaryButton><PrimaryButton onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : editing.is_published ? "Save & publish" : "Save draft"}</PrimaryButton></>}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Source route" value={editing.from_route} onChange={(value) => setEditing({ ...editing, from_route: value })} placeholder="/products/sportswear" required />
            <Field label="Destination route" value={editing.to_route} onChange={(value) => setEditing({ ...editing, to_route: value })} placeholder="/inquiry" required />
            <div className="md:col-span-2"><Field label="Anchor text" value={editing.anchor_text} onChange={(value) => setEditing({ ...editing, anchor_text: value })} maxLength={120} required /></div>
            <Field label="Locale" value={editing.locale} onChange={(value) => setEditing({ ...editing, locale: value })} placeholder="en or de-DE" required />
            <Field label="Priority" type="number" value={editing.priority} onChange={(value) => setEditing({ ...editing, priority: Number(value) || 0 })} />
            <div className="md:col-span-2"><Toggle label="Publish internal link" checked={editing.is_published} onChange={(value) => setEditing({ ...editing, is_published: value })} description="Published links appear on the exact source route. Draft links remain private." /></div>
          </div>
        </EditorModal>
      )}
    </div>
  );
}
