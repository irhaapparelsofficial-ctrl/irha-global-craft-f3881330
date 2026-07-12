import { useEffect, useMemo, useState } from "react";
import { Edit3, HelpCircle, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { FaqRow } from "./contentCmsTypes";
import { isMissingSchemaError } from "./contentCmsTypes";
import { EditorModal, Field, PrimaryButton, SecondaryButton, StatusBadge, TextArea, Toggle } from "./ContentFormPrimitives";

const db = supabase as any;

type Draft = {
  id?: string;
  locale: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
};

const emptyDraft = (): Draft => ({ locale: "en", category: "General", question: "", answer: "", sort_order: 0, is_published: false });
const toDraft = (row: FaqRow): Draft => ({ id: row.id, locale: row.locale, category: row.category || "General", question: row.question, answer: row.answer, sort_order: row.sort_order, is_published: row.is_published });

export default function FaqContentPanel({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<FaqRow[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: queryError } = await db.from("faqs").select("*").order("category").order("sort_order").limit(1000);
    setRows((data as FaqRow[] | null) || []);
    setError(queryError?.message || null);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category || "General"))).sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "all" && (row.category || "General") !== category) return false;
      if (!needle) return true;
      return [row.category, row.question, row.answer].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [category, query, rows]);

  const save = async () => {
    if (!editing) return;
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(editing.locale.trim())) {
      toast({ title: "Locale must look like en or de-DE", variant: "destructive" });
      return;
    }
    if (editing.question.trim().length < 5 || editing.answer.trim().length < 10) {
      toast({ title: "Question or answer is too short", variant: "destructive" });
      return;
    }

    const payload = {
      locale: editing.locale.trim(),
      category: editing.category.trim() || "General",
      question: editing.question.trim(),
      answer: editing.answer.trim(),
      sort_order: Number(editing.sort_order) || 0,
      is_published: editing.is_published,
    };
    setSaving(true);
    const result = editing.id
      ? await db.from("faqs").update(payload).eq("id", editing.id).select("*").single()
      : await db.from("faqs").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) {
      toast({ title: "FAQ save failed", description: result.error.message, variant: "destructive" });
      return;
    }
    const saved = result.data as FaqRow;
    setRows((current) => [...current.filter((row) => row.id !== saved.id), saved].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.sort_order - b.sort_order));
    setEditing(null);
    toast({ title: editing.id ? "FAQ updated" : "FAQ created", description: saved.is_published ? "Published answer is available on the buyer FAQ." : "Saved as a private draft." });
    onChanged();
  };

  const remove = async (row: FaqRow) => {
    if (!window.confirm(`Delete FAQ "${row.question}"?`)) return;
    const { error: deleteError } = await db.from("faqs").delete().eq("id", row.id);
    if (deleteError) {
      toast({ title: "Delete failed", description: deleteError.message, variant: "destructive" });
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast({ title: "FAQ deleted" });
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search question, answer or category…" className="min-h-11 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 border border-border/60 bg-background px-3 text-sm">
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
        <button type="button" onClick={() => setEditing(emptyDraft())} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-background px-4 text-[10px] uppercase tracking-[0.18em]"><Plus size={13} /> New FAQ</button>
      </div>

      {error && <div className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70"><p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "Final database activation pending" : "FAQ records could not load"}</p><p className="mt-1 break-words">{error}</p></div>}

      {loading ? <div className="py-14 text-center text-sm text-muted-foreground">Loading FAQ records…</div> : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/25 p-10 text-center"><HelpCircle size={28} className="mx-auto text-muted-foreground mb-4" /><h3 className="font-display text-2xl">No matching FAQ</h3><p className="text-sm text-muted-foreground mt-2">Create answers as drafts and publish after review.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <article key={row.id} className="border border-border/50 bg-card/20 p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-gold">{row.category || "General"} · {row.locale}</p>
                  <h3 className="font-display text-lg md:text-xl mt-2">{row.question}</h3>
                  <p className="text-sm text-foreground/65 mt-2 leading-relaxed line-clamp-3">{row.answer}</p>
                </div>
                <div className="flex md:flex-col md:items-end gap-2 shrink-0">
                  <StatusBadge published={row.is_published} />
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setEditing(toDraft(row))} className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Edit"><Edit3 size={14} /></button>
                    <button type="button" onClick={() => void remove(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center text-destructive/70 hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <EditorModal eyebrow={editing.id ? "Edit FAQ" : "New FAQ"} title={editing.question || "Buyer question"} onClose={() => setEditing(null)} footer={<><SecondaryButton onClick={() => setEditing(null)} disabled={saving}>Cancel</SecondaryButton><PrimaryButton onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : editing.is_published ? "Save & publish" : "Save draft"}</PrimaryButton></>}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Locale" value={editing.locale} onChange={(value) => setEditing({ ...editing, locale: value })} placeholder="en or de-DE" required />
            <Field label="Category" value={editing.category} onChange={(value) => setEditing({ ...editing, category: value })} maxLength={120} required />
            <div className="md:col-span-2"><TextArea label="Question" value={editing.question} onChange={(value) => setEditing({ ...editing, question: value })} rows={3} maxLength={300} required /></div>
            <div className="md:col-span-2"><TextArea label="Answer" value={editing.answer} onChange={(value) => setEditing({ ...editing, answer: value })} rows={7} maxLength={4000} required /></div>
            <Field label="Sort order" type="number" value={editing.sort_order} onChange={(value) => setEditing({ ...editing, sort_order: Number(value) || 0 })} />
            <Toggle label="Publish FAQ" checked={editing.is_published} onChange={(value) => setEditing({ ...editing, is_published: value })} description="Published answers appear on /faq and in FAQ structured data." />
          </div>
        </EditorModal>
      )}
    </div>
  );
}
