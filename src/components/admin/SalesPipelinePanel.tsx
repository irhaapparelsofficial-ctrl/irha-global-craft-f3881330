import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  ListTodo,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ACTIVE_STAGES,
  SALES_STAGES,
  STAGE_LABELS,
  dueBucket,
  nextBestAction,
  normalizePriority,
  normalizeStage,
  referenceFor,
  sortSalesCards,
  stageProgress,
  taskCounts,
  type SalesCard,
  type SalesPriority,
  type SalesSource,
  type SalesStage,
  type SalesTask,
} from "@/lib/salesPipeline";

const db = supabase as any;
type ViewMode = "board" | "actions" | "tasks";
type DueFilter = "all" | "overdue" | "today" | "upcoming" | "none";

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

type TaskDraft = {
  source: SalesSource;
  sourceId: string;
  reference: string;
  title: string;
  notes: string;
  priority: SalesPriority;
  dueLocal: string;
};

function textFrom(context: Record<string, unknown> | null, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value : "";
}

function inquiryCard(row: InquiryRow): SalesCard {
  const context = row.lead_context && typeof row.lead_context === "object" ? row.lead_context : null;
  return {
    key: `inquiry:${row.id}`,
    source: "inquiry",
    sourceId: row.id,
    reference: referenceFor("inquiry", row.id),
    stage: normalizeStage(row.status),
    name: row.name || "Buyer",
    company: row.company || "",
    country: row.country || textFrom(context, "destination_country"),
    email: row.email || "",
    phone: row.phone || "",
    website: "",
    productInterest: textFrom(context, "product_name") || row.category || "",
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

function catalogueCard(row: CatalogueRow): SalesCard {
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

function prospectCard(row: ProspectRow): SalesCard {
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

function legacyStage(stage: SalesStage) {
  if (stage === "lost") return "Rejected";
  if (stage === "replied") return "Replied";
  if (["qualified", "negotiation", "won"].includes(stage)) return "Warm";
  if (["contacted", "sample_requested", "quote_requested", "quotation_sent"].includes(stage)) return "Pitched";
  return "New";
}

function localValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function SalesPipelinePanel() {
  const { user } = useAuth();
  const [cards, setCards] = useState<SalesCard[]>([]);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | SalesSource>("all");
  const [priority, setPriority] = useState<"all" | SalesPriority>("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [backendNotes, setBackendNotes] = useState<string[]>([]);
  const [selected, setSelected] = useState<SalesCard | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const notes: string[] = [];
    const [inquiries, catalogues, prospects, taskResult] = await Promise.all([
      db.from("inquiries").select("id,name,email,phone,company,country,category,quantity,message,status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at,lead_context").order("updated_at", { ascending: false }).limit(500),
      db.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,category_interest,message,status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(500),
      db.from("b2b_leads").select("id,company_name,country,email,phone,website,apparel_segment,crm_status,lead_status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(1000),
      db.from("crm_tasks").select("*").order("due_at", { ascending: true }).limit(1000),
    ]);

    const nextCards = [
      ...((inquiries.data ?? []) as InquiryRow[]).map(inquiryCard),
      ...((catalogues.data ?? []) as CatalogueRow[]).map(catalogueCard),
      ...((prospects.data ?? []) as ProspectRow[]).map(prospectCard),
    ];
    for (const [label, result] of [["Inquiries", inquiries], ["Catalogue leads", catalogues], ["Prospects", prospects]] as const) {
      if (result.error) notes.push(`${label}: ${result.error.message}`);
    }
    if (taskResult.error) notes.push("CRM task backend is deferred until the final database activation.");

    setCards(sortSalesCards(nextCards));
    setTasks((taskResult.data ?? []) as SalesTask[]);
    setBackendNotes(notes);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortSalesCards(cards.filter((card) => {
      if (source !== "all" && card.source !== source) return false;
      if (priority !== "all" && card.priority !== priority) return false;
      if (due !== "all" && dueBucket(card.followUpAt) !== due) return false;
      if (!needle) return true;
      return [card.reference, card.name, card.company, card.country, card.email, card.phone, card.productInterest, card.message, card.stage, card.assignee]
        .join(" ").toLowerCase().includes(needle);
    }));
  }, [cards, due, priority, query, source]);

  const stats = useMemo(() => {
    const active = cards.filter((card) => !["won", "lost"].includes(card.stage));
    return {
      total: cards.length,
      active: active.length,
      overdue: active.filter((card) => dueBucket(card.followUpAt) === "overdue").length,
      quote: active.filter((card) => ["quote_requested", "quotation_sent", "negotiation"].includes(card.stage)).length,
      won: cards.filter((card) => card.stage === "won").length,
      tasks: taskCounts(tasks),
    };
  }, [cards, tasks]);

  const moveStage = async (card: SalesCard, stage: SalesStage) => {
    if (card.stage === stage) return;
    setBusyKey(card.key);
    const table = card.source === "inquiry" ? "inquiries" : card.source === "catalogue" ? "catalogue_leads" : "b2b_leads";
    const payload = card.source === "prospect" ? { crm_status: stage, lead_status: legacyStage(stage) } : { status: stage };
    const { error } = await db.from(table).update(payload).eq("id", card.sourceId);
    if (error) {
      setBusyKey(null);
      toast({ title: "Stage update failed", description: error.message, variant: "destructive" });
      return;
    }
    setCards((current) => current.map((item) => item.key === card.key ? { ...item, stage, updatedAt: new Date().toISOString() } : item));
    setSelected((current) => current?.key === card.key ? { ...current, stage, updatedAt: new Date().toISOString() } : current);
    setBusyKey(null);
    toast({ title: `${card.reference} moved to ${STAGE_LABELS[stage]}` });
    void db.from("crm_activity_events").insert({ source_type: card.source, source_id: card.sourceId, event_type: "stage_changed", summary: `${STAGE_LABELS[card.stage]} → ${STAGE_LABELS[stage]}`, metadata: { from: card.stage, to: stage } });
  };

  const setFollowUp = async (card: SalesCard, value: string) => {
    const iso = value ? new Date(value).toISOString() : null;
    const table = card.source === "inquiry" ? "inquiries" : card.source === "catalogue" ? "catalogue_leads" : "b2b_leads";
    setBusyKey(card.key);
    const { error } = await db.from(table).update({ follow_up_at: iso }).eq("id", card.sourceId);
    setBusyKey(null);
    if (error) {
      toast({ title: "Follow-up update failed", description: error.message, variant: "destructive" });
      return;
    }
    setCards((current) => current.map((item) => item.key === card.key ? { ...item, followUpAt: iso } : item));
    setSelected((current) => current?.key === card.key ? { ...current, followUpAt: iso } : current);
    toast({ title: iso ? "Follow-up scheduled" : "Follow-up cleared" });
  };

  const openTask = (card: SalesCard) => setTaskDraft({
    source: card.source,
    sourceId: card.sourceId,
    reference: card.reference,
    title: nextBestAction(card),
    notes: "",
    priority: card.priority,
    dueLocal: localValue(card.followUpAt) || localValue(new Date(Date.now() + 86_400_000).toISOString()),
  });

  const saveTask = async () => {
    if (!taskDraft || !taskDraft.title.trim()) return;
    setBusyKey(`task:${taskDraft.source}:${taskDraft.sourceId}`);
    const { data, error } = await db.from("crm_tasks").insert({
      source_type: taskDraft.source,
      source_id: taskDraft.sourceId,
      title: taskDraft.title.trim(),
      notes: taskDraft.notes.trim() || null,
      priority: taskDraft.priority,
      status: "open",
      due_at: taskDraft.dueLocal ? new Date(taskDraft.dueLocal).toISOString() : null,
      assigned_to: user?.email || null,
    }).select("*").single();
    setBusyKey(null);
    if (error) {
      toast({ title: "Task backend is not active yet", description: "The migration is prepared for the final one-time database activation.", variant: "destructive" });
      return;
    }
    setTasks((current) => [...current, data as SalesTask]);
    setTaskDraft(null);
    toast({ title: "CRM task created" });
  };

  const completeTask = async (task: SalesTask) => {
    const nextStatus = task.status === "completed" ? "open" : "completed";
    const { data, error } = await db.from("crm_tasks").update({ status: nextStatus, completed_at: nextStatus === "completed" ? new Date().toISOString() : null }).eq("id", task.id).select("*").single();
    if (error) {
      toast({ title: "Task update failed", description: error.message, variant: "destructive" });
      return;
    }
    setTasks((current) => current.map((item) => item.id === task.id ? data as SalesTask : item));
  };

  return (
    <div className="space-y-5">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3">
            <UserRoundCheck className="text-gold shrink-0 mt-1" size={22} />
            <div><p className="eyebrow mb-2">Phase 3 · Sales CRM</p><h2 className="font-display text-2xl md:text-4xl">Sales Pipeline</h2><p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">One mobile-first pipeline for RFQs, catalogue buyers and researched prospects. Move stages, schedule follow-ups, create tasks and see the next evidence-based sales action without switching systems.</p></div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh CRM</button>
        </div>
      </section>

      {backendNotes.length > 0 && <div className="border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-200"><AlertTriangle size={17} className="shrink-0 mt-0.5" /><div><p className="font-medium">Backend activation status</p><p className="mt-1 text-xs text-foreground/60">{backendNotes.join(" · ")}</p></div></div>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Metric label="All buyers" value={stats.total} />
        <Metric label="Active pipeline" value={stats.active} />
        <Metric label="Overdue follow-ups" value={stats.overdue} tone={stats.overdue ? "warn" : "good"} />
        <Metric label="Quote / negotiation" value={stats.quote} />
        <Metric label="Won" value={stats.won} tone="good" />
        <Metric label="Open tasks" value={stats.tasks.open} tone={stats.tasks.overdue ? "warn" : "neutral"} />
      </div>

      <section className="border border-border/60 bg-card/20 p-3 sm:p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["board", "actions", "tasks"] as ViewMode[]).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`min-h-11 shrink-0 border px-4 text-[10px] uppercase tracking-[0.17em] ${view === item ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}>{item === "board" ? "Pipeline board" : item === "actions" ? "Action queue" : `Tasks (${stats.tasks.open})`}</button>)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,220px))] gap-2">
          <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer, company, country, product…" className="w-full min-h-11 bg-background border border-border/60 pl-9 pr-3 text-sm" /></label>
          <select value={source} onChange={(event) => setSource(event.target.value as typeof source)} className="min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="all">All sources</option><option value="inquiry">RFQ / inquiry</option><option value="catalogue">Catalogue</option><option value="prospect">Prospect</option></select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select>
          <select value={due} onChange={(event) => setDue(event.target.value as DueFilter)} className="min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="all">All follow-ups</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Upcoming</option><option value="none">No follow-up</option></select>
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><Filter size={11} className="inline mr-1" /> Showing {filtered.length} of {cards.length} buyer records</p>
      </section>

      {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading sales workspace…</div> : view === "board" ? (
        <PipelineBoard cards={filtered} busyKey={busyKey} onSelect={setSelected} onMove={moveStage} onTask={openTask} />
      ) : view === "actions" ? (
        <ActionQueue cards={filtered} onSelect={setSelected} onTask={openTask} />
      ) : (
        <TaskWorkspace tasks={tasks} cards={cards} onComplete={completeTask} onSelect={(card) => setSelected(card)} />
      )}

      {selected && <BuyerDrawer card={selected} busy={busyKey === selected.key} onClose={() => setSelected(null)} onMove={(stage) => void moveStage(selected, stage)} onFollowUp={(value) => void setFollowUp(selected, value)} onTask={() => openTask(selected)} />}
      {taskDraft && <TaskDialog draft={taskDraft} setDraft={setTaskDraft} saving={busyKey?.startsWith("task:") || false} onClose={() => setTaskDraft(null)} onSave={() => void saveTask()} />}
    </div>
  );
}

function PipelineBoard({ cards, busyKey, onSelect, onMove, onTask }: { cards: SalesCard[]; busyKey: string | null; onSelect: (card: SalesCard) => void; onMove: (card: SalesCard, stage: SalesStage) => void; onTask: (card: SalesCard) => void }) {
  return <div className="overflow-x-auto pb-3"><div className="flex gap-4 min-w-max items-start">{SALES_STAGES.map((stage) => {
    const stageCards = cards.filter((card) => card.stage === stage);
    return <section key={stage} className="w-[300px] sm:w-[330px] border border-border/60 bg-card/20 shrink-0"><header className="sticky top-0 z-10 flex items-center justify-between gap-3 p-3 border-b border-border/60 bg-card"><h3 className="font-display text-lg">{STAGE_LABELS[stage]}</h3><span className="min-w-7 h-7 rounded-full border border-border/60 inline-flex items-center justify-center text-xs">{stageCards.length}</span></header><div className="p-2 space-y-2 min-h-28 max-h-[68vh] overflow-y-auto">{stageCards.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No records</p> : stageCards.map((card) => <PipelineCard key={card.key} card={card} busy={busyKey === card.key} onSelect={() => onSelect(card)} onMove={(next) => onMove(card, next)} onTask={() => onTask(card)} />)}</div></section>;
  })}</div></div>;
}

function PipelineCard({ card, busy, onSelect, onMove, onTask }: { card: SalesCard; busy: boolean; onSelect: () => void; onMove: (stage: SalesStage) => void; onTask: () => void }) {
  const bucket = dueBucket(card.followUpAt);
  return <article className="border border-border/50 bg-background/45 p-3 space-y-3 hover:border-gold/45 transition-colors">
    <button type="button" onClick={onSelect} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.15em] text-gold">{card.reference} · {card.source}</p><h4 className="font-display text-lg mt-1 truncate">{card.company || card.name}</h4><p className="text-xs text-muted-foreground mt-1 truncate">{card.productInterest || "Requirement not confirmed"}</p></div><ChevronRight size={15} className="shrink-0 text-muted-foreground mt-1" /></div></button>
    <div className="flex items-center justify-between gap-2 text-[10px]"><span className={`uppercase tracking-[0.12em] border px-2 py-1 ${card.priority === "urgent" ? "border-red-500/50 text-red-300" : card.priority === "high" ? "border-amber-500/50 text-amber-300" : "border-border/60 text-muted-foreground"}`}>{card.priority}</span><span className={bucket === "overdue" ? "text-red-300" : bucket === "today" ? "text-amber-300" : "text-muted-foreground"}>{card.followUpAt ? new Date(card.followUpAt).toLocaleDateString() : "No follow-up"}</span></div>
    <p className="text-xs text-foreground/65 border-l-2 border-gold/50 pl-2">{nextBestAction(card)}</p>
    <div className="grid grid-cols-[1fr_auto] gap-2"><select value={card.stage} disabled={busy} onChange={(event) => onMove(event.target.value as SalesStage)} className="min-h-10 bg-card border border-border/60 px-2 text-xs">{SALES_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select><button type="button" onClick={onTask} title="Create task" className="min-h-10 min-w-10 inline-flex items-center justify-center border border-border/60 hover:border-gold hover:text-gold"><Plus size={14} /></button></div>
  </article>;
}

function ActionQueue({ cards, onSelect, onTask }: { cards: SalesCard[]; onSelect: (card: SalesCard) => void; onTask: (card: SalesCard) => void }) {
  const active = cards.filter((card) => !["won", "lost"].includes(card.stage));
  return <div className="border border-border/60 bg-card/20 divide-y divide-border/50">{active.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No active sales actions match the filters.</p> : active.map((card) => <div key={card.key} className="p-4 grid lg:grid-cols-[minmax(0,1.4fr)_minmax(200px,1fr)_auto] gap-3 items-center"><button type="button" onClick={() => onSelect(card)} className="text-left min-w-0"><p className="text-[9px] uppercase tracking-[0.15em] text-gold">{card.reference} · {STAGE_LABELS[card.stage]}</p><p className="font-display text-lg truncate mt-1">{card.company || card.name}</p><p className="text-xs text-muted-foreground truncate">{card.country || "Country not confirmed"} · {card.productInterest || "Requirement missing"}</p></button><div><p className="text-sm">{nextBestAction(card)}</p><p className={`text-xs mt-1 ${dueBucket(card.followUpAt) === "overdue" ? "text-red-300" : "text-muted-foreground"}`}>{card.followUpAt ? `Follow-up ${new Date(card.followUpAt).toLocaleString()}` : "Follow-up not scheduled"}</p></div><button type="button" onClick={() => onTask(card)} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.15em] hover:border-gold"><ListTodo size={13} /> Task</button></div>)}</div>;
}

function TaskWorkspace({ tasks, cards, onComplete, onSelect }: { tasks: SalesTask[]; cards: SalesCard[]; onComplete: (task: SalesTask) => void; onSelect: (card: SalesCard) => void }) {
  const map = new Map(cards.map((card) => [`${card.source}:${card.sourceId}`, card]));
  const sorted = [...tasks].sort((a, b) => (a.status === "open" ? -1 : 1) - (b.status === "open" ? -1 : 1) || new Date(a.due_at || "9999-12-31").getTime() - new Date(b.due_at || "9999-12-31").getTime());
  return <div className="border border-border/60 bg-card/20 divide-y divide-border/50">{sorted.length === 0 ? <div className="py-12 text-center"><ListTodo size={28} className="mx-auto text-gold" /><p className="font-display text-xl mt-3">No CRM tasks yet</p><p className="text-xs text-muted-foreground mt-2">Task storage activates during the final one-time database migration.</p></div> : sorted.map((task) => {
    const card = map.get(`${task.source_type}:${task.source_id}`);
    const bucket = dueBucket(task.due_at);
    return <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"><button type="button" onClick={() => void onComplete(task)} className={`min-h-11 min-w-11 inline-flex items-center justify-center border ${task.status === "completed" ? "border-emerald-500/50 text-emerald-300" : "border-border/60"}`}>{task.status === "completed" ? <CheckCircle2 size={18} /> : <Clock3 size={17} />}</button><div className="flex-1 min-w-0"><p className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>{task.title}</p><p className="text-xs text-muted-foreground mt-1">{card?.reference || `${task.source_type}:${task.source_id.slice(0, 8)}`} · {task.assigned_to || "Unassigned"}</p></div><div className={`text-xs ${bucket === "overdue" ? "text-red-300" : bucket === "today" ? "text-amber-300" : "text-muted-foreground"}`}>{task.due_at ? new Date(task.due_at).toLocaleString() : "No due date"}</div>{card && <button type="button" onClick={() => onSelect(card)} className="min-h-11 px-3 border border-border/60 text-xs hover:border-gold">Open buyer</button>}</div>;
  })}</div>;
}

function BuyerDrawer({ card, busy, onClose, onMove, onFollowUp, onTask }: { card: SalesCard; busy: boolean; onClose: () => void; onMove: (stage: SalesStage) => void; onFollowUp: (value: string) => void; onTask: () => void }) {
  return <div className="fixed inset-0 z-[70] flex justify-end"><button type="button" aria-label="Close buyer details" onClick={onClose} className="absolute inset-0 bg-background/80 backdrop-blur-sm" /><aside className="relative w-full max-w-xl h-[100dvh] overflow-y-auto bg-card border-l border-border/60 shadow-2xl p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">{card.reference} · {card.source}</p><h2 className="font-display text-3xl mt-2">{card.company || card.name}</h2><p className="text-sm text-muted-foreground mt-2">{card.name}{card.country ? ` · ${card.country}` : ""}</p></div><button type="button" onClick={onClose} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60"><X size={18} /></button></div>
    <div className="mt-6 h-2 bg-secondary/50 overflow-hidden"><div className="h-full bg-gradient-gold" style={{ width: `${stageProgress(card.stage)}%` }} /></div>
    <div className="mt-6 grid sm:grid-cols-2 gap-3"><Field label="Stage"><select value={card.stage} disabled={busy} onChange={(event) => onMove(event.target.value as SalesStage)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm">{SALES_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select></Field><Field label="Follow-up"><input type="datetime-local" defaultValue={localValue(card.followUpAt)} onBlur={(event) => onFollowUp(event.target.value)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm" /></Field></div>
    <section className="mt-6 border border-gold/35 bg-gold/5 p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Next best action</p><p className="font-display text-xl mt-2">{nextBestAction(card)}</p><button type="button" onClick={onTask} className="mt-4 min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.17em]"><Plus size={13} /> Create task</button></section>
    <section className="mt-6 grid gap-3"><Detail label="Product / requirement" value={card.productInterest || "Not confirmed"} /><Detail label="Estimated quantity" value={card.quantity || "Not stated"} /><Detail label="Priority" value={card.priority} /><Detail label="Assignee" value={card.assignee || "Unassigned"} /><Detail label="Sample status" value={card.sampleStatus.replaceAll("_", " ")} /></section>
    <section className="mt-6 border-t border-border/60 pt-5 space-y-3">{card.email && <a href={`mailto:${card.email}`} className="min-h-11 flex items-center gap-3 border border-border/60 px-4 hover:border-gold"><Mail size={15} /> <span className="break-all">{card.email}</span></a>}{card.phone && <a href={`https://wa.me/${card.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="min-h-11 flex items-center gap-3 border border-border/60 px-4 hover:border-emerald-500"><MessageCircle size={15} /> {card.phone}</a>}{card.website && <a href={card.website} target="_blank" rel="noreferrer noopener" className="min-h-11 flex items-center gap-3 border border-border/60 px-4 hover:border-gold"><ExternalLink size={15} /> Website</a>}{card.quotationUrl && <a href={card.quotationUrl} target="_blank" rel="noreferrer noopener" className="min-h-11 flex items-center gap-3 border border-border/60 px-4 hover:border-gold"><ExternalLink size={15} /> Open quotation</a>}</section>
    {card.message && <section className="mt-6 border border-border/60 p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Buyer message</p><p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-wrap mt-2">{card.message}</p></section>}
  </aside></div>;
}

function TaskDialog({ draft, setDraft, saving, onClose, onSave }: { draft: TaskDraft; setDraft: (draft: TaskDraft) => void; saving: boolean; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><button type="button" aria-label="Close task dialog" onClick={onClose} className="absolute inset-0 bg-background/85 backdrop-blur-sm" /><div className="relative w-full max-w-lg bg-card border border-border/60 p-5 sm:p-7 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">{draft.reference}</p><h3 className="font-display text-2xl mt-1">Create CRM task</h3></div><button type="button" onClick={onClose} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60"><X size={17} /></button></div><div className="mt-5 space-y-4"><Field label="Task title"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm" /></Field><Field label="Due date"><input type="datetime-local" value={draft.dueLocal} onChange={(event) => setDraft({ ...draft, dueLocal: event.target.value })} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm" /></Field><Field label="Priority"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as SalesPriority })} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></Field><Field label="Private notes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={4} className="w-full bg-background border border-border/60 px-3 py-3 text-sm" /></Field></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 px-4 border border-border/60 text-xs">Cancel</button><button type="button" onClick={onSave} disabled={saving || !draft.title.trim()} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.17em] disabled:opacity-50"><Plus size={13} /> {saving ? "Saving…" : "Create task"}</button></div></div></div>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "good" | "warn" }) {
  return <div className="border border-border/60 bg-card/25 p-4"><p className={`font-display text-3xl tabular-nums ${tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : ""}`}>{value.toLocaleString()}</p><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{label}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2"><span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="border-b border-border/50 pb-3"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="text-sm mt-1 capitalize break-words">{value}</p></div>; }
