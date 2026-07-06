import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileText, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type UploadedFile = {
  path?: string;
  name?: string;
  size?: number;
  mime?: string;
};

type LeadContext = {
  intent_detail?: string | null;
  inquiry_ref?: string | null;
  product_slug?: string | null;
  product_name?: string | null;
  product_slugs?: string[] | null;
  product_names?: string[] | null;
  category?: string | null;
  buyer_type?: string | null;
  destination_country?: string | null;
  shortlist_origin?: boolean;
  compare_origin?: boolean;
  uploaded_files?: UploadedFile[];
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  source_page?: string | null;
  referrer?: string | null;
  submitted_at?: string | null;
  [key: string]: unknown;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  phone: string | null;
  category: string | null;
  quantity: string | null;
  message: string | null;
  source: string | null;
  status: string;
  intent?: string | null;
  inquiry_ref?: string | null;
  lead_context?: LeadContext | null;
  created_at: string;
};

const STATUSES = [
  "new",
  "read",
  "unqualified",
  "qualified",
  "contacted",
  "replied",
  "sample_requested",
  "quote_requested",
  "quotation_sent",
  "negotiation",
  "follow_up",
  "won",
  "lost",
  "spam",
  "quoted",
  "waiting",
] as const;

const statusLabel: Record<string, string> = {
  new: "New",
  read: "Read",
  unqualified: "Unqualified",
  qualified: "Qualified",
  contacted: "Contacted",
  replied: "Replied",
  sample_requested: "Sample Requested",
  quote_requested: "Quote Requested",
  quotation_sent: "Quotation Sent",
  negotiation: "Negotiation",
  follow_up: "Follow-up",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
  quoted: "Quoted (legacy)",
  waiting: "Waiting (legacy)",
};

const statusColor: Record<string, string> = {
  new: "bg-gold/20 text-gold border-gold/40",
  read: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  unqualified: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
  qualified: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  replied: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  sample_requested: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
  quote_requested: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  quotation_sent: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  negotiation: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  follow_up: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  lost: "bg-red-500/15 text-red-300 border-red-500/40",
  spam: "bg-foreground/10 text-foreground/50 border-foreground/20",
  quoted: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  waiting: "bg-purple-500/15 text-purple-300 border-purple-500/40",
};

function contextFor(row: Lead): LeadContext {
  return row.lead_context && typeof row.lead_context === "object" ? row.lead_context : {};
}

function intentLabel(row: Lead) {
  const ctx = contextFor(row);
  const value = ctx.intent_detail || row.intent || "general";
  return String(value).replace(/[-_]/g, " ");
}

function productSummary(row: Lead) {
  const ctx = contextFor(row);
  if (ctx.product_name) return ctx.product_name;
  if (ctx.product_names?.length) return ctx.product_names.join(", ");
  if (row.category) return row.category;
  return "—";
}

