import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  Pin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  StickyNote,
  Trash2,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  fileSize,
  findDuplicateSuggestions,
  linkPairKey,
  type BuyerContact,
  type BuyerFile,
  type BuyerNote,
  type DuplicateSuggestion,
  type RecordLink,
} from "@/lib/buyer360";
import {
  STAGE_LABELS,
  normalizePriority,
  normalizeStage,
  referenceFor,
  sortSalesCards,
  type SalesCard,
  type SalesSource,
  type SalesTask,
} from "@/lib/salesPipeline";

const db = supabase as any;
const FILE_BUCKET = "crm-private-files";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "text/plain",
]);

type Tab = "overview" | "contacts" | "timeline" | "files" | "duplicates";

type InquiryRow = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null; country: string | null;
  category: string | null; quantity: string | null; message: string | null; status: string | null; priority: string | null;
  follow_up_at: string | null; assignee: string | null; quotation_url: string | null; sample_status: string | null;
  created_at: string; updated_at: string | null; lead_context: Record<string, unknown> | null;
};

type CatalogueRow = {
  id: string; name: string; email: string | null; whatsapp: string | null; company_name: string | null; country: string | null;
  category_interest: string | null; message: string | null; status: string | null; priority: string | null;
  follow_up_at: string | null; assignee: string | null; quotation_url: string | null; sample_status: string | null;
  created_at: string; updated_at: string | null;
};

type ProspectRow = {
  id: string; company_name: string; country: string | null; email: string | null; phone: string | null; website: string | null;
  apparel_segment: string | null; crm_status: string | null; lead_status: string | null; priority: string | null;
  follow_up_at: string | null; assignee: string | null; quotation_url: string | null; sample_status: string | null;
  created_at: string; updated_at: string | null;
};

