import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  StickyNote,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type UploadedFile = { path?: string; name?: string; size?: number; mime?: string };

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

type CrmHistoryEntry = { id: string; at: string; type: "update" | "note"; summary: string; actor?: string | null };
type Priority = "low" | "normal" | "high" | "urgent";
type SampleStatus = "not_requested" | "requested" | "in_development" | "sent" | "approved" | "rejected";
type LeadKind = "inquiry" | "catalogue" | "prospect";
type KindFilter = "all" | LeadKind;
type FollowUpFilter = "" | "overdue" | "today" | "upcoming" | "none";

type SupabaseErrorLike = { code?: string; message?: string; details?: string; hint?: string };

type InquiryRow = {
  id: string; name: string; email: string; company: string | null; country: string | null; phone: string | null;
  category: string | null; quantity: string | null; message: string | null; source: string | null; status: string;
  intent?: string | null; inquiry_ref?: string | null; lead_context?: LeadContext | null;
  priority?: string | null; assignee?: string | null; follow_up_at?: string | null; admin_notes?: string | null;
  quotation_url?: string | null; pi_url?: string | null; sample_status?: string | null; crm_history?: unknown;
  created_at: string; updated_at?: string | null;
};

type CatalogueLeadRow = {
  id: string; name: string; email: string | null; whatsapp: string | null; company_name: string | null; country: string | null;
  category_interest: string | null; message: string | null; catalogue_url: string | null; source: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; language: string | null;
  status: string; admin_notes: string | null; priority?: string | null; assignee?: string | null; follow_up_at?: string | null;
  quotation_url?: string | null; pi_url?: string | null; sample_status?: string | null; crm_history?: unknown;
  created_at: string; updated_at: string;
};

type ProspectRow = {
  id: string; company_name: string; country: string; email: string | null; phone: string | null; website: string | null;
  apparel_segment: string | null; lead_status: "New" | "Pitched" | "Warm" | "Replied" | "Rejected"; notes: string | null;
  crm_status?: string | null; priority?: string | null; assignee?: string | null; follow_up_at?: string | null;
  quotation_url?: string | null; pi_url?: string | null; sample_status?: string | null; crm_history?: unknown;
  created_at: string; updated_at: string;
};

type BuyerRecord = {
  key: string; kind: LeadKind; id: string; ref: string; createdAt: string; updatedAt: string | null;
  name: string; company: string | null; country: string | null; email: string | null; phone: string | null; website: string | null;
  request: string; message: string | null; source: string; status: string; priority: Priority; assignee: string | null;
  followUpAt: string | null; adminNotes: string | null; quotationUrl: string | null; piUrl: string | null;
  sampleStatus: SampleStatus; history: CrmHistoryEntry[]; context: LeadContext; files: UploadedFile[]; catalogueUrl: string | null;
};

type CrmDraft = { status: string; priority: Priority; assignee: string; followUpLocal: string; adminNotes: string; quotationUrl: string; piUrl: string; sampleStatus: SampleStatus };

type SourceStatus = { key: LeadKind; label: string; ok: boolean; message?: string };

type DbReadiness = { checked: boolean; ready: boolean; message: string | null; detail: string | null };

const STATUSES = ["new", "read", "unqualified", "qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up", "won", "lost", "spam"] as const;
const LEGACY_STATUSES = ["quoted", "waiting"] as const;
const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];
const SAMPLE_STATUSES: SampleStatus[] = ["not_requested", "requested", "in_development", "sent", "approved", "rejected"];

const statusLabel: Record<string, string> = {
  new: "New", read: "Read", unqualified: "Unqualified", qualified: "Qualified", contacted: "Contacted", replied: "Replied",
  sample_requested: "Sample Requested", quote_requested: "Quote Requested", quotation_sent: "Quotation Sent", negotiation: "Negotiation",
  follow_up: "Follow-up", won: "Won", lost: "Lost", spam: "Spam", quoted: "Quoted (legacy)", waiting: "Waiting (legacy)",
};

const statusColor: Record<string, string> = {
  new: "bg-gold/20 text-gold border-gold/40", read: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  unqualified: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40", qualified: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/40", replied: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  sample_requested: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40", quote_requested: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  quotation_sent: "bg-orange-500/15 text-orange-300 border-orange-500/40", negotiation: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  follow_up: "bg-sky-500/15 text-sky-300 border-sky-500/40", won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  lost: "bg-red-500/15 text-red-300 border-red-500/40", spam: "bg-foreground/10 text-foreground/50 border-foreground/20",
  quoted: "bg-orange-500/15 text-orange-300 border-orange-500/40", waiting: "bg-purple-500/15 text-purple-300 border-purple-500/40",
};