function formatBytes(value?: number) {
  if (!value || value < 1) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function LeadsPanel() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Could not load leads", description: error.message, variant: "destructive" });
    setRows((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const previous = rows;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
    if (error) {
      setRows(previous);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  };

  const filtered = useMemo(() => rows.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const ctx = contextFor(row);
    return [
      row.name,
      row.company,
      row.country,
      row.email,
      row.phone,
      row.category,
      row.source,
      row.intent,
      row.inquiry_ref,
      ctx.inquiry_ref,
      ctx.intent_detail,
      ctx.product_name,
      ...(ctx.product_names ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
  }), [q, rows, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    new: rows.filter((row) => row.status === "new").length,
    qualified: rows.filter((row) => row.status === "qualified").length,
    action: rows.filter((row) => ["new", "qualified", "replied", "quote_requested", "sample_requested", "follow_up"].includes(row.status)).length,
  }), [rows]);

  const exportCsv = () => {
    const headers = [
      "Created",
      "Inquiry Ref",
      "Intent",
      "Name",
      "Company",
      "Country",
      "Email",
      "Phone",
      "Buyer Type",
      "Product Context",
      "Quantity",
      "Source",
      "Status",
      "Files",
      "Message",
    ];
    const lines = [headers.join(",")];
    for (const row of filtered) {
      const ctx = contextFor(row);
      const values = [
        new Date(row.created_at).toISOString(),
        row.inquiry_ref || ctx.inquiry_ref || "",
        intentLabel(row),
        row.name,
        row.company || "",
        row.country || "",
        row.email,
        row.phone || "",
        ctx.buyer_type || "",
        productSummary(row),
        row.quantity || "",
        row.source || "",
        row.status,
        (ctx.uploaded_files ?? []).map((file) => file.name || file.path || "file").join(" | "),
        (row.message || "").replace(/\n/g, " "),
      ];
      lines.push(values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `irha-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Total inquiries", stats.total],
          ["New", stats.new],
          ["Qualified", stats.qualified],
          ["Needs action", stats.action],
        ].map(([label, value]) => (
          <div key={String(label)} className="border border-border/60 bg-card/30 px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
            <p className="font-display text-2xl mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 border border-border/60 bg-card/30 px-4 py-2.5 flex-1 min-w-[220px] max-w-xl">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search buyer, company, inquiry ref, product…"
            className="bg-transparent text-sm w-full outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card/30 border border-border/60 px-3 py-2.5 text-xs uppercase tracking-[0.15em]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
        </select>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
          <Download size={12} /> Export CSV
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-auto">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="border border-border/60 overflow-x-auto">
        <table className="w-full text-sm min-w-[1120px]">
          <thead className="bg-card/60 text-[10px] uppercase tracking-[0.2em] text-gold/80">
            <tr>
              {['Date / Ref', 'Buyer', 'Contact', 'Intent', 'Product context', 'Source', 'Status', ''].map((heading) => (
                <th key={heading} className="text-left px-4 py-3 font-normal">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">
                No leads match this view. New RFQ, sample, catalogue, reference and meeting inquiries appear here from the live inquiry flow.
              </td></tr>
            )}
            {filtered.map((row) => {
              const ctx = contextFor(row);
              const files = ctx.uploaded_files ?? [];
              const inquiryRef = row.inquiry_ref || ctx.inquiry_ref || "—";
              const expanded = expandedId === row.id;
              return (
                <>
                  <tr key={row.id} className="border-t border-border/40 hover:bg-card/40 align-top">
                    <td className="px-4 py-3 text-foreground/60 whitespace-nowrap text-xs">
                      <div>{new Date(row.created_at).toLocaleDateString()}</div>
                      <code className="block mt-1 text-[10px] text-gold/80">{inquiryRef}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-foreground/60 mt-1">{row.company || "No company provided"}</div>
                      {ctx.buyer_type && <div className="text-[10px] uppercase tracking-[0.15em] text-foreground/45 mt-1">{String(ctx.buyer_type)}</div>}
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <a href={`mailto:${row.email}`} className="block text-gold hover:underline text-xs">{row.email}</a>
                      {row.phone && (
                        <a href={`https://wa.me/${row.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="block text-emerald-400 hover:underline text-xs">
                          {row.phone}
                        </a>
                      )}
                      <div className="text-[10px] text-foreground/45">{row.country || ctx.destination_country || "Country not provided"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">
                      {intentLabel(row)}
                      {ctx.compare_origin && <span className="block mt-1 text-[9px] uppercase tracking-[0.16em] text-purple-300">Compare origin</span>}
                      {ctx.shortlist_origin && <span className="block mt-1 text-[9px] uppercase tracking-[0.16em] text-cyan-300">Shortlist origin</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground/70 text-xs max-w-[260px]">
                      <div className="line-clamp-2">{productSummary(row)}</div>
                      {row.quantity && <div className="mt-1 text-[10px] text-foreground/45">Qty: {row.quantity}</div>}
                      {files.length > 0 && <div className="mt-1 text-[10px] text-gold/70">{files.length} file{files.length > 1 ? "s" : ""} attached</div>}
                    </td>
                    <td className="px-4 py-3 text-foreground/60 text-[11px]">
                      <div>{row.source || "—"}</div>
                      {ctx.utm_source && <div className="mt-1">utm: {String(ctx.utm_source)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status}
                        onChange={(e) => void updateStatus(row.id, e.target.value)}
                        className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1.5 border bg-transparent ${statusColor[row.status] || statusColor.new}`}
                      >
                        {!STATUSES.includes(row.status as typeof STATUSES[number]) && <option value={row.status}>{row.status}</option>}
                        {STATUSES.map((status) => <option key={status} value={status} className="bg-background text-foreground">{statusLabel[status]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : row.id)}
                        aria-label={expanded ? "Collapse lead details" : "Expand lead details"}
                        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/60 hover:text-gold"
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Details
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${row.id}-details`} className="border-t border-border/30 bg-card/20">
                      <td colSpan={8} className="px-5 py-5">
                        <div className="grid lg:grid-cols-3 gap-5 text-xs">
                          <div className="lg:col-span-2">
                            <p className="text-[9px] uppercase tracking-[0.22em] text-gold/70 mb-2">Requirement</p>
                            <p className="whitespace-pre-wrap leading-relaxed text-foreground/80">{row.message || "No additional message provided."}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.22em] text-gold/70 mb-2">Attribution</p>
                            <div className="space-y-1 text-foreground/60 break-all">
                              <div>Source page: {String(ctx.source_page || "—")}</div>
                              <div>Referrer: {String(ctx.referrer || "—")}</div>
                              <div>UTM source: {String(ctx.utm_source || "—")}</div>
                              <div>UTM medium: {String(ctx.utm_medium || "—")}</div>
                              <div>UTM campaign: {String(ctx.utm_campaign || "—")}</div>
                            </div>
                          </div>
                        </div>

                        {files.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-border/40">
                            <p className="text-[9px] uppercase tracking-[0.22em] text-gold/70 mb-2">Uploaded files</p>
                            <div className="flex flex-wrap gap-2">
                              {files.map((file, index) => (
                                <span key={`${file.path || file.name || "file"}-${index}`} className="inline-flex items-center gap-2 border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-foreground/70">
                                  <FileText size={12} />
                                  {file.name || `File ${index + 1}`}
                                  {file.size ? <span className="text-foreground/40">{formatBytes(file.size)}</span> : null}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-foreground/40 mt-2">Files stay private. Signed admin download access will be added with the CRM file workspace.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
