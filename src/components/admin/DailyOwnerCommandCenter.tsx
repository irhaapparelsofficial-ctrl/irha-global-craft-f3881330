import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { AdminView } from "@/components/admin/AdminShell";
import {
  OWNER_PRESETS,
  buildOwnerActions,
  calculateOwnerMetrics,
  calculateTeamWorkload,
  filterOwnerActions,
  ownerReportCsv,
  type BuyerSummaryRow,
  type MeetingSummaryRow,
  type OwnerPresetKey,
  type QuoteSummaryRow,
  type SampleSummaryRow,
  type TaskSummaryRow,
} from "@/lib/ownerCommandCenter";
import { normalizeStage, referenceFor, type SalesSource } from "@/lib/salesPipeline";

const db = supabase as any;

type SavedViewRow = {
  id: string;
  name: string;
  module: string;
  preset_key: OwnerPresetKey;
  filters: Record<string, unknown>;
  is_default: boolean;
  sort_order: number;
  created_at: string;
};

type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "sales" | "operations" | "marketing" | "viewer";
  active: boolean;
  can_send: boolean;
  can_approve_quotes: boolean;
  timezone: string;
  created_at: string;
};

type ReportRow = {
  id: string;
  report_date: string;
  metrics: Record<string, number>;
  generated_at: string;
};

type BuyerSourceRow = {
  id: string;
  stage: string | null;
  priority: string | null;
  follow_up_at: string | null;
  assignee: string | null;
  created_at: string;
  company: string;
};

type TeamDraft = {
  name: string;
  email: string;
  role: TeamMemberRow["role"];
  timezone: string;
  canSend: boolean;
  canApproveQuotes: boolean;
};