type ActivityEvent = {
  id: number;
  source_type: SalesSource;
  source_id: string;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ContactDraft = {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedinUrl: string;
  primary: boolean;
};

type FileDraft = {
  category: BuyerFile["category"];
  description: string;
};

function contextText(context: Record<string, unknown> | null, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value : "";
}

function normalizeInquiry(row: InquiryRow): SalesCard {
  const context = row.lead_context && typeof row.lead_context === "object" ? row.lead_context : null;
  return {
    key: `inquiry:${row.id}`,
    source: "inquiry",
    sourceId: row.id,
    reference: referenceFor("inquiry", row.id),
    stage: normalizeStage(row.status),
    name: row.name || "Buyer",
    company: row.company || "",
    country: row.country || contextText(context, "destination_country"),
    email: row.email || "",
    phone: row.phone || "",
    website: "",
    productInterest: contextText(context, "product_name") || row.category || "",
    quantity: row.quantity || "",
    message: row.message || "",
    priority: normalizePriority(row.priority),
    followUpAt: row.follow_up_at,
    assignee: row.assignee || "",
    quotationUrl: row.quotation_url || "",
    sampleStatus: row.sample_status || "not_requested",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function normalizeCatalogue(row: CatalogueRow): SalesCard {
  return {
    key: `catalogue:${row.id}`,
    source: "catalogue",
    sourceId: row.id,
    reference: referenceFor("catalogue", row.id),
    stage: normalizeStage(row.status),
    name: row.name || "Catalogue buyer",
    company: row.company_name || "",
    country: row.country || "",
    email: row.email || "",
    phone: row.whatsapp || "",
    website: "",
    productInterest: row.category_interest || "",
    quantity: "",
    message: row.message || "",
    priority: normalizePriority(row.priority),
    followUpAt: row.follow_up_at,
    assignee: row.assignee || "",
    quotationUrl: row.quotation_url || "",
    sampleStatus: row.sample_status || "not_requested",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function normalizeProspect(row: ProspectRow): SalesCard {
  return {
    key: `prospect:${row.id}`,
    source: "prospect",
    sourceId: row.id,
    reference: referenceFor("prospect", row.id),
    stage: normalizeStage(row.crm_status || row.lead_status),
    name: row.company_name,
    company: row.company_name,
    country: row.country || "",
    email: row.email || "",
    phone: row.phone || "",
    website: row.website || "",
    productInterest: row.apparel_segment || "",
    quantity: "",
    message: "",
    priority: normalizePriority(row.priority),
    followUpAt: row.follow_up_at,
    assignee: row.assignee || "",
    quotationUrl: row.quotation_url || "",
    sampleStatus: row.sample_status || "not_requested",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function emptyContact(card: SalesCard): ContactDraft {
  return {
    name: card.name || "",
    jobTitle: "",
    email: card.email || "",
    phone: card.phone || "",
    whatsapp: card.phone || "",
    linkedinUrl: "",
    primary: true,
  };
}

export default function Buyer360Panel() {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [cards, setCards] = useState<SalesCard[]>([]);
  const [contacts, setContacts] = useState<BuyerContact[]>([]);
  const [notes, setNotes] = useState<BuyerNote[]>([]);
  const [files, setFiles] = useState<BuyerFile[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [links, setLinks] = useState<RecordLink[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendNotes, setBackendNotes] = useState<string[]>([]);
  const [noteText, setNoteText] = useState("");
  const [contactDraft, setContactDraft] = useState<ContactDraft | null>(null);
  const [fileDraft, setFileDraft] = useState<FileDraft>({ category: "reference", description: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [inquiries, catalogues, prospects, contactsResult, notesResult, filesResult, eventsResult, tasksResult, linksResult] = await Promise.all([
      db.from("inquiries").select("id,name,email,phone,company,country,category,quantity,message,status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at,lead_context").order("updated_at", { ascending: false }).limit(500),
      db.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,category_interest,message,status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(500),
      db.from("b2b_leads").select("id,company_name,country,email,phone,website,apparel_segment,crm_status,lead_status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(1000),
      db.from("crm_contacts").select("*").order("is_primary", { ascending: false }).order("created_at", { ascending: true }).limit(2000),
      db.from("crm_notes").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
      db.from("crm_files").select("*").order("created_at", { ascending: false }).limit(2000),
      db.from("crm_activity_events").select("*").order("created_at", { ascending: false }).limit(3000),
      db.from("crm_tasks").select("*").order("created_at", { ascending: false }).limit(2000),
      db.from("crm_record_links").select("*").order("created_at", { ascending: false }).limit(2000),
    ]);

    const nextCards = sortSalesCards([
      ...((inquiries.data ?? []) as InquiryRow[]).map(normalizeInquiry),
      ...((catalogues.data ?? []) as CatalogueRow[]).map(normalizeCatalogue),
      ...((prospects.data ?? []) as ProspectRow[]).map(normalizeProspect),
    ]);
    const messages: string[] = [];
    for (const [label, result] of [["Inquiries", inquiries], ["Catalogue leads", catalogues], ["Prospects", prospects]] as const) {
      if (result.error) messages.push(`${label}: ${result.error.message}`);
    }
    if (contactsResult.error || notesResult.error || filesResult.error || linksResult.error) {
      messages.push("Buyer 360 contacts, notes, files and record links activate in the final database migration.");
    }
    if (eventsResult.error || tasksResult.error) {
      messages.push("Timeline task/activity tables are deferred until final activation.");
    }

    setCards(nextCards);
    setContacts((contactsResult.data ?? []) as BuyerContact[]);
    setNotes((notesResult.data ?? []) as BuyerNote[]);
    setFiles((filesResult.data ?? []) as BuyerFile[]);
    setEvents((eventsResult.data ?? []) as ActivityEvent[]);
    setTasks((tasksResult.data ?? []) as SalesTask[]);
    setLinks((linksResult.data ?? []) as RecordLink[]);
    setBackendNotes(Array.from(new Set(messages)));
    setSelectedKey((current) => current && nextCards.some((card) => card.key === current) ? current : nextCards[0]?.key || null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = cards.find((card) => card.key === selectedKey) || null;
  const filteredCards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) => [card.reference, card.name, card.company, card.country, card.email, card.phone, card.website, card.productInterest].join(" ").toLowerCase().includes(needle));
  }, [cards, query]);

  const duplicateSuggestions = useMemo(() => findDuplicateSuggestions(cards), [cards]);
  const linkByPair = useMemo(() => new Map(links.map((link) => [linkPairKey(link.left_source_type, link.left_source_id, link.right_source_type, link.right_source_id), link])), [links]);
  const selectedContacts = selected ? contacts.filter((row) => row.source_type === selected.source && row.source_id === selected.sourceId) : [];
  const selectedNotes = selected ? notes.filter((row) => row.source_type === selected.source && row.source_id === selected.sourceId) : [];
  const selectedFiles = selected ? files.filter((row) => row.source_type === selected.source && row.source_id === selected.sourceId) : [];
  const selectedEvents = selected ? events.filter((row) => row.source_type === selected.source && row.source_id === selected.sourceId) : [];
  const selectedTasks = selected ? tasks.filter((row) => row.source_type === selected.source && row.source_id === selected.sourceId) : [];

  const addContact = async () => {
    if (!selected || !contactDraft || !contactDraft.name.trim()) return;
    setBusy("contact");
    const { data, error } = await db.from("crm_contacts").insert({
      source_type: selected.source,
      source_id: selected.sourceId,
      name: contactDraft.name.trim(),
      job_title: contactDraft.jobTitle.trim() || null,
      email: contactDraft.email.trim().toLowerCase() || null,
      phone: contactDraft.phone.trim() || null,
      whatsapp: contactDraft.whatsapp.trim() || null,
      linkedin_url: contactDraft.linkedinUrl.trim() || null,
      is_primary: contactDraft.primary,
      status: "active",
    }).select("*").single();
    setBusy(null);
    if (error) {
      toast({ title: "Contact backend is not active yet", description: "The migration is prepared for final activation.", variant: "destructive" });
      return;
    }
    setContacts((current) => [...current, data as BuyerContact]);
    setContactDraft(null);
    toast({ title: "Buyer contact added" });
  };

  const removeContact = async (contact: BuyerContact) => {
    if (!window.confirm(`Remove contact ${contact.name}?`)) return;
    const { error } = await db.from("crm_contacts").delete().eq("id", contact.id);
    if (error) {
      toast({ title: "Contact removal failed", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((current) => current.filter((row) => row.id !== contact.id));
  };

  const addNote = async () => {
    if (!selected || noteText.trim().length < 2) return;
    setBusy("note");
    const { data, error } = await db.from("crm_notes").insert({
      source_type: selected.source,
      source_id: selected.sourceId,
      body: noteText.trim(),
      pinned: false,
      created_by_email: user?.email || null,
    }).select("*").single();
    setBusy(null);
    if (error) {
      toast({ title: "Notes backend is not active yet", description: "The migration is prepared for final activation.", variant: "destructive" });
      return;
    }
    setNotes((current) => [data as BuyerNote, ...current]);
    setNoteText("");
    toast({ title: "Private note added" });
  };

  const togglePin = async (note: BuyerNote) => {
    const { data, error } = await db.from("crm_notes").update({ pinned: !note.pinned }).eq("id", note.id).select("*").single();
    if (error) {
      toast({ title: "Pin update failed", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((current) => current.map((row) => row.id === note.id ? data as BuyerNote : row));
  };

  const removeNote = async (note: BuyerNote) => {
    if (!window.confirm("Delete this private note?")) return;
    const { error } = await db.from("crm_notes").delete().eq("id", note.id);
    if (error) {
      toast({ title: "Note removal failed", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((current) => current.filter((row) => row.id !== note.id));
  };

  const uploadFile = async (file: File) => {
    if (!selected) return;
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      toast({ title: "Unsupported file type", description: "Use image, PDF, DOCX, XLSX, CSV or text files.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File is too large", description: "Maximum private CRM file size is 25 MB.", variant: "destructive" });
      return;
    }
    setBusy("file");
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const objectPath = `${selected.source}/${selected.sourceId}/${crypto.randomUUID()}-${safeName || "file"}`;
    const { error: storageError } = await supabase.storage.from(FILE_BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (storageError) {
      setBusy(null);
      toast({ title: "Private file storage is not active yet", description: "The bucket is prepared for final activation.", variant: "destructive" });
      return;
    }
    const { data, error } = await db.from("crm_files").insert({
      source_type: selected.source,
      source_id: selected.sourceId,
      bucket: FILE_BUCKET,
      object_path: objectPath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      category: fileDraft.category,
      description: fileDraft.description.trim() || null,
    }).select("*").single();
    if (error) {
      await supabase.storage.from(FILE_BUCKET).remove([objectPath]);
      setBusy(null);
      toast({ title: "File metadata save failed", description: error.message, variant: "destructive" });
      return;
    }
    setFiles((current) => [data as BuyerFile, ...current]);
    setFileDraft({ category: "reference", description: "" });
    setBusy(null);
    toast({ title: "Private buyer file uploaded" });
  };

  const openFile = async (file: BuyerFile) => {
    const { data, error } = await supabase.storage.from(file.bucket).createSignedUrl(file.object_path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "File access failed", description: error?.message || "Signed URL unavailable", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const removeFile = async (file: BuyerFile) => {
    if (!window.confirm(`Permanently delete private file ${file.file_name}?`)) return;
    const { error: storageError } = await supabase.storage.from(file.bucket).remove([file.object_path]);
    if (storageError) {
      toast({ title: "File delete failed", description: storageError.message, variant: "destructive" });
      return;
    }
    const { error } = await db.from("crm_files").delete().eq("id", file.id);
    if (error) {
      toast({ title: "Metadata cleanup failed", description: error.message, variant: "destructive" });
      return;
    }
    setFiles((current) => current.filter((row) => row.id !== file.id));
  };

  const setDuplicateStatus = async (suggestion: DuplicateSuggestion, status: RecordLink["status"]) => {
    const pairKey = linkPairKey(suggestion.left.source, suggestion.left.sourceId, suggestion.right.source, suggestion.right.sourceId);
    const existing = linkByPair.get(pairKey);
    const ordered = [suggestion.left, suggestion.right].sort((a, b) => a.key.localeCompare(b.key));
    const payload = {
      left_source_type: ordered[0].source,
      left_source_id: ordered[0].sourceId,
      right_source_type: ordered[1].source,
      right_source_id: ordered[1].sourceId,
      link_type: "duplicate",
      status,
      reason: suggestion.reason,
    };
    setBusy(`link:${pairKey}`);
    const result = existing
      ? await db.from("crm_record_links").update({ status, reason: suggestion.reason }).eq("id", existing.id).select("*").single()
      : await db.from("crm_record_links").insert(payload).select("*").single();
    setBusy(null);
    if (result.error) {
      toast({ title: "Duplicate review backend is not active yet", description: "The migration is prepared for final activation.", variant: "destructive" });
      return;
    }
    setLinks((current) => [...current.filter((row) => row.id !== result.data.id), result.data as RecordLink]);
    toast({ title: status === "confirmed" ? "Records linked as duplicate" : "Duplicate suggestion rejected", description: "No buyer data was merged or deleted." });
  };

  const copyValue = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3"><UsersRound className="text-gold shrink-0 mt-1" size={22} /><div><p className="eyebrow mb-2">Phase 3 · Buyer CRM</p><h2 className="font-display text-2xl md:text-4xl">Buyer 360</h2><p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">One complete buyer workspace for identity, contacts, private notes, tasks, activity timeline, private files and duplicate review—without deleting or silently merging original source records.</p></div></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Buyer 360</button>
        </div>
      </section>

      {backendNotes.length > 0 && <div className="border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-200"><AlertTriangle size={17} className="shrink-0 mt-0.5" /><div><p className="font-medium">Backend activation status</p><p className="mt-1 text-xs text-foreground/60">{backendNotes.join(" · ")}</p></div></div>}

      <div className="grid xl:grid-cols-[330px_minmax(0,1fr)] gap-5 items-start">
        <aside className="border border-border/60 bg-card/20 xl:sticky xl:top-20">
          <div className="p-3 border-b border-border/60"><label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer or company…" className="w-full min-h-11 bg-background border border-border/60 pl-9 pr-3 text-sm" /></label><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-2">{filteredCards.length} of {cards.length} records</p></div>
          <div className="max-h-[68vh] overflow-y-auto divide-y divide-border/50">{loading ? <p className="p-6 text-sm text-muted-foreground">Loading buyers…</p> : filteredCards.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No buyer matches.</p> : filteredCards.map((card) => <button key={card.key} type="button" onClick={() => { setSelectedKey(card.key); setTab("overview"); }} className={`w-full text-left p-3 hover:bg-muted/20 ${selectedKey === card.key ? "bg-gold/5 border-l-2 border-gold" : "border-l-2 border-transparent"}`}><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{card.reference} · {card.source}</p><p className="font-display text-lg truncate mt-1">{card.company || card.name}</p><p className="text-xs text-muted-foreground truncate mt-1">{card.country || "Country missing"} · {card.productInterest || "Requirement missing"}</p></button>)}</div>
        </aside>

        {!selected ? <div className="border border-dashed border-border/60 p-12 text-center"><UserRound size={30} className="mx-auto text-gold" /><p className="font-display text-2xl mt-4">Select a buyer</p></div> : (
          <main className="min-w-0 space-y-5">
            <section className="border border-border/60 bg-card/25 p-5 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5"><div><p className="text-[10px] uppercase tracking-[0.16em] text-gold">{selected.reference} · {selected.source}</p><h2 className="font-display text-3xl md:text-4xl mt-2">{selected.company || selected.name}</h2><p className="text-sm text-muted-foreground mt-2">{selected.name}{selected.country ? ` · ${selected.country}` : ""}</p></div><div className="flex flex-wrap gap-2"><Badge label={STAGE_LABELS[selected.stage]} /><Badge label={selected.priority} tone={selected.priority === "urgent" ? "warn" : "neutral"} /><Badge label={selected.assignee || "Unassigned"} /></div></div>
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{(["overview", "contacts", "timeline", "files", "duplicates"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-11 shrink-0 border px-4 text-[10px] uppercase tracking-[0.16em] ${tab === item ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}>{item === "duplicates" ? `Duplicates (${duplicateSuggestions.filter((row) => row.left.key === selected.key || row.right.key === selected.key).length})` : item}</button>)}</div>
            </section>

            {tab === "overview" && <OverviewTab card={selected} contacts={selectedContacts} notes={selectedNotes} copied={copied} onCopy={copyValue} noteText={noteText} setNoteText={setNoteText} addNote={() => void addNote()} busy={busy} togglePin={(note) => void togglePin(note)} removeNote={(note) => void removeNote(note)} />}
            {tab === "contacts" && <ContactsTab card={selected} contacts={selectedContacts} onAdd={() => setContactDraft(emptyContact(selected))} onRemove={(contact) => void removeContact(contact)} />}
            {tab === "timeline" && <TimelineTab events={selectedEvents} tasks={selectedTasks} notes={selectedNotes} />}
            {tab === "files" && <FilesTab files={selectedFiles} draft={fileDraft} setDraft={setFileDraft} busy={busy === "file"} inputRef={fileInput} onFile={(file) => void uploadFile(file)} onOpen={(file) => void openFile(file)} onRemove={(file) => void removeFile(file)} />}
            {tab === "duplicates" && <DuplicatesTab selected={selected} suggestions={duplicateSuggestions} links={linkByPair} busy={busy} onStatus={(suggestion, status) => void setDuplicateStatus(suggestion, status)} onOpen={(card) => { setSelectedKey(card.key); setTab("overview"); }} />}
          </main>
        )}
      </div>

      {contactDraft && selected && <ContactDialog draft={contactDraft} setDraft={setContactDraft} saving={busy === "contact"} onClose={() => setContactDraft(null)} onSave={() => void addContact()} />}
    </div>
  );
}

function OverviewTab({ card, contacts, notes, copied, onCopy, noteText, setNoteText, addNote, busy, togglePin, removeNote }: { card: SalesCard; contacts: BuyerContact[]; notes: BuyerNote[]; copied: string | null; onCopy: (value: string, key: string) => void; noteText: string; setNoteText: (value: string) => void; addNote: () => void; busy: string | null; togglePin: (note: BuyerNote) => void; removeNote: (note: BuyerNote) => void }) {
  return <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] gap-5">
    <section className="border border-border/60 bg-card/20 p-5 space-y-4"><h3 className="font-display text-2xl">Buyer profile</h3><ProfileRow label="Company" value={card.company || "Not confirmed"} /><ProfileRow label="Contact name" value={card.name || "Not confirmed"} /><ProfileRow label="Country" value={card.country || "Not confirmed"} /><ProfileRow label="Product interest" value={card.productInterest || "Not confirmed"} /><ProfileRow label="Estimated quantity" value={card.quantity || "Not stated"} /><ProfileRow label="Sample" value={card.sampleStatus.replaceAll("_", " ")} /><ProfileRow label="Follow-up" value={card.followUpAt ? new Date(card.followUpAt).toLocaleString() : "Not scheduled"} />
      <div className="pt-2 space-y-2">{card.email && <CopyRow icon={<Mail size={14} />} value={card.email} copied={copied === "email"} onCopy={() => onCopy(card.email, "email")} href={`mailto:${card.email}`} />}{card.phone && <CopyRow icon={<Phone size={14} />} value={card.phone} copied={copied === "phone"} onCopy={() => onCopy(card.phone, "phone")} href={`https://wa.me/${card.phone.replace(/\D/g, "")}`} />}{card.website && <CopyRow icon={<ExternalLink size={14} />} value={card.website} copied={copied === "website"} onCopy={() => onCopy(card.website, "website")} href={card.website} />}</div>
      {card.message && <div className="border-t border-border/50 pt-4"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Original message</p><p className="text-sm text-foreground/75 whitespace-pre-wrap leading-relaxed mt-2">{card.message}</p></div>}
      <div className="border-t border-border/50 pt-4"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Additional contacts</p><p className="text-sm mt-2">{contacts.length} stored contact{contacts.length === 1 ? "" : "s"}</p></div>
    </section>
    <section className="border border-border/60 bg-card/20 p-5"><div className="flex items-center gap-2"><StickyNote size={16} className="text-gold" /><h3 className="font-display text-2xl">Private notes</h3></div><textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={4} placeholder="Add internal context, negotiation point or next-step note…" className="mt-4 w-full bg-background border border-border/60 px-3 py-3 text-sm" /><button type="button" onClick={addNote} disabled={busy === "note" || noteText.trim().length < 2} className="mt-2 min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"><Plus size={13} /> {busy === "note" ? "Saving…" : "Add note"}</button><div className="mt-5 space-y-2 max-h-[420px] overflow-y-auto">{notes.length === 0 ? <p className="text-xs text-muted-foreground">No private notes yet.</p> : notes.map((note) => <article key={note.id} className={`border p-3 ${note.pinned ? "border-gold/50 bg-gold/5" : "border-border/50"}`}><div className="flex items-start justify-between gap-3"><p className="text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p><div className="flex"><button type="button" onClick={() => togglePin(note)} className={`min-h-9 min-w-9 inline-flex items-center justify-center ${note.pinned ? "text-gold" : "text-muted-foreground"}`} title="Pin note"><Pin size={13} /></button><button type="button" onClick={() => removeNote(note)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-destructive" title="Delete note"><Trash2 size={13} /></button></div></div><p className="text-[10px] text-muted-foreground mt-2">{note.created_by_email || "Admin"} · {new Date(note.created_at).toLocaleString()}</p></article>)}</div></section>
  </div>;
}

function ContactsTab({ card, contacts, onAdd, onRemove }: { card: SalesCard; contacts: BuyerContact[]; onAdd: () => void; onRemove: (contact: BuyerContact) => void }) {
  return <section className="border border-border/60 bg-card/20 p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow mb-2">People</p><h3 className="font-display text-2xl">Buyer contacts</h3></div><button type="button" onClick={onAdd} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em]"><Plus size={13} /> Add contact</button></div><div className="mt-5 grid md:grid-cols-2 gap-3"><ContactCard name={card.name} job="Source contact" email={card.email} phone={card.phone} primary />{contacts.map((contact) => <article key={contact.id} className="border border-border/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-xl">{contact.name}</p><p className="text-xs text-muted-foreground mt-1">{contact.job_title || "Role not specified"}{contact.is_primary ? " · Primary" : ""}</p></div><button type="button" onClick={() => onRemove(contact)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-destructive"><Trash2 size={13} /></button></div><div className="mt-4 space-y-2 text-sm">{contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-gold"><Mail size={13} /> {contact.email}</a>}{contact.whatsapp && <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 hover:text-emerald-300"><MessageCircle size={13} /> {contact.whatsapp}</a>}{contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-gold"><Phone size={13} /> {contact.phone}</a>}{contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 hover:text-gold"><ExternalLink size={13} /> LinkedIn</a>}</div></article>)}</div></section>;
}

function TimelineTab({ events, tasks, notes }: { events: ActivityEvent[]; tasks: SalesTask[]; notes: BuyerNote[] }) {
  const items = [
    ...events.map((event) => ({ key: `event:${event.id}`, at: event.created_at, type: event.event_type, title: event.summary, detail: "Activity event" })),
    ...tasks.map((task) => ({ key: `task:${task.id}`, at: task.completed_at || task.updated_at || task.created_at, type: task.status === "completed" ? "task_completed" : "task", title: task.title, detail: task.due_at ? `Due ${new Date(task.due_at).toLocaleString()}` : "No due date" })),
    ...notes.map((note) => ({ key: `note:${note.id}`, at: note.created_at, type: "note", title: note.body, detail: note.created_by_email || "Admin note" })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return <section className="border border-border/60 bg-card/20 p-5 md:p-6"><div className="flex items-center gap-2"><Clock3 size={16} className="text-gold" /><h3 className="font-display text-2xl">Complete timeline</h3></div><div className="mt-5 space-y-0">{items.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Timeline activates as notes, tasks and CRM activity are recorded.</p> : items.map((item, index) => <div key={item.key} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3"><div className="flex flex-col items-center"><span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-gold" />{index < items.length - 1 && <span className="w-px flex-1 min-h-12 bg-border" />}</div><article className="pb-5"><p className="text-[9px] uppercase tracking-[0.15em] text-gold">{item.type.replaceAll("_", " ")}</p><p className="text-sm mt-1 whitespace-pre-wrap">{item.title}</p><p className="text-xs text-muted-foreground mt-1">{item.detail} · {new Date(item.at).toLocaleString()}</p></article></div>)}</div></section>;
}

function FilesTab({ files, draft, setDraft, busy, inputRef, onFile, onOpen, onRemove }: { files: BuyerFile[]; draft: FileDraft; setDraft: (draft: FileDraft) => void; busy: boolean; inputRef: React.RefObject<HTMLInputElement>; onFile: (file: File) => void; onOpen: (file: BuyerFile) => void; onRemove: (file: BuyerFile) => void }) {
  return <section className="border border-border/60 bg-card/20 p-5 md:p-6"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="eyebrow mb-2">Private storage</p><h3 className="font-display text-2xl">Buyer files</h3><p className="text-xs text-muted-foreground mt-2">Files remain private. Admin receives a five-minute signed URL only when opening a file.</p></div><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"><UploadCloud size={14} /> {busy ? "Uploading…" : "Upload private file"}</button><input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx,.csv,.txt" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} /></div><div className="mt-5 grid md:grid-cols-2 gap-3"><label className="space-y-2"><span className="text-xs text-muted-foreground">File category</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as BuyerFile["category"] })} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="reference">Reference</option><option value="tech_pack">Tech pack</option><option value="quotation">Quotation</option><option value="sample">Sample</option><option value="compliance">Compliance</option><option value="shipping">Shipping</option><option value="other">Other</option></select></label><label className="space-y-2"><span className="text-xs text-muted-foreground">Description for next upload</span><input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm" placeholder="What is this file?" /></label></div><div className="mt-5 space-y-2">{files.length === 0 ? <div className="py-10 text-center border border-dashed border-border/60"><Paperclip size={26} className="mx-auto text-gold" /><p className="text-sm mt-3">No private files yet.</p></div> : files.map((file) => <article key={file.id} className="border border-border/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3"><FileText size={20} className="text-gold shrink-0" /><div className="flex-1 min-w-0"><p className="truncate">{file.file_name}</p><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground mt-1">{file.category.replaceAll("_", " ")} · {fileSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}</p>{file.description && <p className="text-xs text-foreground/60 mt-1">{file.description}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => onOpen(file)} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-xs hover:border-gold"><Download size={13} /> Open</button><button type="button" onClick={() => onRemove(file)} className="min-h-10 min-w-10 inline-flex items-center justify-center border border-destructive/40 text-destructive"><Trash2 size={13} /></button></div></article>)}</div></section>;
}

function DuplicatesTab({ selected, suggestions, links, busy, onStatus, onOpen }: { selected: SalesCard; suggestions: DuplicateSuggestion[]; links: Map<string, RecordLink>; busy: string | null; onStatus: (suggestion: DuplicateSuggestion, status: RecordLink["status"]) => void; onOpen: (card: SalesCard) => void }) {
  const relevant = suggestions.filter((row) => row.left.key === selected.key || row.right.key === selected.key);
  return <section className="border border-border/60 bg-card/20 p-5 md:p-6"><div className="flex items-start gap-3"><ShieldCheck size={20} className="text-gold shrink-0 mt-1" /><div><h3 className="font-display text-2xl">Duplicate review</h3><p className="text-sm text-foreground/60 mt-2 max-w-3xl">Suggestions use exact contact/domain/company evidence. Confirming only links records—it never merges, overwrites or deletes buyer data.</p></div></div><div className="mt-5 space-y-3">{relevant.length === 0 ? <div className="py-10 text-center border border-dashed border-border/60"><Link2 size={26} className="mx-auto text-gold" /><p className="text-sm mt-3">No evidence-backed duplicate suggestion for this buyer.</p></div> : relevant.map((suggestion) => {
    const other = suggestion.left.key === selected.key ? suggestion.right : suggestion.left;
    const pairKey = linkPairKey(suggestion.left.source, suggestion.left.sourceId, suggestion.right.source, suggestion.right.sourceId);
    const link = links.get(pairKey);
    return <article key={suggestion.key} className="border border-border/60 p-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><button type="button" onClick={() => onOpen(other)} className="text-left min-w-0"><p className="text-[9px] uppercase tracking-[0.15em] text-gold">{other.reference} · {other.source}</p><p className="font-display text-xl mt-1">{other.company || other.name}</p><p className="text-xs text-muted-foreground mt-1">{other.country || "Country missing"} · {other.email || other.phone || other.website || "Contact missing"}</p></button><div className="flex flex-wrap gap-2"><Badge label={`${suggestion.score}% evidence`} tone={suggestion.score >= 70 ? "good" : "neutral"} />{link && <Badge label={link.status} tone={link.status === "confirmed" ? "good" : link.status === "rejected" ? "warn" : "neutral"} />}</div></div><p className="text-sm mt-4 border-l-2 border-gold/50 pl-3">{suggestion.reason}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onStatus(suggestion, "confirmed")} disabled={busy === `link:${pairKey}`} className="min-h-11 inline-flex items-center gap-2 border border-emerald-500/50 text-emerald-300 px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50"><Check size={13} /> Link as duplicate</button><button type="button" onClick={() => onStatus(suggestion, "rejected")} disabled={busy === `link:${pairKey}`} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50"><X size={13} /> Not duplicate</button></div></article>;
  })}</div></section>;
}

function ContactDialog({ draft, setDraft, saving, onClose, onSave }: { draft: ContactDraft; setDraft: (draft: ContactDraft) => void; saving: boolean; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><button type="button" onClick={onClose} aria-label="Close contact dialog" className="absolute inset-0 bg-background/85 backdrop-blur-sm" /><div className="relative w-full max-w-xl bg-card border border-border/60 p-5 sm:p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow mb-2">Buyer person</p><h3 className="font-display text-2xl">Add contact</h3></div><button type="button" onClick={onClose} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60"><X size={17} /></button></div><div className="mt-5 grid sm:grid-cols-2 gap-4"><Input label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} /><Input label="Job title" value={draft.jobTitle} onChange={(value) => setDraft({ ...draft, jobTitle: value })} /><Input label="Email" value={draft.email} type="email" onChange={(value) => setDraft({ ...draft, email: value })} /><Input label="Phone" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} /><Input label="WhatsApp" value={draft.whatsapp} onChange={(value) => setDraft({ ...draft, whatsapp: value })} /><Input label="LinkedIn HTTPS URL" value={draft.linkedinUrl} onChange={(value) => setDraft({ ...draft, linkedinUrl: value })} /><label className="sm:col-span-2 inline-flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.primary} onChange={(event) => setDraft({ ...draft, primary: event.target.checked })} /> Mark as primary contact</label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 px-4 border border-border/60 text-xs">Cancel</button><button type="button" onClick={onSave} disabled={saving || draft.name.trim().length < 2} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"><Plus size={13} /> {saving ? "Saving…" : "Add contact"}</button></div></div></div>;
}

function ContactCard({ name, job, email, phone, primary }: { name: string; job: string; email: string; phone: string; primary?: boolean }) {
  return <article className="border border-gold/40 bg-gold/5 p-4"><p className="font-display text-xl">{name || "Source contact"}</p><p className="text-xs text-muted-foreground mt-1">{job}{primary ? " · Primary" : ""}</p><div className="mt-4 space-y-2 text-sm">{email && <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-gold"><Mail size={13} /> {email}</a>}{phone && <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 hover:text-emerald-300"><MessageCircle size={13} /> {phone}</a>}</div></article>;
}
function ProfileRow({ label, value }: { label: string; value: string }) { return <div className="border-b border-border/50 pb-3"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="text-sm mt-1 capitalize break-words">{value}</p></div>; }
function CopyRow({ icon, value, copied, onCopy, href }: { icon: React.ReactNode; value: string; copied: boolean; onCopy: () => void; href: string }) { return <div className="flex items-center gap-2 border border-border/50 p-2"><a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer noopener" : undefined} className="flex-1 min-w-0 flex items-center gap-2 text-xs hover:text-gold"><span className="shrink-0">{icon}</span><span className="truncate">{value}</span></a><button type="button" onClick={onCopy} className="min-h-9 min-w-9 inline-flex items-center justify-center text-muted-foreground hover:text-gold">{copied ? <Check size={13} /> : <Copy size={13} />}</button></div>; }
function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" }) { return <span className={`inline-flex min-h-8 items-center border px-2.5 text-[9px] uppercase tracking-[0.14em] ${tone === "good" ? "border-emerald-500/50 text-emerald-300" : tone === "warn" ? "border-amber-500/50 text-amber-300" : "border-border/60 text-muted-foreground"}`}>{label}</span>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="space-y-2"><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm" /></label>; }
