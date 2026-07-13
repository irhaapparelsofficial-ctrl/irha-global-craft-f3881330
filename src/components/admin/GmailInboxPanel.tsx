import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Copy,
  ExternalLink,
  Inbox,
  Mail,
  Paperclip,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const db = supabase as any;

type InboxItem = {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  subject: string;
  snippet: string | null;
  received_at: string;
  is_unread: boolean;
  has_attachment: boolean;
  category: "buyer" | "supplier" | "production" | "meeting" | "website" | "security" | "system" | "other";
  importance: "low" | "normal" | "high" | "urgent";
  summary_roman_urdu: string | null;
  recommended_action: string | null;
  reply_draft: string | null;
  gmail_url: string | null;
  linked_lead_id: string | null;
  status: "new" | "reviewed" | "replied" | "archived" | "ignored";
  created_at: string;
  updated_at: string;
};

type SyncState = {
  last_synced_at: string | null;
  last_message_at: string | null;
  last_status: "never" | "running" | "success" | "failed";
  last_error: string | null;
  messages_seen: number;
  meaningful_messages_saved: number;
};

type StatusFilter = "all" | InboxItem["status"];

const importanceClasses: Record<InboxItem["importance"], string> = {
  low: "border-border/60 text-muted-foreground",
  normal: "border-sky-500/35 text-sky-300",
  high: "border-amber-500/45 text-amber-300",
  urgent: "border-red-500/50 text-red-300",
};

const categoryLabels: Record<InboxItem["category"], string> = {
  buyer: "Buyer",
  supplier: "Supplier",
  production: "Production",
  meeting: "Meeting",
  website: "Website",
  security: "Security",
  system: "System",
  other: "Other",
};