function emptyTeamDraft(): TeamDraft {
  return {
    name: "",
    email: "",
    role: "sales",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
    canSend: false,
    canApproveQuotes: false,
  };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeBuyerRows(
  rows: Array<BuyerSourceRow & { source: SalesSource; display: string }>,
): BuyerSummaryRow[] {
  return rows.map((row) => ({
    key: `${row.source}:${row.id}`,
    reference: referenceFor(row.source, row.id),
    stage: normalizeStage(row.stage),
    priority: row.priority,
    followUpAt: row.follow_up_at,
    assignee: row.assignee,
    createdAt: row.created_at,
    company: row.company || row.display,
  }));
}

export default function DailyOwnerCommandCenter({ go }: { go: (view: AdminView) => void }) {
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<BuyerSummaryRow[]>([]);
  const [tasks, setTasks] = useState<TaskSummaryRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingSummaryRow[]>([]);
  const [samples, setSamples] = useState<SampleSummaryRow[]>([]);
  const [quotations, setQuotations] = useState<QuoteSummaryRow[]>([]);
  const [savedViews, setSavedViews] = useState<SavedViewRow[]>([]);
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [preset, setPreset] = useState<OwnerPresetKey>("all_actions");
  const [newViewName, setNewViewName] = useState("");
  const [teamDraft, setTeamDraft] = useState<TeamDraft | null>(null);
  const [backendNotes, setBackendNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [inquiryResult, catalogueResult, prospectResult, taskResult, meetingResult, sampleResult, quoteResult, savedResult, teamResult, reportResult] = await Promise.all([
      db.from("inquiries").select("id,status,priority,follow_up_at,assignee,created_at,company,name").order("created_at", { ascending: false }).limit(1000),
      db.from("catalogue_leads").select("id,status,priority,follow_up_at,assignee,created_at,company_name,name").order("created_at", { ascending: false }).limit(1000),
      db.from("b2b_leads").select("id,crm_status,lead_status,priority,follow_up_at,assignee,created_at,company_name").order("created_at", { ascending: false }).limit(2000),
      db.from("crm_tasks").select("id,title,priority,status,due_at,assigned_to,source_type,source_id").order("due_at", { ascending: true }).limit(2000),
      db.from("crm_meetings").select("id,meeting_reference,title,status,start_at,source_type,source_id").order("start_at", { ascending: true }).limit(1000),
      db.from("crm_samples").select("id,sample_reference,product,status,updated_at,source_type,source_id").order("updated_at", { ascending: false }).limit(1000),
      db.from("crm_quotations").select("id,quotation_number,company,buyer_name,status,valid_until,total_amount,currency,source_type,source_id").order("updated_at", { ascending: false }).limit(1000),
      db.from("crm_saved_views").select("*").order("is_default", { ascending: false }).order("sort_order", { ascending: true }).limit(200),
      db.from("crm_team_members").select("*").order("active", { ascending: false }).order("name", { ascending: true }).limit(200),
      db.from("crm_daily_reports").select("id,report_date,metrics,generated_at").order("report_date", { ascending: false }).limit(31),
    ]);

    const inquiryRows = (inquiryResult.data ?? []).map((row: any) => ({
      id: row.id,
      source: "inquiry" as const,
      stage: row.status,
      priority: row.priority,
      follow_up_at: row.follow_up_at,
      assignee: row.assignee,
      created_at: row.created_at,
      company: row.company || "",
      display: row.name || "Buyer",
    }));
    const catalogueRows = (catalogueResult.data ?? []).map((row: any) => ({
      id: row.id,
      source: "catalogue" as const,
      stage: row.status,
      priority: row.priority,
      follow_up_at: row.follow_up_at,
      assignee: row.assignee,
      created_at: row.created_at,
      company: row.company_name || "",
      display: row.name || "Catalogue buyer",
    }));
    const prospectRows = (prospectResult.data ?? []).map((row: any) => ({
      id: row.id,
      source: "prospect" as const,
      stage: row.crm_status || row.lead_status,
      priority: row.priority,
      follow_up_at: row.follow_up_at,
      assignee: row.assignee,
      created_at: row.created_at,
      company: row.company_name || "",
      display: row.company_name || "Prospect",
    }));
    const nextBuyers = normalizeBuyerRows([...inquiryRows, ...catalogueRows, ...prospectRows]);
    const buyerBySource = new Map(nextBuyers.map((row) => [row.key, row]));

    const nextTasks: TaskSummaryRow[] = (taskResult.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      priority: row.priority,
      status: row.status,
      dueAt: row.due_at,
      assignee: row.assigned_to,
      reference: referenceFor(row.source_type as SalesSource, row.source_id),
    }));
    const nextMeetings: MeetingSummaryRow[] = (meetingResult.data ?? []).map((row: any) => ({
      id: row.id,
      reference: row.meeting_reference,
      title: row.title,
      status: row.status,
      startAt: row.start_at,
      assignee: buyerBySource.get(`${row.source_type}:${row.source_id}`)?.assignee || null,
    }));
    const nextSamples: SampleSummaryRow[] = (sampleResult.data ?? []).map((row: any) => ({
      id: row.id,
      reference: row.sample_reference,
      product: row.product,
      status: row.status,
      updatedAt: row.updated_at,
      assignee: buyerBySource.get(`${row.source_type}:${row.source_id}`)?.assignee || null,
    }));
    const nextQuotes: QuoteSummaryRow[] = (quoteResult.data ?? []).map((row: any) => ({
      id: row.id,
      reference: row.quotation_number,
      company: row.company || row.buyer_name || "Buyer",
      status: row.status,
      validUntil: row.valid_until,
      total: Number(row.total_amount) || 0,
      currency: row.currency,
      assignee: buyerBySource.get(`${row.source_type}:${row.source_id}`)?.assignee || null,
    }));

    const notes: string[] = [];
    for (const [label, result] of [["Inquiries", inquiryResult], ["Catalogue leads", catalogueResult], ["Prospects", prospectResult]] as const) {
      if (result.error) notes.push(`${label}: ${result.error.message}`);
    }
    if (taskResult.error || meetingResult.error || sampleResult.error || quoteResult.error) {
      notes.push("Phase 3 CRM and Commercial Hub migrations remain deferred until final activation.");
    }
    if (savedResult.error || teamResult.error || reportResult.error) {
      notes.push("Saved views, team directory and historical owner reports activate in the final migration.");
    }

    setBuyers(nextBuyers);
    setTasks(nextTasks);
    setMeetings(nextMeetings);
    setSamples(nextSamples);
    setQuotations(nextQuotes);
    setSavedViews((savedResult.data ?? []) as SavedViewRow[]);
    setTeam((teamResult.data ?? []) as TeamMemberRow[]);
    setReports((reportResult.data ?? []) as ReportRow[]);
    setBackendNotes(Array.from(new Set(notes)));
    const defaultView = ((savedResult.data ?? []) as SavedViewRow[]).find((row) => row.is_default);
    if (defaultView) setPreset(defaultView.preset_key);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => calculateOwnerMetrics({ buyers, tasks, meetings, samples, quotations }),
    [buyers, meetings, quotations, samples, tasks],
  );
  const actions = useMemo(
    () => buildOwnerActions({ buyers, tasks, meetings, samples, quotations }),
    [buyers, meetings, quotations, samples, tasks],
  );
  const filteredActions = useMemo(
    () => filterOwnerActions(actions, preset),
    [actions, preset],
  );
  const workloads = useMemo(
    () => calculateTeamWorkload({ buyers, tasks, samples, quotations }),
    [buyers, quotations, samples, tasks],
  );

  const saveView = async () => {
    const definition = OWNER_PRESETS.find((row) => row.key === preset);
    if (!definition || newViewName.trim().length < 2) return;
    setBusy("view");
    const { data, error } = await db.from("crm_saved_views").insert({
      name: newViewName.trim(),
      module: definition.module,
      preset_key: definition.key,
      filters: { preset: definition.key },
      is_default: savedViews.length === 0,
      owner_user_id: user?.id || null,
    }).select("*").single();
    setBusy(null);
    if (error) {
      toast({
        title: "Saved-view backend is not active yet",
        description: "The migration is prepared for final activation.",
        variant: "destructive",
      });
      return;
    }
    setSavedViews((current) => [data as SavedViewRow, ...current]);
    setNewViewName("");
    toast({ title: "Owner view saved" });
  };

  const deleteView = async (view: SavedViewRow) => {
    const { error } = await db.from("crm_saved_views").delete().eq("id", view.id);
    if (error) {
      toast({ title: "Saved view removal failed", description: error.message, variant: "destructive" });
      return;
    }
    setSavedViews((current) => current.filter((row) => row.id !== view.id));
  };

  const addTeamMember = async () => {
    if (!teamDraft || teamDraft.name.trim().length < 2 || !teamDraft.email.includes("@")) return;
    setBusy("team");
    const { data, error } = await db.from("crm_team_members").insert({
      name: teamDraft.name.trim(),
      email: teamDraft.email.trim().toLowerCase(),
      role: teamDraft.role,
      active: true,
      can_send: teamDraft.canSend,
      can_approve_quotes: teamDraft.canApproveQuotes,
      timezone: teamDraft.timezone,
    }).select("*").single();
    setBusy(null);
    if (error) {
      toast({
        title: "Team directory is not active yet",
        description: "The migration is prepared for final activation.",
        variant: "destructive",
      });
      return;
    }
    setTeam((current) => [...current, data as TeamMemberRow].sort((a, b) => a.name.localeCompare(b.name)));
    setTeamDraft(null);
    toast({ title: "Team member added" });
  };

  const toggleTeamActive = async (member: TeamMemberRow) => {
    const { data, error } = await db.from("crm_team_members").update({ active: !member.active }).eq("id", member.id).select("*").single();
    if (error) {
      toast({ title: "Team update failed", description: error.message, variant: "destructive" });
      return;
    }
    setTeam((current) => current.map((row) => row.id === member.id ? data as TeamMemberRow : row));
  };

  const exportReport = async () => {
    const generatedAt = new Date();
    const csv = ownerReportCsv(metrics, workloads, generatedAt);
    downloadCsv(`irha-owner-report-${generatedAt.toISOString().slice(0, 10)}.csv`, csv);

    const { data, error } = await db.from("crm_daily_reports").upsert({
      report_date: generatedAt.toISOString().slice(0, 10),
      metrics,
      workload: workloads,
      generated_by: user?.email || null,
      generated_at: generatedAt.toISOString(),
    }, { onConflict: "report_date" }).select("id,report_date,metrics,generated_at").single();

    if (error) {
      toast({
        title: "Daily report downloaded",
        description: "Historical report storage activates in the final migration.",
      });
      return;
    }
    setReports((current) => [data as ReportRow, ...current.filter((row) => row.report_date !== data.report_date)]);
    toast({ title: "Daily report downloaded and archived" });
  };

  const openPresetModule = () => {
    const definition = OWNER_PRESETS.find((row) => row.key === preset);
    if (definition) go(definition.module);
  };

  return (
    <section className="space-y-5">
      <div className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3">
            <BriefcaseBusiness size={22} className="text-gold shrink-0 mt-1" />
            <div>
              <p className="eyebrow mb-2">Daily Owner Workspace</p>
              <h2 className="font-display text-2xl md:text-4xl">Today Command Center</h2>
              <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">
                One truthful daily queue across buyers, tasks, meetings, samples and quotations. It prioritizes owner attention but never contacts a buyer or approves commercial terms automatically.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold disabled:opacity-50">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => void exportReport()} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em]">
              <Download size={13} /> Daily report
            </button>
          </div>
        </div>
      </div>

      {backendNotes.length > 0 && (
        <div className="border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-200">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Activation status</p>
            <p className="mt-1 text-xs text-foreground/60">{backendNotes.join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Metric label="Active pipeline" value={metrics.activePipeline} />
        <Metric label="New today" value={metrics.newToday} />
        <Metric label="Overdue follow-ups" value={metrics.overdueFollowUps} warn={metrics.overdueFollowUps > 0} />
        <Metric label="Overdue tasks" value={metrics.overdueTasks} warn={metrics.overdueTasks > 0} />
        <Metric label="Meetings today" value={metrics.meetingsToday} />
        <Metric label="Quote reviews" value={metrics.quoteReviews} warn={metrics.quoteReviews > 0} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] gap-5">
        <section className="border border-border/60 bg-card/20 p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">Action Queue</p>
              <h3 className="font-display text-2xl">Owner attention</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {OWNER_PRESETS.map((item) => (
                <button key={item.key} type="button" onClick={() => setPreset(item.key)} className={`min-h-10 shrink-0 border px-3 text-[9px] uppercase tracking-[0.14em] ${preset === item.key ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 divide-y divide-border/50 border border-border/50">
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading owner actions…</p>
            ) : filteredActions.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
                <p className="font-display text-xl mt-3">No action in this view</p>
              </div>
            ) : (
              filteredActions.slice(0, 40).map((action) => (
                <button key={action.key} type="button" onClick={() => go(action.module)} className="w-full p-4 text-left grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3 hover:bg-muted/20">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-gold">{action.kind} · {action.priority}</p>
                    <p className="font-medium mt-1">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.detail}</p>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <p>{action.assignee || "Unassigned"}</p>
                    <p className="mt-1">{action.dueAt ? new Date(action.dueAt).toLocaleString() : "No due date"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <button type="button" onClick={openPresetModule} className="mt-3 min-h-11 inline-flex items-center gap-2 border border-gold/50 text-gold px-4 text-[10px] uppercase tracking-[0.16em] hover:bg-gold hover:text-background">
            <ListChecks size={13} /> Open related module
          </button>
        </section>

        <section className="border border-border/60 bg-card/20 p-5">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gold" />
            <h3 className="font-display text-2xl">Saved owner views</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Save the current owner-queue preset for repeat daily use.</p>
          <div className="mt-4 flex gap-2">
            <input value={newViewName} onChange={(event) => setNewViewName(event.target.value)} placeholder="View name" className="flex-1 min-h-11 bg-background border border-border/60 px-3 text-sm" />
            <button type="button" onClick={() => void saveView()} disabled={busy === "view" || newViewName.trim().length < 2} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-3 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">
              <Save size={13} /> Save
            </button>
          </div>
          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {savedViews.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/60">No saved views yet.</p>
            ) : (
              savedViews.map((view) => (
                <div key={view.id} className="border border-border/60 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setPreset(view.preset_key)} className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{view.name}</p>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mt-1">{view.preset_key.replaceAll("_", " ")}{view.is_default ? " · default" : ""}</p>
                  </button>
                  <button type="button" onClick={() => void deleteView(view)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-destructive" aria-label={`Delete ${view.name}`}>
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 border-t border-border/50 pt-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Archived reports</p>
            <p className="font-display text-2xl mt-1">{reports.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 31 daily snapshots after backend activation.</p>
          </div>
        </section>
      </div>

      <section className="border border-border/60 bg-card/20 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Team Usability</p>
            <h3 className="font-display text-2xl">Workload & permissions directory</h3>
          </div>
          <button type="button" onClick={() => setTeamDraft(emptyTeamDraft())} className="min-h-11 inline-flex items-center gap-2 border border-gold/50 text-gold px-4 text-[10px] uppercase tracking-[0.16em]">
            <Plus size={13} /> Add team member
          </button>
        </div>

        <div className="mt-5 overflow-x-auto border border-border/60">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="text-left p-3">Assignee</th>
                <th className="text-right p-3">Buyers</th>
                <th className="text-right p-3">Tasks</th>
                <th className="text-right p-3">Overdue</th>
                <th className="text-right p-3">Quotes</th>
                <th className="text-right p-3">Samples</th>
                <th className="text-right p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {workloads.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No assigned workload yet.</td></tr>
              ) : (
                workloads.map((row) => (
                  <tr key={row.assignee} className="border-t border-border/50">
                    <td className="p-3">{row.assignee}</td>
                    <td className="text-right p-3 tabular-nums">{row.buyers}</td>
                    <td className="text-right p-3 tabular-nums">{row.tasks}</td>
                    <td className={`text-right p-3 tabular-nums ${row.overdue ? "text-amber-300" : ""}`}>{row.overdue}</td>
                    <td className="text-right p-3 tabular-nums">{row.quotes}</td>
                    <td className="text-right p-3 tabular-nums">{row.samples}</td>
                    <td className="text-right p-3 tabular-nums font-medium">{row.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {team.length === 0 ? (
            <div className="border border-dashed border-border/60 p-6 text-center md:col-span-2 xl:col-span-3">
              <Users size={24} className="mx-auto text-gold" />
              <p className="text-sm mt-3">Team directory activates during final migration.</p>
            </div>
          ) : (
            team.map((member) => (
              <article key={member.id} className="border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{member.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{member.email} · {member.role}</p>
                  </div>
                  <button type="button" onClick={() => void toggleTeamActive(member)} className={`min-h-8 border px-2 text-[9px] uppercase tracking-[0.12em] ${member.active ? "border-emerald-500/50 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>
                    {member.active ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.12em]">
                  <span className="border border-border/60 px-2 py-1">Send: {member.can_send ? "allowed" : "blocked"}</span>
                  <span className="border border-border/60 px-2 py-1">Quote approval: {member.can_approve_quotes ? "allowed" : "blocked"}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {teamDraft && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button type="button" onClick={() => setTeamDraft(null)} className="absolute inset-0 bg-background/85 backdrop-blur-sm" aria-label="Close team form" />
          <div className="relative w-full max-w-lg bg-card border border-border/60 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow mb-2">Team directory</p><h3 className="font-display text-2xl">Add team member</h3></div>
              <button type="button" onClick={() => setTeamDraft(null)} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60"><X size={16} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <Input label="Name" value={teamDraft.name} onChange={(value) => setTeamDraft({ ...teamDraft, name: value })} />
              <Input label="Email" type="email" value={teamDraft.email} onChange={(value) => setTeamDraft({ ...teamDraft, email: value })} />
              <label className="space-y-2 block"><span className="text-xs text-muted-foreground">Role</span><select value={teamDraft.role} onChange={(event) => setTeamDraft({ ...teamDraft, role: event.target.value as TeamDraft["role"] })} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"><option value="owner">Owner</option><option value="sales">Sales</option><option value="operations">Operations</option><option value="marketing">Marketing</option><option value="viewer">Viewer</option></select></label>
              <Input label="Timezone" value={teamDraft.timezone} onChange={(value) => setTeamDraft({ ...teamDraft, timezone: value })} />
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={teamDraft.canSend} onChange={(event) => setTeamDraft({ ...teamDraft, canSend: event.target.checked })} /> Allow approved outbound sends</label>
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={teamDraft.canApproveQuotes} onChange={(event) => setTeamDraft({ ...teamDraft, canApproveQuotes: event.target.checked })} /> Allow quotation approval</label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setTeamDraft(null)} className="min-h-11 border border-border/60 px-4 text-xs">Cancel</button>
              <button type="button" onClick={() => void addTeamMember()} disabled={busy === "team" || teamDraft.name.trim().length < 2 || !teamDraft.email.includes("@")} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50"><Plus size={13} /> {busy === "team" ? "Saving…" : "Add member"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return <div className="border border-border/60 bg-card/25 p-4"><p className={`font-display text-3xl tabular-nums ${warn ? "text-amber-300" : ""}`}>{value.toLocaleString()}</p><p className="text-[9px] uppercase tracking-[0.17em] text-muted-foreground mt-1">{label}</p></div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-2 block"><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm" /></label>;
}
