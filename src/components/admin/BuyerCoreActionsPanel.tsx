import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ListChecks,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRoundCog,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  SALES_STAGES,
  STAGE_LABELS,
  type SalesCard,
  type SalesPriority,
  type SalesStage,
  type SalesTask,
} from "@/lib/salesPipeline";

const db = supabase as any;
const FIELD = "min-h-12 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-gold";

type Meeting = {
  id: string;
  meeting_reference: string;
  title: string;
  meeting_type: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_url: string | null;
  status: string;
};

type CoreDraft = {
  stage: SalesStage;
  priority: SalesPriority;
  assignee: string;
  followUpLocal: string;
  outcomeReason: string;
  outreachOptOut: boolean;
};

type TaskDraft = {
  title: string;
  notes: string;
  priority: SalesPriority;
  dueLocal: string;
  assignedTo: string;
};

type MeetingDraft = {
  title: string;
  meetingType: "factory_video" | "sales_call" | "sample_review" | "quotation_review" | "other";
  startLocal: string;
  endLocal: string;
  timezone: string;
  locationUrl: string;
  agenda: string;
};

function toLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function localFuture(hoursAhead: number) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function iso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function coreDraft(card: SalesCard, optOut = false): CoreDraft {
  return {
    stage: card.stage,
    priority: card.priority,
    assignee: card.assignee || "",
    followUpLocal: toLocal(card.followUpAt),
    outcomeReason: "",
    outreachOptOut: optOut,
  };
}

function defaultTask(card: SalesCard): TaskDraft {
  return {
    title: `Follow up with ${card.company || card.name}`,
    notes: "",
    priority: card.priority,
    dueLocal: localFuture(24),
    assignedTo: card.assignee || "",
  };
}

function defaultMeeting(card: SalesCard): MeetingDraft {
  return {
    title: `Factory video call with ${card.company || card.name}`,
    meetingType: "factory_video",
    startLocal: localFuture(24),
    endLocal: localFuture(25),
    timezone: "Asia/Karachi",
    locationUrl: "",
    agenda: card.productInterest ? `Discuss ${card.productInterest} requirements.` : "Discuss buyer requirements and next steps.",
  };
}