function senderLabel(item: InboxItem) {
  return item.sender_name?.trim() || item.sender_email?.trim() || "Unknown sender";
}

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function GmailInboxPanel() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [inboxResult, syncResult] = await Promise.all([
      db
        .from("gmail_inbox_items")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200),
      db
        .from("gmail_sync_state")
        .select("last_synced_at,last_message_at,last_status,last_error,messages_seen,meaningful_messages_saved")
        .eq("id", "default")
        .maybeSingle(),
    ]);

    setItems((inboxResult.data || []) as InboxItem[]);
    setSync((syncResult.data || null) as SyncState | null);
    setError(inboxResult.error?.message || syncResult.error?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!needle) return true;
      return [
        item.sender_name,
        item.sender_email,
        item.subject,
        item.snippet,
        item.summary_roman_urdu,
        item.recommended_action,
        item.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, status]);

  const counts = useMemo(() => ({
    total: items.length,
    new: items.filter((item) => item.status === "new").length,
    important: items.filter((item) => item.status !== "archived" && ["urgent", "high"].includes(item.importance)).length,
    replies: items.filter((item) => Boolean(item.reply_draft?.trim()) && item.status !== "archived").length,
  }), [items]);

  const updateStatus = async (item: InboxItem, nextStatus: InboxItem["status"]) => {
    setSavingId(item.id);
    const payload = {
      status: nextStatus,
      is_unread: nextStatus === "new" ? item.is_unread : false,
    };
    const { data, error: updateError } = await db
      .from("gmail_inbox_items")
      .update(payload)
      .eq("id", item.id)
      .select("*")
      .single();
    setSavingId(null);

    if (updateError) {
      toast({ title: "Email status could not update", description: updateError.message, variant: "destructive" });
      return;
    }

    setItems((current) => current.map((row) => row.id === item.id ? data as InboxItem : row));
    toast({ title: nextStatus === "archived" ? "Email archived" : "Email reviewed" });
  };

  const copyReply = async (item: InboxItem) => {
    if (!item.reply_draft?.trim()) return;
    try {
      await navigator.clipboard.writeText(item.reply_draft);
      toast({ title: "Reply draft copied", description: "Review it before sending from Gmail." });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the draft manually.", variant: "destructive" });
    }
  };

  return (
    <section className="space-y-5 border border-gold/30 bg-card/25 p-4 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Mail size={22} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Connected Gmail · Private Admin</p>
            <h2 className="font-display text-2xl sm:text-3xl mt-1">Business Email Inbox</h2>
            <p className="text-sm text-foreground/65 mt-2 max-w-3xl leading-relaxed">
              Meaningful buyer, supplier, production, meeting, website and security emails appear here with a Roman Urdu summary and a reviewable reply draft. Nothing is sent automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh inbox
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.15em]">
        <span className={cn(
          "inline-flex min-h-9 items-center gap-2 border px-3",
          sync?.last_status === "failed" ? "border-red-500/45 text-red-300" : "border-emerald-500/35 text-emerald-300",
        )}>
          <ShieldCheck size={13} /> Sync {sync?.last_status || "not started"}
        </span>
        <span className="inline-flex min-h-9 items-center border border-border/50 px-3 text-muted-foreground normal-case tracking-normal">
          Last checked: {formatDate(sync?.last_synced_at || null)}
        </span>
        {sync?.last_error && <span className="text-red-300 normal-case tracking-normal">{sync.last_error}</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric label="New" value={counts.new} />
        <Metric label="Important" value={counts.important} />
        <Metric label="Reply drafts" value={counts.replies} />
        <Metric label="Synced emails" value={counts.total} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-2xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sender, subject, summary or action…"
            className="min-h-12 w-full border border-border/60 bg-background pl-10 pr-3 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {(["all", "new", "reviewed", "replied", "archived"] as StatusFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={cn(
                "min-h-11 shrink-0 border px-3 text-[10px] uppercase tracking-[0.16em]",
                status === item ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-muted-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-500/[0.06] p-4 text-sm text-red-200">
          Gmail inbox could not load: {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading business emails…</div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-border/60 p-10 text-center">
          <Inbox size={28} className="mx-auto text-gold/70" />
          <h3 className="font-display text-2xl mt-4">No matching business email</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Gmail monitoring saves only meaningful business and security messages, not newsletters or routine noise.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const expanded = selectedId === item.id;
            return (
              <article
                key={item.id}
                className={cn(
                  "border bg-background/35 transition-colors",
                  item.status === "new" ? "border-gold/45" : "border-border/55",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(expanded ? null : item.id)}
                  className="w-full min-h-24 p-4 sm:p-5 text-left"
                  aria-expanded={expanded}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.is_unread && <span className="h-2 w-2 rounded-full bg-gold" aria-label="Unread" />}
                        <p className="text-sm font-semibold truncate">{senderLabel(item)}</p>
                        {item.sender_email && item.sender_name && (
                          <span className="text-xs text-muted-foreground truncate">{item.sender_email}</span>
                        )}
                      </div>
                      <h3 className="font-display text-lg sm:text-xl mt-2 leading-snug">{item.subject}</h3>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {item.summary_roman_urdu || item.snippet || "No summary available."}
                      </p>
                    </div>
                    <div className="flex flex-wrap sm:justify-end gap-2 shrink-0">
                      <span className="inline-flex min-h-8 items-center border border-border/60 px-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        {categoryLabels[item.category]}
                      </span>
                      <span className={cn("inline-flex min-h-8 items-center border px-2 text-[9px] uppercase tracking-[0.14em]", importanceClasses[item.importance])}>
                        {item.importance}
                      </span>
                      {item.has_attachment && <span className="inline-flex min-h-8 min-w-8 items-center justify-center border border-border/60 text-muted-foreground" title="Has attachment"><Paperclip size={13} /></span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">{formatDate(item.received_at)}</p>
                </button>

                {expanded && (
                  <div className="border-t border-border/50 p-4 sm:p-5 space-y-4">
                    {item.recommended_action && (
                      <div className="border border-amber-500/30 bg-amber-500/[0.05] p-4">
                        <p className="text-[9px] uppercase tracking-[0.17em] text-amber-300">Recommended next action</p>
                        <p className="text-sm mt-2 leading-relaxed">{item.recommended_action}</p>
                      </div>
                    )}

                    {item.reply_draft && (
                      <div className="border border-border/55 bg-card/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] uppercase tracking-[0.17em] text-gold">Reply draft · Review before send</p>
                          <button type="button" onClick={() => void copyReply(item)} className="min-h-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold">
                            <Copy size={13} /> Copy
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed mt-3 text-foreground/80">{item.reply_draft}</p>
                      </div>
                    )}

                    {!item.reply_draft && item.snippet && (
                      <p className="text-sm leading-relaxed text-foreground/75">{item.snippet}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {item.status === "new" && (
                        <button
                          type="button"
                          onClick={() => void updateStatus(item, "reviewed")}
                          disabled={savingId === item.id}
                          className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold px-4 text-[10px] uppercase tracking-[0.16em] text-background disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> Mark reviewed
                        </button>
                      )}
                      {item.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => void updateStatus(item, "archived")}
                          disabled={savingId === item.id}
                          className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground disabled:opacity-50"
                        >
                          <Archive size={14} /> Archive
                        </button>
                      )}
                      {item.reply_draft && (
                        <button type="button" onClick={() => void copyReply(item)} className="min-h-11 inline-flex items-center gap-2 border border-gold/45 px-4 text-[10px] uppercase tracking-[0.16em] text-gold">
                          <Copy size={14} /> Copy reply
                        </button>
                      )}
                      {item.gmail_url && (
                        <a
                          href={item.gmail_url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-11 inline-flex items-center gap-2 border border-sky-500/40 px-4 text-[10px] uppercase tracking-[0.16em] text-sky-300"
                        >
                          <ExternalLink size={14} /> Open in Gmail
                        </a>
                      )}
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
      <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl sm:text-3xl mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
