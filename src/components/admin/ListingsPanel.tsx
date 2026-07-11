import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ListingStatus = "not_started" | "in_progress" | "pending_verification" | "active" | "needs_attention" | "paused" | "rejected";
type VerificationLevel = "unverified" | "self_reported" | "verified";

type Listing = {
  id: string;
  platform: string;
  account_name: string | null;
  profile_url: string | null;
  status: ListingStatus;
  verification_level: VerificationLevel;
  owner: string | null;
  next_action: string | null;
  notes: string | null;
  source: string;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type ListingDraft = {
  platform: string;
  account_name: string;
  profile_url: string;
  status: ListingStatus;
  verification_level: VerificationLevel;
  owner: string;
  next_action: string;
  notes: string;
};

const STATUSES: ListingStatus[] = ["not_started", "in_progress", "pending_verification", "active", "needs_attention", "paused", "rejected"];
const VERIFICATION_LEVELS: VerificationLevel[] = ["unverified", "self_reported", "verified"];
const emptyDraft: ListingDraft = {
  platform: "",
  account_name: "",
  profile_url: "",
  status: "not_started",
  verification_level: "unverified",
  owner: "",
  next_action: "",
  notes: "",
};

const db = supabase as any;

export default function ListingsPanel() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [editing, setEditing] = useState<Record<string, ListingDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [migrationReady, setMigrationReady] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("business_listings").select("*").order("updated_at", { ascending: false }).limit(300);
    if (error) {
      if (isMigrationError(error)) {
        setMigrationReady(false);
        setRows([]);
      } else {
        toast({ title: "Listings could not load", description: error.message, variant: "destructive" });
      }
    } else {
      setMigrationReady(true);
      const next = (data ?? []) as Listing[];
      setRows(next);
      setEditing(Object.fromEntries(next.map((row) => [row.id, toDraft(row)])));
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.platform, row.account_name, row.profile_url, row.status, row.next_action, row.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle));
  }, [query, rows]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    verified: rows.filter((row) => row.verification_level === "verified").length,
    attention: rows.filter((row) => ["needs_attention", "pending_verification"].includes(row.status)).length,
  }), [rows]);

  const createListing = async () => {
    const platform = draft.platform.trim();
    const nextAction = draft.next_action.trim();
    if (!platform || !nextAction) {
      toast({ title: "Platform and next action are required", variant: "destructive" });
      return;
    }
    const profileUrl = normalizeUrl(draft.profile_url);
    if (draft.profile_url.trim() && !profileUrl) {
      toast({ title: "Invalid profile URL", description: "Use a complete http(s) URL.", variant: "destructive" });
      return;
    }

    setCreating(true);
    const { error } = await db.from("business_listings").insert({
      platform,
      account_name: draft.account_name.trim() || null,
      profile_url: profileUrl,
      status: draft.status,
      verification_level: draft.verification_level,
      owner: draft.owner.trim() || null,
      next_action: nextAction,
      notes: draft.notes.trim() || null,
      source: "admin",
      last_verified_at: draft.verification_level === "verified" ? new Date().toISOString() : null,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Listing could not be saved", description: error.message, variant: "destructive" });
      return;
    }
    setDraft(emptyDraft);
    toast({ title: "Listing record created" });
    await load();
  };

  const saveListing = async (row: Listing) => {
    const value = editing[row.id];
    if (!value) return;
    const platform = value.platform.trim();
    const nextAction = value.next_action.trim();
    if (!platform || !nextAction) {
      toast({ title: "Platform and next action are required", variant: "destructive" });
      return;
    }
    const profileUrl = normalizeUrl(value.profile_url);
    if (value.profile_url.trim() && !profileUrl) {
      toast({ title: "Invalid profile URL", variant: "destructive" });
      return;
    }

    setSavingId(row.id);
    const verificationChangedToVerified = row.verification_level !== "verified" && value.verification_level === "verified";
    const { error } = await db.from("business_listings").update({
      platform,
      account_name: value.account_name.trim() || null,
      profile_url: profileUrl,
      status: value.status,
      verification_level: value.verification_level,
      owner: value.owner.trim() || null,
      next_action: nextAction,
      notes: value.notes.trim() || null,
      last_verified_at: verificationChangedToVerified ? new Date().toISOString() : row.last_verified_at,
    }).eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Listing update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Listing updated" });
    await load();
  };

  const removeListing = async (row: Listing) => {
    if (!window.confirm(`Delete the ${row.platform} listing record? This does not delete the external account.`)) return;
    const { error } = await db.from("business_listings").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Listing record could not be deleted", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Listing record deleted" });
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="border border-border/60 bg-card/30 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-2">Truthful Listing Registry</p>
            <h2 className="font-display text-3xl">B2B Directories & Marketplaces</h2>
            <p className="text-xs text-foreground/65 mt-2 max-w-3xl leading-relaxed">
              Only real account URLs, verification states and next actions belong here. The old invented product counts and monthly views have been removed. AI Command Center can propose listing tasks, but they enter this registry only after approval.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </section>

      {!migrationReady && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-xl">Listings migration pending</h3>
            <p className="text-xs text-foreground/70 mt-2">Apply/publish the AI Command Center migration before listing records can be stored.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Tracked platforms" value={stats.total} />
        <Metric label="Active records" value={stats.active} />
        <Metric label="Verified" value={stats.verified} />
        <Metric label="Need attention" value={stats.attention} emphasis={stats.attention > 0} />
      </div>

      <section className="border border-border/60 bg-card/30 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plus size={15} className="text-gold" />
          <h3 className="font-display text-2xl">Add a real listing record</h3>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="Platform *"><input className="listing-input" value={draft.platform} onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value }))} placeholder="Fibre2Fashion" /></Field>
          <Field label="Account / company name"><input className="listing-input" value={draft.account_name} onChange={(event) => setDraft((current) => ({ ...current, account_name: event.target.value }))} placeholder="Irha Apparels" /></Field>
          <Field label="Profile URL"><input className="listing-input" value={draft.profile_url} onChange={(event) => setDraft((current) => ({ ...current, profile_url: event.target.value }))} placeholder="https://…" /></Field>
          <Field label="Owner"><input className="listing-input" value={draft.owner} onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))} placeholder="Daim / team" /></Field>
          <Field label="Status"><SelectStatus value={draft.status} onChange={(status) => setDraft((current) => ({ ...current, status }))} /></Field>
          <Field label="Verification"><SelectVerification value={draft.verification_level} onChange={(verification_level) => setDraft((current) => ({ ...current, verification_level }))} /></Field>
          <Field label="Next action *" wide><input className="listing-input" value={draft.next_action} onChange={(event) => setDraft((current) => ({ ...current, next_action: event.target.value }))} placeholder="Complete company profile and upload first verified products" /></Field>
          <Field label="Notes" wide><textarea rows={3} className="listing-input resize-y" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Login state, verification issue, category requirements, content needed…" /></Field>
        </div>
        <button type="button" onClick={() => void createListing()} disabled={creating || !migrationReady} className="mt-5 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40">
          {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Save listing record
        </button>
      </section>

      <div className="flex items-center gap-3 border border-border/60 bg-card/20 px-4 py-3">
        <Search size={14} className="text-muted-foreground" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search platform, URL, status, next action or notes…" className="flex-1 bg-transparent outline-none text-sm" />
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Loading listings…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border/60 bg-card/20 p-12 text-center">
          <XCircle size={26} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-xl">No verified listing records yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">Add the platforms where an account actually exists, or ask AI Command Center to propose an approval-based listings plan.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map((row) => {
            const value = editing[row.id] ?? toDraft(row);
            return (
              <article key={row.id} className="border border-border/60 bg-card/30 p-5">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusIcon status={row.status} />
                      <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{row.source}</span>
                      <span className={`text-[9px] uppercase tracking-[0.16em] ${row.verification_level === "verified" ? "text-emerald-300" : "text-amber-300"}`}>{row.verification_level.replace(/_/g, " ")}</span>
                    </div>
                    <h3 className="font-display text-2xl text-gold mt-2">{row.platform}</h3>
                    {row.last_verified_at && <p className="text-[10px] text-muted-foreground mt-1">Verified {new Date(row.last_verified_at).toLocaleString()}</p>}
                  </div>
                  {row.profile_url && (
                    <a href={row.profile_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-gold hover:underline">Open <ExternalLink size={11} /></a>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Platform"><input className="listing-input" value={value.platform} onChange={(event) => updateEdit(setEditing, row.id, { platform: event.target.value })} /></Field>
                  <Field label="Account name"><input className="listing-input" value={value.account_name} onChange={(event) => updateEdit(setEditing, row.id, { account_name: event.target.value })} /></Field>
                  <Field label="Profile URL" wide><input className="listing-input" value={value.profile_url} onChange={(event) => updateEdit(setEditing, row.id, { profile_url: event.target.value })} /></Field>
                  <Field label="Status"><SelectStatus value={value.status} onChange={(status) => updateEdit(setEditing, row.id, { status })} /></Field>
                  <Field label="Verification"><SelectVerification value={value.verification_level} onChange={(verification_level) => updateEdit(setEditing, row.id, { verification_level })} /></Field>
                  <Field label="Owner" wide><input className="listing-input" value={value.owner} onChange={(event) => updateEdit(setEditing, row.id, { owner: event.target.value })} /></Field>
                  <Field label="Next action" wide><textarea rows={2} className="listing-input resize-y" value={value.next_action} onChange={(event) => updateEdit(setEditing, row.id, { next_action: event.target.value })} /></Field>
                  <Field label="Notes" wide><textarea rows={3} className="listing-input resize-y" value={value.notes} onChange={(event) => updateEdit(setEditing, row.id, { notes: event.target.value })} /></Field>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Updated {new Date(row.updated_at).toLocaleString()}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void removeListing(row)} className="inline-flex items-center gap-1 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-destructive hover:text-destructive"><Trash2 size={11} /> Delete record</button>
                    <button type="button" onClick={() => void saveListing(row)} disabled={savingId === row.id} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2 text-[10px] uppercase tracking-[0.16em] disabled:opacity-40">
                      {savingId === row.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .listing-input {
          width: 100%;
          background: hsl(var(--input));
          border: 1px solid hsl(var(--border));
          padding: 0.65rem 0.75rem;
          font-size: 0.75rem;
          outline: none;
        }
        .listing-input:focus { border-color: hsl(var(--primary)); }
      `}</style>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SelectStatus({ value, onChange }: { value: ListingStatus; onChange: (value: ListingStatus) => void }) {
  return (
    <select className="listing-input" value={value} onChange={(event) => onChange(event.target.value as ListingStatus)}>
      {STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
    </select>
  );
}

function SelectVerification({ value, onChange }: { value: VerificationLevel; onChange: (value: VerificationLevel) => void }) {
  return (
    <select className="listing-input" value={value} onChange={(event) => onChange(event.target.value as VerificationLevel)}>
      {VERIFICATION_LEVELS.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
    </select>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`border p-4 ${emphasis ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-card/30"}`}>
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-display text-3xl mt-2">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: ListingStatus }) {
  if (status === "active") return <CheckCircle2 size={15} className="text-emerald-400" />;
  if (["in_progress", "pending_verification", "needs_attention"].includes(status)) return <AlertCircle size={15} className="text-amber-400" />;
  return <XCircle size={15} className="text-muted-foreground" />;
}

function toDraft(row: Listing): ListingDraft {
  return {
    platform: row.platform,
    account_name: row.account_name || "",
    profile_url: row.profile_url || "",
    status: row.status,
    verification_level: row.verification_level,
    owner: row.owner || "",
    next_action: row.next_action || "",
    notes: row.notes || "",
  };
}

function updateEdit(setter: React.Dispatch<React.SetStateAction<Record<string, ListingDraft>>>, id: string, patch: Partial<ListingDraft>) {
  setter((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isMigrationError(error: any) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("42p01") || text.includes("business_listings");
}
