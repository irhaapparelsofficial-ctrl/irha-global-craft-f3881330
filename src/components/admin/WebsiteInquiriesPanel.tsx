import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";

type UnifiedStatus = "new" | "reviewed" | "closed" | "archived" | string;

type PrivateBuyerFile = {
  path: string;
  name: string;
  mime: string | null;
  size: number | null;
};

type UnifiedInquiry = {
  id: string;
  source: "rfq" | "catalogue";
  createdAt: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  categoryOrInterest: string | null;
  quantity: string | null;
  message: string | null;
  status: UnifiedStatus;
  reference: string | null;
  intent: string | null;
  productLabel: string | null;
  files: PrivateBuyerFile[];
  raw: Record<string, unknown>;
};

const STATUS_FILTERS: Array<{ key: "all" | UnifiedStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "reviewed", label: "Reviewed/Open" },
  { key: "closed", label: "Closed" },
  { key: "archived", label: "Archived" },
];

const STATUS_UPDATE_OPTIONS: Array<{ key: UnifiedStatus; label: string }> = [
  { key: "new", label: "Mark New" },
  { key: "reviewed", label: "Mark Reviewed" },
  { key: "closed", label: "Close" },
];

function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function whatsappHref(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}`;
}

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function privateFiles(row: Record<string, unknown>, context: Record<string, unknown>): PrivateBuyerFile[] {
  const uploaded = Array.isArray(context.uploaded_files) ? context.uploaded_files : [];
  const normalized = uploaded.flatMap((value) => {
    const file = asRecord(value);
    const path = textValue(file.path);
    if (!path) return [];
    return [{
      path,
      name: textValue(file.name) ?? path.split("/").pop() ?? "Private file",
      mime: textValue(file.mime),
      size: Number.isFinite(Number(file.size)) ? Number(file.size) : null,
    }];
  });
  const storedPaths = Array.isArray(row.tech_pack_paths) ? row.tech_pack_paths : [];
  for (const value of storedPaths) {
    const path = textValue(value);
    if (!path || normalized.some((file) => file.path === path)) continue;
    normalized.push({ path, name: path.split("/").pop() ?? "Private file", mime: null, size: null });
  }
  return normalized;
}

function bucketForPath(path: string) {
  if (path.startsWith("requests/tech-pack/")) return "tech_packs";
  if (path.startsWith("requests/mockup/")) return "mockup-uploads";
  if (path.startsWith("requests/inquiry/")) return "inquiry-uploads";
  return null;
}

export default function WebsiteInquiriesPanel() {
  const [rows, setRows] = useState<UnifiedInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | UnifiedStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "rfq" | "catalogue">("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [inq, cat] = await Promise.all([
      supabase
        .from("inquiries")
        .select("id, name, email, phone, company, country, category, quantity, message, status, created_at, inquiry_ref, intent, lead_context, tech_pack_paths")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("catalogue_leads")
        .select("id, name, email, whatsapp, company_name, country, category_interest, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    if (inq.error && cat.error) {
      setError(inq.error.message || cat.error.message);
      setLoading(false);
      return;
    }

    const rfqs: UnifiedInquiry[] = ((inq.data as Array<Record<string, unknown>>) ?? []).map((row) => {
      const context = asRecord(row.lead_context);
      const productName = textValue(context.product_name);
      const productCode = textValue(context.product_code);
      return {
        id: `rfq:${row.id as string}`,
        source: "rfq",
        createdAt: (row.created_at as string) ?? new Date().toISOString(),
        name: (row.name as string) ?? "—",
        email: (row.email as string) ?? null,
        phone: normalizePhone(row.phone as string | null),
        company: (row.company as string) ?? null,
        country: (row.country as string) ?? null,
        categoryOrInterest: (row.category as string) ?? null,
        quantity: (row.quantity as string) ?? null,
        message: (row.message as string) ?? null,
        status: ((row.status as string) ?? "new") as UnifiedStatus,
        reference: textValue(row.inquiry_ref),
        intent: textValue(row.intent),
        productLabel: productName ? `${productName}${productCode ? ` · ${productCode}` : ""}` : productCode,
        files: privateFiles(row, context),
        raw: row,
      };
    });

    const catalogues: UnifiedInquiry[] = ((cat.data as Array<Record<string, unknown>>) ?? []).map((row) => ({
      id: `catalogue:${row.id as string}`,
      source: "catalogue",
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      name: (row.name as string) ?? "—",
      email: (row.email as string) ?? null,
      phone: normalizePhone(row.whatsapp as string | null),
      company: (row.company_name as string) ?? null,
      country: (row.country as string) ?? null,
      categoryOrInterest: (row.category_interest as string) ?? null,
      quantity: null,
      message: (row.message as string) ?? null,
      status: ((row.status as string) ?? "new") as UnifiedStatus,
      reference: null,
      intent: "catalogue",
      productLabel: null,
      files: [],
      raw: row,
    }));

    const merged = [...rfqs, ...catalogues].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
      if (!query) return true;
      return [row.name, row.email, row.phone, row.company, row.country, row.categoryOrInterest, row.message, row.reference, row.intent, row.productLabel]
        .some((field) => (field || "").toLowerCase().includes(query));
    });
  }, [rows, statusFilter, sourceFilter, q]);

  const counts = useMemo(() => ({
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    reviewed: rows.filter((r) => r.status === "reviewed").length,
    archived: rows.filter((r) => r.status === "archived").length,
  }), [rows]);

  async function updateStatus(row: UnifiedInquiry, next: UnifiedStatus) {
    setBusyId(row.id);
    try {
      const rawId = row.raw.id as string;
      const table = row.source === "rfq" ? "inquiries" : "catalogue_leads";
      const { error: err } = await supabase
        .from(table as never)
        .update({ status: next } as never)
        .eq("id", rawId);
      if (err) {
        setError(err.message);
      } else {
        setRows((current) => current.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function archive(row: UnifiedInquiry) {
    if (!window.confirm("Archive this inquiry? It stays in the database and can be reopened later.")) return;
    await updateStatus(row, "archived");
  }

  async function openPrivateFile(row: UnifiedInquiry, file: PrivateBuyerFile) {
    const bucket = bucketForPath(file.path);
    if (!bucket) {
      setError("This file path is not in an approved private upload location.");
      return;
    }
    const operationId = `${row.id}:file:${file.path}`;
    setBusyId(operationId);
    setError(null);
    try {
      const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(file.path, 120);
      if (signedError || !data?.signedUrl) {
        setError(signedError?.message || "Private file link could not be created.");
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = data.signedUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-tight">Website Inquiries</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Unified view of RFQs and catalogue requests submitted from the website. Updates never send messages automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </header>

      {error && (
        <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5" /> <span>{error}</span></div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 border border-border/60">
        {[
          { label: "Total", value: counts.total },
          { label: "New", value: counts.new },
          { label: "Reviewed/Open", value: counts.reviewed },
          { label: "Archived", value: counts.archived },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/40 p-4 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
            <p className="font-display text-2xl mt-1 tabular-nums">{loading ? "—" : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search reference, product, buyer, company, email…"
            className="w-full min-h-11 rounded-md border border-border/60 bg-background/60 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`min-h-11 border px-3 text-[10px] uppercase tracking-[0.16em] ${statusFilter === f.key ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "rfq", "catalogue"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSourceFilter(f)}
              className={`min-h-11 border px-3 text-[10px] uppercase tracking-[0.16em] ${sourceFilter === f ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All types" : f === "rfq" ? "RFQ" : "Catalogue"}
            </button>
          ))}
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading inquiries…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/30 p-10 text-center">
          <Inbox size={26} className="mx-auto text-muted-foreground/70 mb-3" />
          <p className="text-sm">No website inquiries match this filter.</p>
          <p className="text-xs text-muted-foreground mt-1">New RFQs and catalogue requests will appear here as they arrive.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const wa = whatsappHref(row.phone);
            const mailto = row.email ? `mailto:${row.email}` : null;
            return (
              <li key={row.id} className="border border-border/60 bg-card/30 p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={`inline-flex items-center gap-1 border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${row.source === "rfq" ? "border-primary/60 text-primary" : "border-gold/60 text-gold"}`}
                  >
                    {row.source === "rfq" ? <MessageSquare size={11} /> : <BookOpen size={11} />}
                    {row.source === "rfq" ? "RFQ" : "Catalogue Request"}
                  </span>
                  <span className="inline-flex items-center border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {row.status}
                  </span>
                  {row.reference && (
                    <span className="inline-flex items-center border border-border/60 px-2 py-1 font-mono text-[9px] text-foreground/70">
                      {row.reference}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{fmtDate(row.createdAt)}</span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="min-w-0">
                    <p className="font-display text-base leading-tight truncate">{row.name}</p>
                    {row.company && <p className="text-xs text-muted-foreground truncate">{row.company}</p>}
                    {row.country && <p className="text-[11px] text-muted-foreground/80">{row.country}</p>}
                  </div>
                  <div className="min-w-0 space-y-1 text-xs">
                    {row.email && <p className="truncate"><span className="text-muted-foreground">Email:</span> {row.email}</p>}
                    {row.phone && <p className="truncate"><span className="text-muted-foreground">Phone:</span> {row.phone}</p>}
                    {row.intent && <p className="truncate"><span className="text-muted-foreground">Request:</span> {row.intent}</p>}
                    {row.productLabel && <p className="break-words"><span className="text-muted-foreground">Product:</span> {row.productLabel}</p>}
                    {row.categoryOrInterest && <p className="truncate"><span className="text-muted-foreground">Interest:</span> {row.categoryOrInterest}</p>}
                    {row.quantity && <p className="truncate"><span className="text-muted-foreground">Quantity:</span> {row.quantity}</p>}
                  </div>
                  <div className="min-w-0">
                    {row.message ? (
                      <p className="text-xs whitespace-pre-wrap leading-relaxed line-clamp-6">{row.message}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No message provided.</p>
                    )}
                  </div>
                </div>

                {row.files.length > 0 && (
                  <section className="mt-4 border-t border-border/50 pt-3" aria-label="Private buyer files">
                    <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Private buyer files</p>
                    <div className="flex flex-wrap gap-2">
                      {row.files.map((file) => {
                        const operationId = `${row.id}:file:${file.path}`;
                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => void openPrivateFile(row, file)}
                            disabled={busyId === operationId}
                            className="inline-flex min-h-10 max-w-full items-center gap-2 border border-border/60 px-3 text-left text-[10px] hover:border-primary hover:text-primary disabled:opacity-50"
                          >
                            {busyId === operationId ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                            <span className="max-w-56 truncate">{file.name}</span>
                            <ExternalLink size={11} />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  {mailto && (
                    <a href={mailto} className="min-h-10 inline-flex items-center gap-1.5 border border-border/60 px-3 text-[10px] uppercase tracking-[0.16em] hover:border-primary hover:text-primary">
                      <Mail size={11} /> Email
                    </a>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer noopener" className="min-h-10 inline-flex items-center gap-1.5 border border-border/60 px-3 text-[10px] uppercase tracking-[0.16em] hover:border-primary hover:text-primary">
                      <Phone size={11} /> WhatsApp
                    </a>
                  )}
                  <div className="ml-auto flex flex-wrap items-center gap-1">
                    {STATUS_UPDATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={busyId === row.id || row.status === opt.key}
                        onClick={() => void updateStatus(row, opt.key)}
                        className="min-h-10 border border-border/60 px-3 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={busyId === row.id || row.status === "archived"}
                      onClick={() => void archive(row)}
                      className="min-h-10 inline-flex items-center gap-1.5 border border-border/60 px-3 text-[10px] uppercase tracking-[0.16em] hover:border-destructive hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Archive size={11} /> Archive
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