export default function BuyerCoreActionsPanel({ card, onChanged }: { card: SalesCard; onChanged: () => void }) {
  const [core, setCore] = useState<CoreDraft>(() => coreDraft(card));
  const [task, setTask] = useState<TaskDraft>(() => defaultTask(card));
  const [meeting, setMeeting] = useState<MeetingDraft>(() => defaultMeeting(card));
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [taskResult, meetingResult, preferenceResult] = await Promise.all([
      db.from("crm_tasks").select("*").eq("source_type", card.source).eq("source_id", card.sourceId).order("created_at", { ascending: false }).limit(100),
      db.from("crm_meetings").select("id,meeting_reference,title,meeting_type,start_at,end_at,timezone,location_url,status").eq("source_type", card.source).eq("source_id", card.sourceId).order("start_at", { ascending: true }).limit(100),
      card.source === "prospect"
        ? db.from("b2b_leads").select("outreach_opt_out").eq("id", card.sourceId).maybeSingle()
        : Promise.resolve({ data: { outreach_opt_out: false }, error: null }),
    ]);

    setTasks((taskResult.data || []) as SalesTask[]);
    setMeetings((meetingResult.data || []) as Meeting[]);
    setCore(coreDraft(card, Boolean(preferenceResult.data?.outreach_opt_out)));
    setTask(defaultTask(card));
    setMeeting(defaultMeeting(card));
    setError(taskResult.error?.message || meetingResult.error?.message || preferenceResult.error?.message || null);
    setLoading(false);
  }, [card]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTasks = useMemo(() => tasks.filter((row) => row.status === "open"), [tasks]);
  const upcomingMeetings = useMemo(
    () => meetings.filter((row) => row.status === "scheduled" && new Date(row.end_at).getTime() >= Date.now()),
    [meetings],
  );

  const saveCore = async () => {
    if (core.stage === "lost" && core.outcomeReason.trim().length < 2) {
      toast({ title: "Lost reason is required", description: "Record the real reason before closing this buyer.", variant: "destructive" });
      return;
    }
    setBusy("core");
    const { error: rpcError } = await db.rpc("crm_update_buyer_operating_state", {
      _source_type: card.source,
      _source_id: card.sourceId,
      _stage: core.stage,
      _priority: core.priority,
      _assignee: core.assignee.trim() || null,
      _follow_up_at: iso(core.followUpLocal),
      _outreach_opt_out: card.source === "prospect" ? core.outreachOptOut : null,
      _outcome_reason: core.outcomeReason.trim() || null,
    });
    setBusy(null);
    if (rpcError) {
      toast({ title: "Buyer state was not saved", description: rpcError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Buyer progress saved", description: "Pipeline, priority and next follow-up are updated in the live CRM." });
    onChanged();
    await load();
  };

  const createTask = async () => {
    if (task.title.trim().length < 2 || !task.dueLocal) {
      toast({ title: "Task title and due time are required", variant: "destructive" });
      return;
    }
    setBusy("task");
    const { data, error: rpcError } = await db.rpc("crm_create_followup_task", {
      _source_type: card.source,
      _source_id: card.sourceId,
      _title: task.title.trim(),
      _notes: task.notes.trim() || null,
      _priority: task.priority,
      _due_at: iso(task.dueLocal),
      _assigned_to: task.assignedTo.trim() || null,
    });
    setBusy(null);
    if (rpcError) {
      toast({ title: "Follow-up was not created", description: rpcError.message, variant: "destructive" });
      return;
    }
    setTasks((current) => [data as SalesTask, ...current]);
    setTask(defaultTask(card));
    toast({ title: "Follow-up task created" });
    onChanged();
  };

  const setTaskStatus = async (row: SalesTask, status: "completed" | "cancelled") => {
    setBusy(`task:${row.id}`);
    const { data, error: rpcError } = await db.rpc("crm_set_task_status", { _task_id: row.id, _status: status });
    setBusy(null);
    if (rpcError) {
      toast({ title: "Task status was not updated", description: rpcError.message, variant: "destructive" });
      return;
    }
    setTasks((current) => current.map((item) => item.id === row.id ? data as SalesTask : item));
    toast({ title: status === "completed" ? "Task completed" : "Task cancelled" });
    onChanged();
  };

  const scheduleMeeting = async () => {
    const startAt = iso(meeting.startLocal);
    const endAt = iso(meeting.endLocal);
    if (meeting.title.trim().length < 2 || !startAt || !endAt) {
      toast({ title: "Meeting title, start and end are required", variant: "destructive" });
      return;
    }
    setBusy("meeting");
    const { data, error: rpcError } = await db.rpc("crm_schedule_buyer_meeting", {
      _source_type: card.source,
      _source_id: card.sourceId,
      _title: meeting.title.trim(),
      _meeting_type: meeting.meetingType,
      _start_at: startAt,
      _end_at: endAt,
      _timezone: meeting.timezone.trim() || "Asia/Karachi",
      _location_url: meeting.locationUrl.trim() || null,
      _agenda: meeting.agenda.trim() || null,
    });
    setBusy(null);
    if (rpcError) {
      toast({ title: "Meeting was not scheduled", description: rpcError.message, variant: "destructive" });
      return;
    }
    setMeetings((current) => [...current, data as Meeting].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
    setMeeting(defaultMeeting(card));
    toast({ title: "Buyer meeting scheduled", description: "The meeting is saved privately. No invitation was sent automatically." });
    onChanged();
  };

  return (
    <div className="space-y-5">
      <section className="border border-emerald-500/30 bg-emerald-500/[0.035] p-4 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-1" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Live owner Supabase · Admin guarded</p>
              <h3 className="font-display text-2xl mt-1">Buyer Actions</h3>
              <p className="text-sm text-foreground/65 mt-2 max-w-3xl leading-relaxed">
                Update the buyer, create a real follow-up, or schedule a meeting. Every change is written to the private CRM timeline. Nothing is emailed, messaged or promised automatically.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </section>

      {error && <div className="border border-red-500/40 bg-red-500/[0.05] p-4 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric label="Open follow-ups" value={openTasks.length} />
        <Metric label="Upcoming meetings" value={upcomingMeetings.length} />
        <Metric label="Current stage" value={STAGE_LABELS[core.stage]} compact />
        <Metric label="Priority" value={core.priority} compact />
      </div>

      <section className="border border-border/60 bg-card/25 p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2"><UserRoundCog size={18} className="text-gold" /><h3 className="font-display text-xl">Buyer progress and ownership</h3></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Sales stage">
            <select value={core.stage} onChange={(event) => setCore({ ...core, stage: event.target.value as SalesStage })} className={FIELD}>
              {SALES_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={core.priority} onChange={(event) => setCore({ ...core, priority: event.target.value as SalesPriority })} className={FIELD}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Owner / assignee"><input value={core.assignee} onChange={(event) => setCore({ ...core, assignee: event.target.value })} className={FIELD} placeholder="Daim, sales team…" /></Field>
          <Field label="Next follow-up"><input type="datetime-local" value={core.followUpLocal} onChange={(event) => setCore({ ...core, followUpLocal: event.target.value })} className={FIELD} /></Field>
        </div>

        {card.source === "prospect" && (
          <label className="min-h-12 flex items-center gap-3 border border-border/60 bg-background/40 px-4 text-sm">
            <input type="checkbox" checked={core.outreachOptOut} onChange={(event) => setCore({ ...core, outreachOptOut: event.target.checked })} className="h-4 w-4" />
            <span><strong>Stop outreach</strong><span className="block text-xs text-muted-foreground">Prevents future prospect outreach after a decline or opt-out.</span></span>
          </label>
        )}

        {(core.stage === "lost" || core.stage === "won") && (
          <Field label={core.stage === "lost" ? "Lost reason *" : "Outcome note"}>
            <textarea rows={3} value={core.outcomeReason} onChange={(event) => setCore({ ...core, outcomeReason: event.target.value })} className={`${FIELD} py-3`} placeholder={core.stage === "lost" ? "Current product range did not match, price, timing, no response…" : "Order scope or next repeat-order action…"} />
          </Field>
        )}

        <button type="button" onClick={() => void saveCore()} disabled={busy === "core"} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 text-[10px] uppercase tracking-[0.16em] text-background disabled:opacity-50">
          <Save size={14} /> {busy === "core" ? "Saving…" : "Save buyer progress"}
        </button>
      </section>

      <div className="grid xl:grid-cols-2 gap-5">
        <section className="border border-border/60 bg-card/25 p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2"><ListChecks size={18} className="text-gold" /><h3 className="font-display text-xl">Create follow-up</h3></div>
          <Field label="Task title *"><input value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} className={FIELD} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Due date and time *"><input type="datetime-local" value={task.dueLocal} onChange={(event) => setTask({ ...task, dueLocal: event.target.value })} className={FIELD} /></Field>
            <Field label="Priority"><select value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value as SalesPriority })} className={FIELD}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field>
          </div>
          <Field label="Assigned to"><input value={task.assignedTo} onChange={(event) => setTask({ ...task, assignedTo: event.target.value })} className={FIELD} /></Field>
          <Field label="Private notes"><textarea rows={3} value={task.notes} onChange={(event) => setTask({ ...task, notes: event.target.value })} className={`${FIELD} py-3`} /></Field>
          <button type="button" onClick={() => void createTask()} disabled={busy === "task"} className="min-h-12 inline-flex items-center justify-center gap-2 border border-gold/50 px-5 text-[10px] uppercase tracking-[0.16em] text-gold disabled:opacity-50">
            <Clock3 size={14} /> {busy === "task" ? "Creating…" : "Create follow-up"}
          </button>
        </section>

        <section className="border border-border/60 bg-card/25 p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2"><CalendarPlus size={18} className="text-gold" /><h3 className="font-display text-xl">Schedule meeting</h3></div>
          <Field label="Meeting title *"><input value={meeting.title} onChange={(event) => setMeeting({ ...meeting, title: event.target.value })} className={FIELD} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Meeting type"><select value={meeting.meetingType} onChange={(event) => setMeeting({ ...meeting, meetingType: event.target.value as MeetingDraft["meetingType"] })} className={FIELD}><option value="factory_video">Factory video call</option><option value="sales_call">Sales call</option><option value="sample_review">Sample review</option><option value="quotation_review">Quotation review</option><option value="other">Other</option></select></Field>
            <Field label="Timezone"><input value={meeting.timezone} onChange={(event) => setMeeting({ ...meeting, timezone: event.target.value })} className={FIELD} /></Field>
            <Field label="Start *"><input type="datetime-local" value={meeting.startLocal} onChange={(event) => setMeeting({ ...meeting, startLocal: event.target.value })} className={FIELD} /></Field>
            <Field label="End *"><input type="datetime-local" value={meeting.endLocal} onChange={(event) => setMeeting({ ...meeting, endLocal: event.target.value })} className={FIELD} /></Field>
          </div>
          <Field label="Meeting link"><input type="url" value={meeting.locationUrl} onChange={(event) => setMeeting({ ...meeting, locationUrl: event.target.value })} className={FIELD} placeholder="https://meet.google.com/…" /></Field>
          <Field label="Agenda"><textarea rows={3} value={meeting.agenda} onChange={(event) => setMeeting({ ...meeting, agenda: event.target.value })} className={`${FIELD} py-3`} /></Field>
          <button type="button" onClick={() => void scheduleMeeting()} disabled={busy === "meeting"} className="min-h-12 inline-flex items-center justify-center gap-2 border border-gold/50 px-5 text-[10px] uppercase tracking-[0.16em] text-gold disabled:opacity-50">
            <CalendarPlus size={14} /> {busy === "meeting" ? "Scheduling…" : "Save meeting"}
          </button>
          <p className="text-xs text-muted-foreground">This saves the meeting privately. Calendar invitation and buyer email remain separate owner-approved actions.</p>
        </section>
      </div>

      {(openTasks.length > 0 || upcomingMeetings.length > 0) && (
        <div className="grid xl:grid-cols-2 gap-5">
          <section className="border border-border/60 bg-card/20 p-4 sm:p-5">
            <h3 className="font-display text-lg">Open follow-ups</h3>
            <div className="mt-3 space-y-2">
              {openTasks.length === 0 ? <p className="text-sm text-muted-foreground">No open follow-up.</p> : openTasks.map((row) => (
                <div key={row.id} className="border border-border/50 bg-background/35 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div><p className="text-sm font-medium">{row.title}</p><p className="text-xs text-muted-foreground mt-1">Due {row.due_at ? new Date(row.due_at).toLocaleString() : "not set"} · {row.priority}</p></div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void setTaskStatus(row, "completed")} disabled={busy === `task:${row.id}`} className="min-h-10 inline-flex items-center gap-1 border border-emerald-500/40 px-3 text-[9px] uppercase tracking-[0.13em] text-emerald-300"><CheckCircle2 size={12} /> Done</button>
                      <button type="button" onClick={() => void setTaskStatus(row, "cancelled")} disabled={busy === `task:${row.id}`} className="min-h-10 inline-flex items-center gap-1 border border-border/60 px-3 text-[9px] uppercase tracking-[0.13em] text-muted-foreground"><XCircle size={12} /> Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border/60 bg-card/20 p-4 sm:p-5">
            <h3 className="font-display text-lg">Upcoming meetings</h3>
            <div className="mt-3 space-y-2">
              {upcomingMeetings.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming meeting.</p> : upcomingMeetings.map((row) => (
                <div key={row.id} className="border border-border/50 bg-background/35 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-gold">{row.meeting_reference} · {row.meeting_type.replace(/_/g, " ")}</p>
                  <p className="text-sm font-medium mt-1">{row.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(row.start_at).toLocaleString()} · {row.timezone}</p>
                  {row.location_url && <a href={row.location_url} target="_blank" rel="noreferrer" className="inline-flex mt-2 text-xs text-sky-300 underline underline-offset-4">Open meeting link</a>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-xs text-muted-foreground"><span>{label}</span>{children}</label>;
}

function Metric({ label, value, compact = false }: { label: string; value: number | string; compact?: boolean }) {
  return <div className="border border-border/55 bg-background/35 p-3 sm:p-4"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className={`${compact ? "text-sm font-medium" : "font-display text-2xl"} mt-1 capitalize`}>{value}</p></div>;
}
