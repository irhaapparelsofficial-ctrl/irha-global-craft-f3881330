import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const db = supabase as any;

type ReviewStatus = "pending" | "needs_information" | "ready" | "verified";
type Filter = "all" | "incomplete" | ReviewStatus;

type AuditRow = {
  product_id: string;
  name: string;
  slug: string;
  category_id: string;
  is_published: boolean;
  image_url: string | null;
  review_status: ReviewStatus;
  reviewer_notes: string | null;
  not_applicable_fields: string[];
  missing_fields: string[];
  missing_count: number;
  completeness_percent: number;
  verified_at: string | null;
  updated_at: string;
};

type Category = { id: string; name: string };
type Draft = { status: ReviewStatus; notes: string; notApplicable: string[] };

const FIELD_LABELS: Record<string, string> = {
  short_description: "Short buyer description",
  fabric_composition: "Fabric / material composition",
  gsm: "GSM or material weight",
  available_sizes: "Available sizes",
  available_colors: "Available colours",
  sample_timeline: "Sample timeline",
  gallery_4_views: "Four product views",
};

const ALL_FIELDS = Object.keys(FIELD_LABELS);

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending review",
  needs_information: "Needs information",
  ready: "Ready to verify",
  verified: "Verified",
};

const STATUS_CLASSES: Record<ReviewStatus, string> = {
  pending: "border-border/60 text-muted-foreground",
  needs_information: "border-amber-500/45 text-amber-300 bg-amber-500/[0.05]",
  ready: "border-sky-500/45 text-sky-300 bg-sky-500/[0.05]",
  verified: "border-emerald-500/45 text-emerald-300 bg-emerald-500/[0.05]",
};

function draftFor(row: AuditRow): Draft {
  return {
    status: row.review_status,
    notes: row.reviewer_notes || "",
    notApplicable: row.not_applicable_fields || [],
  };
}

