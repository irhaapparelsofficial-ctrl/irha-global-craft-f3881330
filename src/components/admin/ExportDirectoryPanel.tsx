import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Globe, Mail, Phone, ExternalLink, Plus, Search, Trash2, RefreshCw, Users } from "lucide-react";

const STATUSES = ["New", "Pitched", "Warm", "Replied", "Rejected"] as const;
type LeadStatus = typeof STATUSES[number];

const SEGMENTS = [
  "Lederhosen", "Bavarian Wear", "Sportswear", "Streetwear",
  "Activewear", "Workwear", "Outerwear", "Denim", "Hi-Vis", "Custom"
];

const COUNTRIES = ["Germany", "Austria", "Switzerland", "USA", "UK", "Canada", "Australia"];

type Lead = {
  id: string;
  company_name: string;
  country: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  apparel_segment: string | null;
  lead_status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_TONE: Record<LeadStatus, string> = {
  New: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  Pitched: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  Warm: "border-orange-500/50 text-orange-300 bg-orange-500/10",
  Replied: "border-industrial/50 text-industrial bg-industrial/10",
  Rejected: "border-destructive/40 text-destructive bg-destructive/5",
};

// supabase types haven't regenerated yet for b2b_leads — cast to any-typed client locally
const db = supabase as unknown as {
  from: (t: string) => any;
};

export default function ExportDirectoryPanel() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [segment, setSegment] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("b2b_leads").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data as Lead[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (country !== "all" && r.country !== country) return false;
      if (segment !== "all" && r.apparel_segment !== segment) return false;
      if (status !== "all" && r.lead_status !== status) return false;
      if (!term) return true;
      return [r.company_name, r.email, r.website, r.notes].some((v) => v?.toLowerCase().includes(term));
    });
  }, [rows, q, country, segment, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length };
    STATUSES.forEach((s) => (c[s] = rows.filter((r) => r.lead_status === s).length));
    return c;
  }, [rows]);

  const updateStatus = async (id: string, lead_status: LeadStatus) => {
    const { error } = await db.from("b2b_leads").update({ lead_status }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setRows((p) => p.map((r) => (r.id === id ? { ...r, lead_status } : r)));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await db.from("b2b_leads").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setRows((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Total" value={counts.total} accent />
        {STATUSES.map((s) => <Stat key={s} label={s} value={counts[s] ?? 0} />)}
      </div>

      {/* Toolbar */}
      <div className="border border-border/60 bg-card/40 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, email, website, notes…"
            className="w-full bg-background border border-border/60 pl-9 pr-3 py-2 text-sm focus:border-primary outline-none"
          />
        </div>
        <Select value={country} onChange={setCountry} options={[{ v: "all", l: "All countries" }, ...COUNTRIES.map((c) => ({ v: c, l: c }))]} />
        <Select value={segment} onChange={setSegment} options={[{ v: "all", l: "All segments" }, ...SEGMENTS.map((s) => ({ v: s, l: s }))]} />
        <Select value={status} onChange={setStatus} options={[{ v: "all", l: "All status" }, ...STATUSES.map((s) => ({ v: s, l: s }))]} />
        <button onClick={load} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary px-3 py-2 border border-border/60">
          <RefreshCw size={12} /> Refresh
        </button>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] bg-industrial text-background px-4 py-2 hover:brightness-110">
          <Plus size={14} /> Add Lead
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading directory…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/30 py-20 text-center">
          <Users className="mx-auto text-muted-foreground mb-3" size={28} />
          <p className="text-sm text-muted-foreground">No leads match your filters.</p>
        </div>
      ) : (
        <div className="border border-border/60 bg-card/30 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 border-b border-border/60 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <tr>
                <Th>Company</Th>
                <Th>Country</Th>
                <Th>Segment</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-secondary/20 align-top">
                  <Td>
                    <div className="font-medium text-foreground">{r.company_name}</div>
                    {r.website && (
                      <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary mt-1">
                        <ExternalLink size={10} /> {r.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {r.notes && <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 max-w-[280px]">{r.notes}</p>}
                  </Td>
                  <Td><span className="inline-flex items-center gap-1.5 text-xs"><Globe size={11} className="text-muted-foreground" /> {r.country}</span></Td>
                  <Td>{r.apparel_segment ? <span className="text-xs px-2 py-1 border border-border/60 bg-background/60">{r.apparel_segment}</span> : <span className="text-muted-foreground">—</span>}</Td>
                  <Td>
                    <div className="space-y-1 text-xs">
                      {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail size={11} /> {r.email}</a>}
                      {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"><Phone size={11} /> {r.phone}</a>}
                      {!r.email && !r.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </Td>
                  <Td>
                    <select value={r.lead_status} onChange={(e) => updateStatus(r.id, e.target.value as LeadStatus)}
                      className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 border bg-transparent ${STATUS_TONE[r.lead_status]} outline-none cursor-pointer`}>
                      {STATUSES.map((s) => <option key={s} value={s} className="bg-background text-foreground">{s}</option>)}
                    </select>
                  </Td>
                  <Td className="text-right">
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive p-1.5" title="Delete"><Trash2 size={14} /></button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void load(); }} />}
    </div>
  );
}

function AddLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    company_name: "", country: COUNTRIES[0], website: "", email: "", phone: "",
    apparel_segment: SEGMENTS[0], lead_status: "New" as LeadStatus, notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) return toast({ title: "Company name required", variant: "destructive" });
    setSaving(true);
    const { error } = await db.from("b2b_leads").insert({
      ...form,
      website: form.website.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Lead added", description: form.company_name });
    onSaved();
  };

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-card border border-border/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="font-display text-xl">Add B2B Lead</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
        </div>
        <Field label="Company name *"><input required maxLength={200} value={form.company_name} onChange={upd("company_name")} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country"><select value={form.country} onChange={upd("country")} className={inputCls}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Apparel segment"><select value={form.apparel_segment} onChange={upd("apparel_segment")} className={inputCls}>{SEGMENTS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Website"><input value={form.website} onChange={upd("website")} placeholder="example.com" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input type="email" value={form.email} onChange={upd("email")} className={inputCls} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={upd("phone")} className={inputCls} /></Field>
        </div>
        <Field label="Initial status"><select value={form.lead_status} onChange={upd("lead_status")} className={inputCls}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Notes"><textarea rows={3} maxLength={2000} value={form.notes} onChange={upd("notes")} className={inputCls} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-[0.25em] px-4 py-2 border border-border/60 hover:border-foreground">Cancel</button>
          <button type="submit" disabled={saving} className="text-xs uppercase tracking-[0.25em] px-4 py-2 bg-industrial text-background disabled:opacity-50 hover:brightness-110">
            {saving ? "Saving…" : "Save Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-primary outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-background border border-border/60 px-3 py-2 text-xs uppercase tracking-[0.2em] focus:border-primary outline-none">
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border ${accent ? "border-industrial/50 bg-industrial/5" : "border-border/60 bg-card/40"} px-4 py-3`}>
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display mt-1 tabular-nums ${accent ? "text-industrial" : ""}`}>{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-normal px-4 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