const priorityColor: Record<Priority, string> = {
  low: "text-foreground/50 border-border/60", normal: "text-slate-300 border-slate-500/40",
  high: "text-amber-300 border-amber-500/40 bg-amber-500/10", urgent: "text-red-300 border-red-500/50 bg-red-500/10",
};

const kindLabel: Record<LeadKind, string> = { inquiry: "RFQ / Inquiry", catalogue: "Catalogue", prospect: "Imported Prospect" };
const kindColor: Record<LeadKind, string> = {
  inquiry: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
  catalogue: "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10",
  prospect: "text-slate-300 border-slate-500/40 bg-slate-500/10",
};
const ACTION_STATUSES = new Set(["new", "qualified", "replied", "sample_requested", "quote_requested", "negotiation", "follow_up"]);

function errorText(error: SupabaseErrorLike | null | undefined) {
  return [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(" · ");
}

function isSchemaIssue(error: SupabaseErrorLike | null | undefined) {
  const text = errorText(error).toLowerCase();
  return Boolean(error && (text.includes("schema cache") || text.includes("does not exist") || text.includes("could not find") || text.includes("column") || error.code === "42703" || error.code === "42P01" || error.code === "PGRST204"));
}

function contextFor(row: InquiryRow): LeadContext { return row.lead_context && typeof row.lead_context === "object" ? row.lead_context : {}; }
function intentLabel(row: InquiryRow) { return String(contextFor(row).intent_detail || row.intent || "general").replace(/[-_]/g, " "); }
function productSummary(row: InquiryRow) {
  const ctx = contextFor(row);
  if (ctx.product_name) return ctx.product_name;
  if (ctx.product_names?.length) return ctx.product_names.join(", ");
  if (row.category) return row.category;
  return intentLabel(row);
}
function historyId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `crm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function parseHistory(value: unknown): CrmHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item): CrmHistoryEntry => ({ id: typeof item.id === "string" ? item.id : historyId(), at: typeof item.at === "string" ? item.at : new Date(0).toISOString(), type: item.type === "note" ? "note" : "update", summary: typeof item.summary === "string" ? item.summary : "CRM activity", actor: typeof item.actor === "string" ? item.actor : null }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
function normalizePriority(value?: string | null): Priority { return PRIORITIES.includes(value as Priority) ? (value as Priority) : "normal"; }
function normalizeSampleStatus(value?: string | null): SampleStatus { return SAMPLE_STATUSES.includes(value as SampleStatus) ? (value as SampleStatus) : "not_requested"; }
function legacyToCrm(value: ProspectRow["lead_status"]): string { if (value === "Pitched") return "contacted"; if (value === "Warm") return "qualified"; if (value === "Replied") return "replied"; if (value === "Rejected") return "lost"; return "new"; }
function crmToLegacy(status: string): ProspectRow["lead_status"] { if (["lost", "spam", "unqualified"].includes(status)) return "Rejected"; if (status === "replied") return "Replied"; if (["qualified", "negotiation", "won"].includes(status)) return "Warm"; if (["contacted", "sample_requested", "quote_requested", "quotation_sent", "follow_up"].includes(status)) return "Pitched"; return "New"; }
function toLocalInput(value: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function fromLocalInput(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function safeLink(value: string | null) { if (!value) return null; const trimmed = value.trim(); if (trimmed.startsWith("/")) return trimmed; try { const url = new URL(trimmed); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
function formatBytes(value?: number) { if (!value || value < 1) return ""; return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
function historyEntry(type: CrmHistoryEntry["type"], summary: string, actor?: string | null): CrmHistoryEntry { return { id: historyId(), at: new Date().toISOString(), type, summary, actor: actor || null }; }
function formatFollowUp(value: string | null) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
function followUpBucket(value: string | null): FollowUpFilter { if (!value) return "none"; const time = new Date(value).getTime(); if (Number.isNaN(time)) return "none"; const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const end = start + 86_400_000; if (time < Date.now()) return "overdue"; if (time >= start && time < end) return "today"; return "upcoming"; }
function draftFor(record: BuyerRecord): CrmDraft { return { status: record.status, priority: record.priority, assignee: record.assignee || "", followUpLocal: toLocalInput(record.followUpAt), adminNotes: record.adminNotes || "", quotationUrl: record.quotationUrl || "", piUrl: record.piUrl || "", sampleStatus: record.sampleStatus }; }

function normalizeInquiry(row: InquiryRow): BuyerRecord {
  const ctx = contextFor(row);
  return { key: `inquiry:${row.id}`, kind: "inquiry", id: row.id, ref: row.inquiry_ref || ctx.inquiry_ref || `IRQ-${row.id.slice(0, 8).toUpperCase()}`, createdAt: row.created_at, updatedAt: row.updated_at ?? null, name: row.name, company: row.company, country: row.country || ctx.destination_country || null, email: row.email, phone: row.phone, website: null, request: productSummary(row), message: row.message, source: row.source || "inquiry-wizard", status: row.status || "new", priority: normalizePriority(row.priority), assignee: row.assignee ?? null, followUpAt: row.follow_up_at ?? null, adminNotes: row.admin_notes ?? null, quotationUrl: row.quotation_url ?? null, piUrl: row.pi_url ?? null, sampleStatus: normalizeSampleStatus(row.sample_status), history: parseHistory(row.crm_history), context: ctx, files: ctx.uploaded_files ?? [], catalogueUrl: null };
}
function normalizeCatalogue(row: CatalogueLeadRow): BuyerRecord {
  return { key: `catalogue:${row.id}`, kind: "catalogue", id: row.id, ref: `CAT-${row.id.slice(0, 8).toUpperCase()}`, createdAt: row.created_at, updatedAt: row.updated_at, name: row.name, company: row.company_name, country: row.country, email: row.email, phone: row.whatsapp, website: null, request: row.category_interest || "General catalogue request", message: row.message, source: row.source || "catalogue", status: row.status || "new", priority: normalizePriority(row.priority), assignee: row.assignee ?? null, followUpAt: row.follow_up_at ?? null, adminNotes: row.admin_notes, quotationUrl: row.quotation_url ?? null, piUrl: row.pi_url ?? null, sampleStatus: normalizeSampleStatus(row.sample_status), history: parseHistory(row.crm_history), context: { utm_source: row.utm_source, utm_medium: row.utm_medium, utm_campaign: row.utm_campaign, destination_country: row.country, source_page: row.catalogue_url }, files: [], catalogueUrl: row.catalogue_url };
}
function normalizeProspect(row: ProspectRow): BuyerRecord {
  return { key: `prospect:${row.id}`, kind: "prospect", id: row.id, ref: `PRO-${row.id.slice(0, 8).toUpperCase()}`, createdAt: row.created_at, updatedAt: row.updated_at, name: row.company_name, company: row.company_name, country: row.country, email: row.email, phone: row.phone, website: row.website, request: row.apparel_segment || "Imported B2B prospect", message: null, source: "imported-prospect", status: row.crm_status || legacyToCrm(row.lead_status), priority: normalizePriority(row.priority), assignee: row.assignee ?? null, followUpAt: row.follow_up_at ?? null, adminNotes: row.notes, quotationUrl: row.quotation_url ?? null, piUrl: row.pi_url ?? null, sampleStatus: normalizeSampleStatus(row.sample_status), history: parseHistory(row.crm_history), context: { category: row.apparel_segment, source_page: row.website }, files: [], catalogueUrl: null };
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const lines = [headers.join(","), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPanel() {
  const { user } = useAuth();
  const [inquiryRows, setInquiryRows] = useState<InquiryRow[]>([]);
  const [catalogueRows, setCatalogueRows] = useState<CatalogueLeadRow[]>([]);
  const [prospectRows, setProspectRows] = useState<ProspectRow[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([]);
  const [dbReadiness, setDbReadiness] = useState<DbReadiness>({ checked: false, ready: false, message: null, detail: null });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [crmDraft, setCrmDraft] = useState<CrmDraft | null>(null);
  const [timelineNote, setTimelineNote] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const checkReadiness = async () => {
    const checks = await Promise.all([
      supabase.from("inquiries").select("id,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history,updated_at").limit(1),
      supabase.from("catalogue_leads").select("id,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
      supabase.from("b2b_leads").select("id,crm_status,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
    ]);
    const firstError = checks.find((result) => result.error)?.error as SupabaseErrorLike | undefined;
    if (firstError) {
      setDbReadiness({ checked: true, ready: false, message: isSchemaIssue(firstError) ? "Buyer CRM database migration is not fully applied yet." : "Buyer CRM database readiness check failed.", detail: errorText(firstError) });
      return false;
    }
    setDbReadiness({ checked: true, ready: true, message: null, detail: null });
    return true;
  };

  const load = async () => {
    setLoading(true);
    const [crmReady, inquiriesResult, catalogueResult, prospectsResult] = await Promise.all([
      checkReadiness(),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(750),
      supabase.from("catalogue_leads").select("*").order("created_at", { ascending: false }).limit(750),
      supabase.from("b2b_leads").select("*").order("updated_at", { ascending: false }).limit(1000),
    ]);

    const statuses: SourceStatus[] = [
      { key: "inquiry", label: "RFQ / Inquiry", ok: !inquiriesResult.error, message: inquiriesResult.error ? errorText(inquiriesResult.error as SupabaseErrorLike) : undefined },
      { key: "catalogue", label: "Catalogue", ok: !catalogueResult.error, message: catalogueResult.error ? errorText(catalogueResult.error as SupabaseErrorLike) : undefined },
      { key: "prospect", label: "Imported Prospect", ok: !prospectsResult.error, message: prospectsResult.error ? errorText(prospectsResult.error as SupabaseErrorLike) : undefined },
    ];
    setSourceStatuses(statuses);

    if (inquiriesResult.error) toast({ title: "Could not load inquiries", description: inquiriesResult.error.message, variant: "destructive" });
    if (catalogueResult.error) toast({ title: "Could not load catalogue requests", description: catalogueResult.error.message, variant: "destructive" });
    if (prospectsResult.error && !isSchemaIssue(prospectsResult.error as SupabaseErrorLike)) toast({ title: "Could not load imported prospects", description: prospectsResult.error.message, variant: "destructive" });

    setInquiryRows((inquiriesResult.data as unknown as InquiryRow[]) || []);
    setCatalogueRows((catalogueResult.data as unknown as CatalogueLeadRow[]) || []);
    setProspectRows((prospectsResult.data as unknown as ProspectRow[]) || []);
    if (!crmReady) setExpandedKey(null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const records = useMemo(() => [...inquiryRows.map(normalizeInquiry), ...catalogueRows.map(normalizeCatalogue), ...prospectRows.map(normalizeProspect)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [catalogueRows, inquiryRows, prospectRows]);
  const filtered = useMemo(() => records.filter((record) => {
    if (kindFilter !== "all" && record.kind !== kindFilter) return false;
    if (statusFilter && record.status !== statusFilter) return false;
    if (priorityFilter && record.priority !== priorityFilter) return false;
    if (followUpFilter && followUpBucket(record.followUpAt) !== followUpFilter) return false;
    if (!q.trim()) return true;
    const haystack = [record.ref, record.name, record.company, record.country, record.email, record.phone, record.website, record.request, record.source, record.status, record.priority, record.assignee, record.adminNotes, record.message, record.context.utm_source, record.context.utm_medium, record.context.utm_campaign, record.context.source_page].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q.trim().toLowerCase());
  }), [followUpFilter, kindFilter, priorityFilter, q, records, statusFilter]);
  const stats = useMemo(() => ({ total: records.length, action: records.filter((record) => ACTION_STATUSES.has(record.status)).length, overdue: records.filter((record) => followUpBucket(record.followUpAt) === "overdue").length, urgent: records.filter((record) => record.priority === "urgent").length, won: records.filter((record) => record.status === "won").length }), [records]);

  const openRecord = (record: BuyerRecord) => {
    if (expandedKey === record.key) { setExpandedKey(null); setCrmDraft(null); setTimelineNote(""); return; }
    setExpandedKey(record.key); setCrmDraft(draftFor(record)); setTimelineNote("");
  };
  const updateTable = async (record: BuyerRecord, payload: Record<string, unknown>) => {
    if (record.kind === "inquiry") return supabase.from("inquiries").update(payload as never).eq("id", record.id);
    if (record.kind === "catalogue") return supabase.from("catalogue_leads").update(payload as never).eq("id", record.id);
    return supabase.from("b2b_leads").update(payload as never).eq("id", record.id);
  };
  const saveCrm = async (record: BuyerRecord) => {
    if (!crmDraft || savingKey) return;
    if (!dbReadiness.ready) { toast({ title: "CRM database migration required", description: dbReadiness.detail || "Apply the buyer CRM migration before saving workflow fields.", variant: "destructive" }); return; }
    const quotationUrl = safeLink(crmDraft.quotationUrl); const piUrl = safeLink(crmDraft.piUrl);
    if (crmDraft.quotationUrl.trim() && !quotationUrl) { toast({ title: "Invalid quotation link", description: "Use an http(s) URL or a site path beginning with /.", variant: "destructive" }); return; }
    if (crmDraft.piUrl.trim() && !piUrl) { toast({ title: "Invalid PI link", description: "Use an http(s) URL or a site path beginning with /.", variant: "destructive" }); return; }
    const followUpAt = fromLocalInput(crmDraft.followUpLocal);
    const changes = [record.status !== crmDraft.status ? `Status → ${statusLabel[crmDraft.status] || crmDraft.status}` : null, record.priority !== crmDraft.priority ? `Priority → ${crmDraft.priority}` : null, (record.assignee || "") !== crmDraft.assignee.trim() ? `Assignee → ${crmDraft.assignee.trim() || "unassigned"}` : null, (record.followUpAt || null) !== followUpAt ? `Follow-up → ${followUpAt ? formatFollowUp(followUpAt) : "cleared"}` : null, (record.quotationUrl || null) !== quotationUrl ? `Quotation link ${quotationUrl ? "updated" : "cleared"}` : null, (record.piUrl || null) !== piUrl ? `PI link ${piUrl ? "updated" : "cleared"}` : null, record.sampleStatus !== crmDraft.sampleStatus ? `Sample → ${crmDraft.sampleStatus.replace(/_/g, " ")}` : null, (record.adminNotes || "") !== crmDraft.adminNotes.trim() ? "Working notes updated" : null].filter((value): value is string => Boolean(value));
    if (changes.length === 0) { toast({ title: "No CRM changes to save" }); return; }
    const nextHistory = [historyEntry("update", changes.join(" · "), user?.email), ...record.history].slice(0, 200);
    const common = { priority: crmDraft.priority, assignee: crmDraft.assignee.trim() || null, follow_up_at: followUpAt, quotation_url: quotationUrl, pi_url: piUrl, sample_status: crmDraft.sampleStatus, crm_history: nextHistory };
    const payload = record.kind === "prospect" ? { ...common, crm_status: crmDraft.status, lead_status: crmToLegacy(crmDraft.status), notes: crmDraft.adminNotes.trim() || null } : { ...common, status: crmDraft.status, admin_notes: crmDraft.adminNotes.trim() || null };
    setSavingKey(record.key); const { error } = await updateTable(record, payload); setSavingKey(null);
    if (error) { const err = error as SupabaseErrorLike; if (isSchemaIssue(err)) setDbReadiness({ checked: true, ready: false, message: "Buyer CRM database migration is not fully applied yet.", detail: errorText(err) }); toast({ title: "CRM update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer record updated" }); await load();
  };
  const addTimelineNote = async (record: BuyerRecord) => {
    const note = timelineNote.trim();
    if (!note || savingKey) return;
    if (!dbReadiness.ready) { toast({ title: "CRM database migration required", description: dbReadiness.detail || "Apply the buyer CRM migration before saving timeline notes.", variant: "destructive" }); return; }
    const nextHistory = [historyEntry("note", note, user?.email), ...record.history].slice(0, 200);
    const payload = record.kind === "prospect" ? { crm_status: record.status, lead_status: crmToLegacy(record.status), crm_history: nextHistory } : { status: record.status, crm_history: nextHistory };
    setSavingKey(record.key); const { error } = await updateTable(record, payload); setSavingKey(null);
    if (error) { toast({ title: "Could not add timeline note", description: error.message, variant: "destructive" }); return; }
    setTimelineNote(""); toast({ title: "Timeline note added" }); await load();
  };
  const downloadPrivateFile = async (file: UploadedFile) => {
    if (!file.path) return;
    setDownloadingPath(file.path); const { data, error } = await supabase.storage.from("inquiry-uploads").createSignedUrl(file.path, 300); setDownloadingPath(null);
    if (error || !data?.signedUrl) { toast({ title: "Could not open private file", description: error?.message || "Signed link was not created.", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const exportCsv = () => downloadCsv(`irha-buyer-crm-${new Date().toISOString().slice(0, 10)}.csv`, ["Type", "Created", "Reference", "Status", "Priority", "Follow-up", "Assignee", "Buyer", "Company", "Country", "Email", "Phone", "Request", "Source", "Sample Status", "Quotation URL", "PI URL", "Admin Notes", "Message"], filtered.map((record) => [kindLabel[record.kind], new Date(record.createdAt).toISOString(), record.ref, statusLabel[record.status] || record.status, record.priority, record.followUpAt || "", record.assignee || "", record.name, record.company || "", record.country || "", record.email || "", record.phone || "", record.request, record.source, record.sampleStatus, record.quotationUrl || "", record.piUrl || "", (record.adminNotes || "").replace(/\n/g, " "), (record.message || "").replace(/\n/g, " ")]));

  return (
    <div className="space-y-5">
      <DbReadinessBanner readiness={dbReadiness} sourceStatuses={sourceStatuses} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[["Total buyer records", stats.total], ["Needs action", stats.action], ["Overdue follow-ups", stats.overdue], ["Urgent", stats.urgent], ["Won", stats.won]].map(([label, value]) => <Metric key={String(label)} label={String(label)} value={Number(value)} />)}</div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">{(["all", "inquiry", "catalogue", "prospect"] as KindFilter[]).map((kind) => <button key={kind} type="button" onClick={() => { setKindFilter(kind); setExpandedKey(null); setCrmDraft(null); }} className={`px-3 py-2 text-[10px] uppercase tracking-[0.2em] border ${kindFilter === kind ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}>{kind === "all" ? `All (${records.length})` : `${kindLabel[kind]} (${records.filter((record) => record.kind === kind).length})`}</button>)}</div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 border border-border/60 bg-card/30 px-4 py-2.5 flex-1 min-w-[250px] max-w-2xl"><Search size={14} className="text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search buyer, company, ref, product, country, source, notes…" className="bg-transparent text-sm w-full outline-none" /></div>
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="All statuses" options={[...STATUSES, ...LEGACY_STATUSES].map((status) => [status, statusLabel[status]])} />
        <FilterSelect value={priorityFilter} onChange={setPriorityFilter} label="All priorities" options={PRIORITIES.map((p) => [p, p])} />
        <FilterSelect value={followUpFilter} onChange={(value) => setFollowUpFilter(value as FollowUpFilter)} label="All follow-ups" options={[["overdue", "Overdue"], ["today", "Due today"], ["upcoming", "Upcoming"], ["none", "No follow-up"]]} />
        <button onClick={() => void load()} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold"><Download size={12} /> Export View</button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-auto">{filtered.length} of {records.length}</span>
      </div>
      {(stats.overdue > 0 || stats.urgent > 0) && <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90"><AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{stats.overdue} overdue follow-up{stats.overdue === 1 ? "" : "s"} · {stats.urgent} urgent record{stats.urgent === 1 ? "" : "s"}. Use the filters above to work the queue.</span></div>}
      <div className="border border-border/60 overflow-x-auto"><table className="w-full text-sm min-w-[1380px]"><thead className="bg-card/60 text-[10px] uppercase tracking-[0.2em] text-gold/80"><tr>{["Date / Ref", "Type", "Buyer", "Contact", "Request", "Priority", "Follow-up", "Status", ""].map((heading) => <th key={heading} className="text-left px-4 py-3 font-normal">{heading}</th>)}</tr></thead><tbody>{loading && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-xs">Loading buyer CRM…</td></tr>}{!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-xs">No buyer records match this view.</td></tr>}{filtered.map((record) => <Fragment key={record.key}><LeadRow record={record} expanded={expandedKey === record.key} onOpen={() => openRecord(record)} />{expandedKey === record.key && crmDraft && <tr className="border-t border-border/30 bg-card/20"><td colSpan={9} className="px-5 py-6"><LeadWorkspace record={record} crmDraft={crmDraft} setCrmDraft={setCrmDraft} timelineNote={timelineNote} setTimelineNote={setTimelineNote} onSave={() => void saveCrm(record)} onAddNote={() => void addTimelineNote(record)} onDownloadFile={downloadPrivateFile} saving={savingKey === record.key} downloadingPath={downloadingPath} dbReady={dbReadiness.ready} userEmail={user?.email || null} /></td></tr>}</Fragment>)}</tbody></table></div>
      <style>{`.crm-input{width:100%;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.65rem .75rem;font-size:.75rem;outline:none}.crm-input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border/60 bg-card/30 px-4 py-3"><p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>; }
function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[][] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-card/30 border border-border/60 px-3 py-2.5 text-xs uppercase tracking-[0.15em]"><option value="">{label}</option>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>; }
function DbReadinessBanner({ readiness, sourceStatuses }: { readiness: DbReadiness; sourceStatuses: SourceStatus[] }) { if (!readiness.checked && sourceStatuses.length === 0) return null; const failed = sourceStatuses.filter((s) => !s.ok); if (readiness.ready && failed.length === 0) return <div className="flex items-center gap-3 border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200"><CalendarClock size={15} /> Buyer CRM database fields are ready. Workflow saves and timeline notes are enabled.</div>; return <div className="space-y-2 border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90"><div className="flex items-start gap-3"><AlertTriangle size={15} className="shrink-0 mt-0.5" /><div><p className="font-medium">{readiness.message || "Buyer CRM is running in safe read mode."}</p>{readiness.detail && <p className="mt-1 text-amber-100/70 break-all">{readiness.detail}</p>}<p className="mt-1 text-amber-100/70">Apply the Buyer CRM migration before relying on workflow saves, imported-prospect CRM fields, or timeline notes.</p></div></div>{failed.length > 0 && <div className="pl-8 text-amber-100/70">Unavailable sources: {failed.map((s) => `${s.label}${s.message ? ` (${s.message})` : ""}`).join(" · ")}</div>}</div>; }
function LeadRow({ record, expanded, onOpen }: { record: BuyerRecord; expanded: boolean; onOpen: () => void }) { const dueBucket = followUpBucket(record.followUpAt); return <tr className="border-t border-border/40 hover:bg-card/40 align-top"><td className="px-4 py-3 text-foreground/60 whitespace-nowrap text-xs"><div>{new Date(record.createdAt).toLocaleDateString()}</div><code className="block mt-1 text-[10px] text-gold/80">{record.ref}</code></td><td className="px-4 py-3"><span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.15em] ${kindColor[record.kind]}`}>{kindLabel[record.kind]}</span></td><td className="px-4 py-3 max-w-[240px]"><div className="font-medium line-clamp-2">{record.name}</div>{record.company && record.company !== record.name && <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{record.company}</div>}<div className="text-[10px] text-foreground/45 mt-1">{record.country || "Country not provided"}</div></td><td className="px-4 py-3 space-y-1 max-w-[260px]">{record.email && <a href={`mailto:${record.email}`} className="block text-gold hover:underline text-xs truncate">{record.email}</a>}{record.phone && <a href={`https://wa.me/${record.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="block text-emerald-400 hover:underline text-xs">{record.phone}</a>}{record.website && safeLink(record.website) && <a href={safeLink(record.website) || undefined} target="_blank" rel="noreferrer noopener" className="block text-cyan-300 hover:underline text-[10px] truncate">{record.website}</a>}</td><td className="px-4 py-3 text-xs text-foreground/75 max-w-[280px]"><div className="line-clamp-2">{record.request}</div><div className="mt-1 text-[10px] text-foreground/45">{record.source}</div></td><td className="px-4 py-3"><span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.15em] ${priorityColor[record.priority]}`}>{record.priority}</span></td><td className="px-4 py-3 text-xs whitespace-nowrap"><div className={dueBucket === "overdue" ? "text-red-300" : dueBucket === "today" ? "text-amber-300" : "text-foreground/65"}>{formatFollowUp(record.followUpAt)}</div>{record.assignee && <div className="mt-1 text-[10px] text-foreground/40 truncate max-w-[170px]">{record.assignee}</div>}</td><td className="px-4 py-3"><span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${statusColor[record.status] || statusColor.new}`}>{statusLabel[record.status] || record.status}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/60 hover:text-gold">{expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Workspace</button></td></tr>; }
function LeadWorkspace({ record, crmDraft, setCrmDraft, timelineNote, setTimelineNote, onSave, onAddNote, onDownloadFile, saving, downloadingPath, dbReady, userEmail }: { record: BuyerRecord; crmDraft: CrmDraft; setCrmDraft: React.Dispatch<React.SetStateAction<CrmDraft | null>>; timelineNote: string; setTimelineNote: (value: string) => void; onSave: () => void; onAddNote: () => void; onDownloadFile: (file: UploadedFile) => void; saving: boolean; downloadingPath: string | null; dbReady: boolean; userEmail: string | null }) { return <div className="grid xl:grid-cols-12 gap-6"><div className="xl:col-span-7 space-y-6"><section><p className="text-[9px] uppercase tracking-[0.22em] text-gold/70 mb-2">Buyer requirement</p><p className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/80">{record.message || "No additional message provided."}</p></section><section className="border border-border/50 bg-background/30 p-4"><p className="text-[9px] uppercase tracking-[0.22em] text-gold/70 mb-3">Attribution & context</p><div className="grid md:grid-cols-2 gap-2 text-xs text-foreground/60 break-all"><div>Source: {record.source}</div><div>Source page: {String(record.context.source_page || record.catalogueUrl || "—")}</div><div>Referrer: {String(record.context.referrer || "—")}</div><div>UTM: {[record.context.utm_source, record.context.utm_medium, record.context.utm_campaign].filter(Boolean).join(" / ") || "—"}</div></div></section>{record.files.length > 0 && <section className="border border-border/50 bg-background/30 p-4"><p className="text-[9px] uppercase tracking-[0.22em] text-gold/70 mb-3">Private uploaded files</p><div className="flex flex-wrap gap-2">{record.files.map((file, index) => <button key={`${file.path || file.name || "file"}-${index}`} type="button" onClick={() => onDownloadFile(file)} disabled={!file.path || downloadingPath === file.path} className="inline-flex items-center gap-2 border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-foreground/70 hover:border-gold hover:text-gold disabled:opacity-50"><FileText size={12} />{file.name || `File ${index + 1}`}{file.size ? <span className="text-foreground/40">{formatBytes(file.size)}</span> : null}<Download size={11} /></button>)}</div><p className="text-[10px] text-foreground/40 mt-2">Signed links expire after 5 minutes and are created only for an authenticated admin.</p></section>}<section className="border border-border/50 bg-background/30 p-4"><div className="flex items-center justify-between gap-3 mb-3"><p className="text-[9px] uppercase tracking-[0.22em] text-gold/70">Buyer timeline</p><span className="text-[10px] text-foreground/40">{record.history.length} event{record.history.length === 1 ? "" : "s"}</span></div><div className="flex gap-2"><input value={timelineNote} onChange={(e) => setTimelineNote(e.target.value)} disabled={!dbReady} placeholder={dbReady ? "Add call, email, negotiation or follow-up note…" : "Apply CRM migration before adding notes"} className="flex-1 bg-input border border-border focus:border-primary outline-none px-3 py-2.5 text-sm disabled:opacity-60" /><button type="button" onClick={onAddNote} disabled={!timelineNote.trim() || saving || !dbReady} className="inline-flex items-center gap-2 border border-gold/60 text-gold px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"><StickyNote size={12} /> Add</button></div><div className="mt-4 max-h-72 overflow-y-auto space-y-3 pr-1">{record.history.length === 0 && <p className="text-xs text-foreground/45">No CRM history yet.</p>}{record.history.map((event) => <div key={event.id} className="border-l border-gold/30 pl-3 py-1"><div className="flex flex-wrap items-center gap-2 text-[10px] text-foreground/45"><span className="uppercase tracking-[0.15em] text-gold/70">{event.type}</span><span>{new Date(event.at).toLocaleString()}</span>{event.actor && <span>· {event.actor}</span>}</div><p className="text-xs text-foreground/75 mt-1 whitespace-pre-wrap">{event.summary}</p></div>)}</div></section></div><aside className="xl:col-span-5 border border-border/60 bg-background/40 p-5 h-fit"><div className="flex items-center justify-between gap-3 mb-5"><div><p className="text-[9px] uppercase tracking-[0.22em] text-gold/70">CRM workspace</p><p className="text-xs text-foreground/50 mt-1">{dbReady ? "Save changes to update this buyer record." : "Read-only until migration is applied."}</p></div><UserRoundCheck size={18} className="text-gold" /></div><div className="grid sm:grid-cols-2 gap-4"><Field label="Status"><select value={crmDraft.status} onChange={(e) => setCrmDraft((current) => current ? { ...current, status: e.target.value } : current)} className="crm-input" disabled={!dbReady}>{[...STATUSES, ...LEGACY_STATUSES].map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></Field><Field label="Priority"><select value={crmDraft.priority} onChange={(e) => setCrmDraft((current) => current ? { ...current, priority: e.target.value as Priority } : current)} className="crm-input" disabled={!dbReady}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></Field><Field label="Assignee"><div className="flex gap-2"><input value={crmDraft.assignee} onChange={(e) => setCrmDraft((current) => current ? { ...current, assignee: e.target.value } : current)} className="crm-input flex-1 min-w-0" disabled={!dbReady} />{userEmail && <button type="button" disabled={!dbReady} onClick={() => setCrmDraft((current) => current ? { ...current, assignee: userEmail } : current)} className="border border-border/60 px-2 text-[9px] uppercase tracking-[0.12em] hover:border-gold hover:text-gold disabled:opacity-40">Me</button>}</div></Field><Field label="Follow-up"><input type="datetime-local" value={crmDraft.followUpLocal} onChange={(e) => setCrmDraft((current) => current ? { ...current, followUpLocal: e.target.value } : current)} className="crm-input" disabled={!dbReady} /></Field><Field label="Sample status"><select value={crmDraft.sampleStatus} onChange={(e) => setCrmDraft((current) => current ? { ...current, sampleStatus: e.target.value as SampleStatus } : current)} className="crm-input" disabled={!dbReady}>{SAMPLE_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></Field><div /><Field label="Quotation link" wide><input type="url" value={crmDraft.quotationUrl} onChange={(e) => setCrmDraft((current) => current ? { ...current, quotationUrl: e.target.value } : current)} className="crm-input" disabled={!dbReady} /></Field><Field label="Pro forma invoice link" wide><input type="url" value={crmDraft.piUrl} onChange={(e) => setCrmDraft((current) => current ? { ...current, piUrl: e.target.value } : current)} className="crm-input" disabled={!dbReady} /></Field><Field label="Working notes" wide><textarea rows={5} value={crmDraft.adminNotes} onChange={(e) => setCrmDraft((current) => current ? { ...current, adminNotes: e.target.value } : current)} className="crm-input resize-y" disabled={!dbReady} /></Field></div><button type="button" onClick={onSave} disabled={saving || !dbReady} className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3.5 text-[10px] uppercase tracking-[0.22em] hover:shadow-gold disabled:opacity-50"><Save size={13} /> {saving ? "Saving…" : dbReady ? "Save CRM changes" : "Migration required"}</button></aside></div>; }
function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="block text-[9px] uppercase tracking-[0.2em] text-foreground/50 mb-1.5">{label}</span>{children}</label>; }
