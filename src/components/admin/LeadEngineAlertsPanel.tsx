import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CopyCheck,
  Link2,
  RefreshCw,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type NotificationRow = {
  id: string;
  notification_type: string;
  source_type: string | null;
  source_id: string | null;
  title: string;
  body: string;
  severity: "info" | "attention" | "urgent";
  status: "unread" | "read" | "archived";
  created_at: string;
};

type DuplicateCandidate = {
  left_source_type: "inquiry" | "catalogue" | "prospect";
  left_source_id: string;
  left_display: string;
  right_source_type: "inquiry" | "catalogue" | "prospect";
  right_source_id: string;
  right_display: string;
  match_reason: string;
  confidence: number;
};

const db = supabase as any;

function sourceLabel(value: string | null) {
  if (value === "inquiry") return "Inquiry";
  if (value === "catalogue") return "Catalogue";
  if (value === "prospect") return "Prospect";
  if (value === "task") return "Task";
  return "System";
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(value).toLocaleDateString();
}

export default function LeadEngineAlertsPanel() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const refreshResult = await db.rpc("crm_refresh_action_notifications");
    const [notificationResult, duplicateResult] = await Promise.all([
      db
        .from("crm_notifications")
        .select("id,notification_type,source_type,source_id,title,body,severity,status,created_at")
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(30),
      db.rpc("crm_find_duplicate_candidates", { _limit: 50 }),
    ]);

    const firstError = refreshResult.error || notificationResult.error || duplicateResult.error;
    if (firstError) {
      setError(firstError.message || "Lead alerts could not be loaded");
    } else {
      setError(null);
    }
    setNotifications((notificationResult.data ?? []) as NotificationRow[]);
    setDuplicates((duplicateResult.data ?? []) as DuplicateCandidate[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateNotification = async (id: string, status: "read" | "archived") => {
    setBusy(`notification:${id}`);
    const { error: updateError } = await db.from("crm_notifications").update({ status }).eq("id", id);
    setBusy(null);
    if (updateError) {
      toast({ title: "Notification update failed", description: updateError.message, variant: "destructive" });
      return;
    }
    setNotifications((current) => status === "archived"
      ? current.filter((item) => item.id !== id)
      : current.map((item) => item.id === id ? { ...item, status } : item));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((item) => item.status === "unread").map((item) => item.id);
    if (unreadIds.length === 0) return;
    setBusy("all-read");
    const { error: updateError } = await db.from("crm_notifications").update({ status: "read" }).in("id", unreadIds);
    setBusy(null);
    if (updateError) {
      toast({ title: "Notifications could not be marked read", description: updateError.message, variant: "destructive" });
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, status: "read" })));
  };

  const decideDuplicate = async (candidate: DuplicateCandidate, status: "confirmed" | "rejected") => {
    const key = `${candidate.left_source_type}:${candidate.left_source_id}:${candidate.right_source_type}:${candidate.right_source_id}`;
    setBusy(`duplicate:${key}`);
    const { error: insertError } = await db.from("crm_record_links").insert({
      left_source_type: candidate.left_source_type,
      left_source_id: candidate.left_source_id,
      right_source_type: candidate.right_source_type,
      right_source_id: candidate.right_source_id,
      link_type: "duplicate",
      status,
      reason: `${candidate.match_reason} · confidence ${candidate.confidence}%`,
    });
    setBusy(null);
    if (insertError) {
      toast({ title: "Duplicate review could not be saved", description: insertError.message, variant: "destructive" });
      return;
    }
    setDuplicates((current) => current.filter((item) => !(
      item.left_source_type === candidate.left_source_type
      && item.left_source_id === candidate.left_source_id
      && item.right_source_type === candidate.right_source_type
      && item.right_source_id === candidate.right_source_id
    )));
    toast({
      title: status === "confirmed" ? "Duplicate relationship confirmed" : "Candidate dismissed",
      description: "No buyer record was merged or deleted.",
    });
  };

  const unread = notifications.filter((item) => item.status === "unread").length;

  return (
    <section className="border border-border/60 bg-card/20">
      <div className="p-4 md:p-5 border-b border-border/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Bell size={18} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-1">Lead Engine</p>
            <h2 className="font-display text-2xl">Alerts & duplicate review</h2>
            <p className="text-xs text-foreground/55 mt-2 max-w-3xl">
              New public leads, overdue actions and evidence-based duplicate candidates. Duplicate records are never merged or deleted automatically.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unread === 0 || busy === "all-read"}
            className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] hover:border-gold disabled:opacity-40"
          >
            <CopyCheck size={12} /> Mark all read ({unread})
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] hover:border-gold disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 border border-amber-500/35 bg-amber-500/5 p-3 flex items-start gap-2 text-xs text-amber-100">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid xl:grid-cols-2">
        <div className="p-4 md:p-5 xl:border-r border-border/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-xl">Action alerts</h3>
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{notifications.length} visible</span>
          </div>
          <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="py-10 text-center text-xs text-muted-foreground">Loading alerts…</p>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-border/60">
                <Check size={22} className="mx-auto text-emerald-300" />
                <p className="font-display text-lg mt-2">No active alerts</p>
              </div>
            ) : notifications.map((item) => (
              <article key={item.id} className={`border p-3 ${item.status === "unread" ? "border-gold/45 bg-gold/[0.035]" : "border-border/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-gold">
                      {sourceLabel(item.source_type)} · {item.severity} · {relativeTime(item.created_at)}
                    </p>
                    <p className="font-medium mt-1">{item.title}</p>
                    <p className="text-xs text-foreground/55 mt-1 break-words">{item.body}</p>
                  </div>
                  <div className="flex shrink-0">
                    {item.status === "unread" && (
                      <button
                        type="button"
                        onClick={() => void updateNotification(item.id, "read")}
                        disabled={busy === `notification:${item.id}`}
                        className="min-h-9 min-w-9 inline-flex items-center justify-center text-emerald-300 hover:bg-emerald-500/10"
                        aria-label={`Mark ${item.title} read`}
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void updateNotification(item.id, "archived")}
                      disabled={busy === `notification:${item.id}`}
                      className="min-h-9 min-w-9 inline-flex items-center justify-center text-muted-foreground hover:text-destructive"
                      aria-label={`Archive ${item.title}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-5 border-t xl:border-t-0 border-border/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-xl">Possible duplicates</h3>
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{duplicates.length} candidates</span>
          </div>
          <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="py-10 text-center text-xs text-muted-foreground">Checking buyer identities…</p>
            ) : duplicates.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-border/60">
                <Link2 size={22} className="mx-auto text-emerald-300" />
                <p className="font-display text-lg mt-2">No unresolved duplicates</p>
              </div>
            ) : duplicates.map((candidate) => {
              const key = `${candidate.left_source_type}:${candidate.left_source_id}:${candidate.right_source_type}:${candidate.right_source_id}`;
              return (
                <article key={key} className="border border-border/60 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-gold">
                    {candidate.match_reason} · {candidate.confidence}% confidence
                  </p>
                  <div className="mt-2 grid sm:grid-cols-[1fr_auto_1fr] gap-2 sm:items-center text-sm">
                    <div className="border border-border/50 p-2 min-w-0">
                      <p className="text-[8px] uppercase tracking-[0.13em] text-muted-foreground">{sourceLabel(candidate.left_source_type)}</p>
                      <p className="mt-1 truncate">{candidate.left_display}</p>
                    </div>
                    <span className="text-center text-muted-foreground">↔</span>
                    <div className="border border-border/50 p-2 min-w-0">
                      <p className="text-[8px] uppercase tracking-[0.13em] text-muted-foreground">{sourceLabel(candidate.right_source_type)}</p>
                      <p className="mt-1 truncate">{candidate.right_display}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void decideDuplicate(candidate, "confirmed")}
                      disabled={busy === `duplicate:${key}`}
                      className="min-h-9 inline-flex items-center gap-2 border border-gold/55 text-gold px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"
                    >
                      <Link2 size={11} /> Confirm link
                    </button>
                    <button
                      type="button"
                      onClick={() => void decideDuplicate(candidate, "rejected")}
                      disabled={busy === `duplicate:${key}`}
                      className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"
                    >
                      <X size={11} /> Not duplicate
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