function formatDate(value: string | null) {
  if (!value) return "Not verified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ProductQualityCenter() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("incomplete");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [auditResult, categoryResult] = await Promise.all([
      db
        .from("product_quality_audit")
        .select("*")
        .order("missing_count", { ascending: false })
        .order("name", { ascending: true }),
      db.from("categories").select("id,name").order("name", { ascending: true }),
    ]);

    const auditRows = (auditResult.data || []) as AuditRow[];
    setRows(auditRows);
    setCategories((categoryResult.data || []) as Category[]);
    setDrafts((current) => {
      const next = { ...current };
      for (const row of auditRows) next[row.product_id] = next[row.product_id] || draftFor(row);
      return next;
    });
    setError(auditResult.error?.message || categoryResult.error?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);

  const stats = useMemo(() => ({
    total: rows.length,
    incomplete: rows.filter((row) => row.missing_count > 0).length,
    needsInformation: rows.filter((row) => row.review_status === "needs_information").length,
    ready: rows.filter((row) => row.review_status === "ready").length,
    verified: rows.filter((row) => row.review_status === "verified").length,
  }), [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "incomplete" && row.missing_count === 0) return false;
      if (filter !== "all" && filter !== "incomplete" && row.review_status !== filter) return false;
      if (!needle) return true;
      return [row.name, row.slug, categoryMap.get(row.category_id), ...(row.missing_fields || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, filter, categoryMap]);

  const patchDraft = (row: AuditRow, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [row.product_id]: { ...(current[row.product_id] || draftFor(row)), ...patch },
    }));
  };

  const toggleNotApplicable = (row: AuditRow, field: string) => {
    const draft = drafts[row.product_id] || draftFor(row);
    const next = draft.notApplicable.includes(field)
      ? draft.notApplicable.filter((item) => item !== field)
      : [...draft.notApplicable, field];
    patchDraft(row, { notApplicable: next });
  };

  const save = async (row: AuditRow, requestedStatus?: ReviewStatus) => {
    const draft = drafts[row.product_id] || draftFor(row);
    const status = requestedStatus || draft.status;
    setSavingId(row.product_id);

    const { error: saveError } = await db
      .from("product_quality_reviews")
      .upsert({
        product_id: row.product_id,
        status,
        reviewer_notes: draft.notes.trim() || null,
        not_applicable_fields: draft.notApplicable,
      }, { onConflict: "product_id" });

    setSavingId(null);
    if (saveError) {
      toast({ title: "Quality review was not saved", description: saveError.message, variant: "destructive" });
      return;
    }

    toast({
      title: status === "verified" ? "Product verified" : "Product review saved",
      description: row.name,
    });
    await load();
  };

  return (
    <section className="mb-6 space-y-5 border border-gold/30 bg-card/25 p-4 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <ClipboardCheck size={22} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Backend-verified product data</p>
            <h2 className="font-display text-2xl sm:text-3xl mt-1">Product Quality Centre</h2>
            <p className="text-sm text-foreground/65 mt-2 max-w-4xl leading-relaxed">
              This queue checks live product records in owner Supabase. A product cannot be marked verified while required buyer information is missing. Use “not applicable” only where the field genuinely does not apply.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh audit
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Metric label="Total" value={stats.total} />
        <Metric label="Incomplete" value={stats.incomplete} />
        <Metric label="Need information" value={stats.needsInformation} />
        <Metric label="Ready" value={stats.ready} />
        <Metric label="Verified" value={stats.verified} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-2xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, category or missing field…"
            className="min-h-12 w-full border border-border/60 bg-background pl-10 pr-3 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {(["incomplete", "all", "needs_information", "ready", "verified"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "min-h-11 shrink-0 border px-3 text-[10px] uppercase tracking-[0.14em]",
                filter === item ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-muted-foreground",
              )}
            >
              {item.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-500/[0.05] p-4 text-sm text-red-200">
          Product quality data could not load: {error}
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-muted-foreground">Checking live product data…</div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-border/60 p-10 text-center">
          <ShieldCheck size={28} className="mx-auto text-emerald-400" />
          <h3 className="font-display text-2xl mt-4">No product matches this queue</h3>
          <p className="text-sm text-muted-foreground mt-2">Change the filter or search term to review another product.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => {
            const expanded = expandedId === row.product_id;
            const draft = drafts[row.product_id] || draftFor(row);
            const canVerifyNow = row.missing_count === 0;
            return (
              <article key={row.product_id} className="border border-border/60 bg-background/35">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : row.product_id)}
                  className="w-full min-h-24 p-4 sm:p-5 text-left"
                  aria-expanded={expanded}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg sm:text-xl">{row.name}</h3>
                        <span className={cn("inline-flex min-h-7 items-center border px-2 text-[9px] uppercase tracking-[0.13em]", STATUS_CLASSES[row.review_status])}>
                          {STATUS_LABELS[row.review_status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {categoryMap.get(row.category_id) || "Uncategorized"} · {row.is_published ? "Published" : "Draft"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {row.missing_fields.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={13} /> Required data complete</span>
                        ) : row.missing_fields.slice(0, 4).map((field) => (
                          <span key={field} className="border border-amber-500/35 bg-amber-500/[0.05] px-2 py-1 text-[10px] text-amber-200">
                            {FIELD_LABELS[field] || field}
                          </span>
                        ))}
                        {row.missing_fields.length > 4 && <span className="px-2 py-1 text-[10px] text-muted-foreground">+{row.missing_fields.length - 4} more</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-display text-2xl tabular-nums">{row.completeness_percent}%</p>
                        <p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground">complete</p>
                      </div>
                      {expanded ? <ChevronUp size={18} className="text-gold" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border/50 p-4 sm:p-5 space-y-5">
                    {row.missing_count > 0 && (
                      <div className="border border-amber-500/30 bg-amber-500/[0.04] p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Complete these fields in the product editor below</p>
                            <p className="text-xs text-muted-foreground mt-1">Do not guess material, GSM, sizes, colours or timelines. Confirm the real manufacturing specification first.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid lg:grid-cols-2 gap-4">
                      <label className="space-y-2 text-xs text-muted-foreground">
                        <span>Review status</span>
                        <select
                          value={draft.status}
                          onChange={(event) => patchDraft(row, { status: event.target.value as ReviewStatus })}
                          className="min-h-12 w-full border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-gold"
                        >
                          <option value="pending">Pending review</option>
                          <option value="needs_information">Needs information</option>
                          <option value="ready">Ready to verify</option>
                          <option value="verified">Verified</option>
                        </select>
                      </label>
                      <label className="space-y-2 text-xs text-muted-foreground">
                        <span>Internal review notes</span>
                        <textarea
                          rows={3}
                          value={draft.notes}
                          onChange={(event) => patchDraft(row, { notes: event.target.value })}
                          placeholder="Example: confirm GSM and size range with factory before publishing."
                          className="w-full border border-border/60 bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-gold"
                        />
                      </label>
                    </div>

                    <div>
                      <p className="text-xs font-medium">Fields that genuinely do not apply</p>
                      <p className="text-xs text-muted-foreground mt-1">For example, GSM may not apply to a specific non-fabric product. This is not a shortcut for missing information.</p>
                      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-3">
                        {ALL_FIELDS.map((field) => {
                          const checked = draft.notApplicable.includes(field);
                          return (
                            <label key={field} className={cn("min-h-11 flex items-center gap-2 border px-3 text-xs cursor-pointer", checked ? "border-sky-500/45 bg-sky-500/[0.05] text-sky-200" : "border-border/60 text-muted-foreground")}>
                              <input type="checkbox" checked={checked} onChange={() => toggleNotApplicable(row, field)} />
                              {FIELD_LABELS[field]}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void save(row)}
                        disabled={savingId === row.product_id}
                        className="min-h-11 inline-flex items-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.15em] text-gold disabled:opacity-50"
                      >
                        <Save size={14} /> Save review
                      </button>
                      <button
                        type="button"
                        onClick={() => void save(row, "needs_information")}
                        disabled={savingId === row.product_id}
                        className="min-h-11 inline-flex items-center gap-2 border border-amber-500/45 px-4 text-[10px] uppercase tracking-[0.15em] text-amber-300 disabled:opacity-50"
                      >
                        <AlertTriangle size={14} /> Needs information
                      </button>
                      <button
                        type="button"
                        onClick={() => void save(row, "verified")}
                        disabled={savingId === row.product_id || !canVerifyNow}
                        title={canVerifyNow ? "Mark product data verified" : "Complete all required fields first"}
                        className="min-h-11 inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/45 px-4 text-[10px] uppercase tracking-[0.15em] text-emerald-300 disabled:opacity-35"
                      >
                        <CheckCircle2 size={14} /> Verify product
                      </button>
                      <p className="text-xs text-muted-foreground sm:ml-auto">Verified: {formatDate(row.verified_at)}</p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/55 bg-background/35 p-3 sm:p-4">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl sm:text-3xl mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
