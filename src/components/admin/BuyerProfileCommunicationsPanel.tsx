import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  FileClock,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRoundPen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { SalesCard } from "@/lib/salesPipeline";

const db = supabase as any;
const FIELD = "min-h-12 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-gold";

type Profile = {
  source_type: SalesCard["source"];
  source_id: string;
  display_name: string;
  company_name: string;
  country: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  buyer_type: string;
  product_interest: string;
  quantity: string;
  address: string;
  preferred_language: string;
  timezone: string;
  linkedin_url: string;
  instagram_url: string;
  facebook_url: string;
  profile_updated_at: string | null;
};

type HistoryItem = {
  id: string;
  channel: string;
  direction: "inbound" | "outbound" | "internal";
  status: string;
  subject: string | null;
  body: string;
  occurred_at: string;
  external_url: string | null;
  metadata: Record<string, unknown>;
};

type LogDraft = {
  channel: "email" | "whatsapp" | "phone" | "video_call" | "in_person" | "website" | "website_chat" | "other";
  direction: "inbound" | "outbound" | "internal";
  status: "logged" | "draft" | "sent" | "received" | "failed" | "cancelled";
  subject: string;
  summary: string;
  occurredLocal: string;
  externalUrl: string;
};

function localNow() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function blankProfile(card: SalesCard): Profile {
  return {
    source_type: card.source,
    source_id: card.sourceId,
    display_name: card.name || "",
    company_name: card.company || "",
    country: card.country || "",
    email: card.email || "",
    phone: card.phone || "",
    whatsapp: "",
    website: card.website || "",
    buyer_type: "",
    product_interest: card.productInterest || "",
    quantity: card.quantity || "",
    address: "",
    preferred_language: "",
    timezone: "",
    linkedin_url: "",
    instagram_url: "",
    facebook_url: "",
    profile_updated_at: null,
  };
}

function normalizeProfile(card: SalesCard, data: Record<string, unknown> | null): Profile {
  const fallback = blankProfile(card);
  if (!data) return fallback;
  const text = (key: keyof Profile) => typeof data[key] === "string" ? data[key] as string : "";
  return {
    ...fallback,
    display_name: text("display_name"),
    company_name: text("company_name"),
    country: text("country"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    website: text("website"),
    buyer_type: text("buyer_type"),
    product_interest: text("product_interest"),
    quantity: text("quantity"),
    address: text("address"),
    preferred_language: text("preferred_language"),
    timezone: text("timezone"),
    linkedin_url: text("linkedin_url"),
    instagram_url: text("instagram_url"),
    facebook_url: text("facebook_url"),
    profile_updated_at: typeof data.profile_updated_at === "string" ? data.profile_updated_at : null,
  };
}

function newLog(): LogDraft {
  return {
    channel: "phone",
    direction: "outbound",
    status: "logged",
    subject: "",
    summary: "",
    occurredLocal: localNow(),
    externalUrl: "",
  };
}

export default function BuyerProfileCommunicationsPanel({ card, onChanged }: { card: SalesCard; onChanged: () => void }) {
  const [tab, setTab] = useState<"profile" | "history">("profile");
  const [profile, setProfile] = useState<Profile>(() => blankProfile(card));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [log, setLog] = useState<LogDraft>(() => newLog());
  const [channelFilter, setChannelFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [profileResult, historyResult] = await Promise.all([
      db.rpc("crm_get_buyer_profile", { _source_type: card.source, _source_id: card.sourceId }),
      db.rpc("crm_get_buyer_communication_history", { _source_type: card.source, _source_id: card.sourceId, _limit: 300 }),
    ]);
    setProfile(normalizeProfile(card, profileResult.data as Record<string, unknown> | null));
    setHistory(Array.isArray(historyResult.data) ? historyResult.data as HistoryItem[] : []);
    setError(profileResult.error?.message || historyResult.error?.message || null);
    setLoading(false);
  }, [card]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    setBusy("profile");
    const { data, error: rpcError } = await db.rpc("crm_save_buyer_profile", {
      _source_type: card.source,
      _source_id: card.sourceId,
      _display_name: profile.display_name.trim() || null,
      _company_name: profile.company_name.trim() || null,
      _country: profile.country.trim() || null,
      _email: profile.email.trim() || null,
      _phone: profile.phone.trim() || null,
      _whatsapp: profile.whatsapp.trim() || null,
      _website: profile.website.trim() || null,
      _buyer_type: profile.buyer_type.trim() || null,
      _product_interest: profile.product_interest.trim() || null,
      _quantity: profile.quantity.trim() || null,
      _address: profile.address.trim() || null,
      _preferred_language: profile.preferred_language.trim() || null,
      _timezone: profile.timezone.trim() || null,
      _linkedin_url: profile.linkedin_url.trim() || null,
      _instagram_url: profile.instagram_url.trim() || null,
      _facebook_url: profile.facebook_url.trim() || null,
    });
    setBusy(null);
    if (rpcError) {
      toast({ title: "Buyer profile was not saved", description: rpcError.message, variant: "destructive" });
      return;
    }
    setProfile(normalizeProfile(card, data as Record<string, unknown>));
    toast({ title: "Buyer profile saved", description: "The original buyer record and canonical CRM profile are synchronized." });
    onChanged();
    await load();
  };

  const logCommunication = async () => {
    if (log.summary.trim().length < 2 || !log.occurredLocal) {
      toast({ title: "Communication summary and time are required", variant: "destructive" });
      return;
    }
    setBusy("communication");
    const { error: rpcError } = await db.rpc("crm_log_communication", {
      _source_type: card.source,
      _source_id: card.sourceId,
      _channel: log.channel,
      _direction: log.direction,
      _summary: log.summary.trim(),
      _subject: log.subject.trim() || null,
      _occurred_at: toIso(log.occurredLocal),
      _status: log.status,
      _external_url: log.externalUrl.trim() || null,
    });
    setBusy(null);
    if (rpcError) {
      toast({ title: "Communication was not logged", description: rpcError.message, variant: "destructive" });
      return;
    }
    setLog(newLog());
    setTab("history");
    toast({ title: "Communication added to buyer history" });
    onChanged();
    await load();
  };

  const channels = useMemo(() => Array.from(new Set(history.map((item) => item.channel))).sort(), [history]);
  const visibleHistory = channelFilter === "all" ? history : history.filter((item) => item.channel === channelFilter);
  const inboundCount = history.filter((item) => item.direction === "inbound").length;
  const outboundCount = history.filter((item) => item.direction === "outbound").length;

  return (
    <section className="mt-5 border border-border/60 bg-card/20">
      <div className="p-4 sm:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Canonical profile · Unified communications</p>
            <h3 className="font-display text-2xl mt-1">Buyer identity and complete history</h3>
            <p className="text-sm text-foreground/65 mt-2 max-w-3xl leading-relaxed">Edit verified buyer details once, then review Gmail, outreach, email delivery, WhatsApp, website submissions and manually logged calls in one private timeline.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <div className="flex gap-2 overflow-x-auto p-3 sm:px-6 border-b border-border/60">
        <button type="button" onClick={() => setTab("profile")} className={`min-h-11 shrink-0 border px-4 text-[10px] uppercase tracking-[0.16em] ${tab === "profile" ? "border-gold bg-gold/5 text-gold" : "border-border/60 text-muted-foreground"}`}><UserRoundPen size={13} className="inline mr-2" />Profile</button>
        <button type="button" onClick={() => setTab("history")} className={`min-h-11 shrink-0 border px-4 text-[10px] uppercase tracking-[0.16em] ${tab === "history" ? "border-gold bg-gold/5 text-gold" : "border-border/60 text-muted-foreground"}`}><FileClock size={13} className="inline mr-2" />Communication history ({history.length})</button>
      </div>

      {error && <div className="m-4 sm:m-6 border border-red-500/40 bg-red-500/[0.05] p-4 text-sm text-red-200">{error}</div>}

      {tab === "profile" ? (
        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Field label="Contact name *"><input value={profile.display_name} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} className={FIELD} /></Field>
            <Field label="Company name"><input value={profile.company_name} onChange={(event) => setProfile({ ...profile, company_name: event.target.value })} className={FIELD} /></Field>
            <Field label="Country"><input value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} className={FIELD} /></Field>
            <Field label="Email"><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className={FIELD} /></Field>
            <Field label="Phone"><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className={FIELD} /></Field>
            <Field label="WhatsApp"><input value={profile.whatsapp} onChange={(event) => setProfile({ ...profile, whatsapp: event.target.value })} className={FIELD} /></Field>
            <Field label="Website"><input type="url" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} className={FIELD} placeholder="https://…" /></Field>
            <Field label="Buyer type"><input value={profile.buyer_type} onChange={(event) => setProfile({ ...profile, buyer_type: event.target.value })} className={FIELD} placeholder="Wholesaler, importer, private label…" /></Field>
            <Field label="Product interest"><input value={profile.product_interest} onChange={(event) => setProfile({ ...profile, product_interest: event.target.value })} className={FIELD} /></Field>
            <Field label="Estimated quantity"><input value={profile.quantity} onChange={(event) => setProfile({ ...profile, quantity: event.target.value })} className={FIELD} /></Field>
            <Field label="Preferred language"><input value={profile.preferred_language} onChange={(event) => setProfile({ ...profile, preferred_language: event.target.value })} className={FIELD} placeholder="English, German…" /></Field>
            <Field label="Buyer timezone"><input value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} className={FIELD} placeholder="Europe/Berlin" /></Field>
          </div>
          <Field label="Address"><textarea rows={3} value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} className={`${FIELD} py-3`} /></Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="LinkedIn"><input type="url" value={profile.linkedin_url} onChange={(event) => setProfile({ ...profile, linkedin_url: event.target.value })} className={FIELD} placeholder="https://…" /></Field>
            <Field label="Instagram"><input type="url" value={profile.instagram_url} onChange={(event) => setProfile({ ...profile, instagram_url: event.target.value })} className={FIELD} placeholder="https://…" /></Field>
            <Field label="Facebook"><input type="url" value={profile.facebook_url} onChange={(event) => setProfile({ ...profile, facebook_url: event.target.value })} className={FIELD} placeholder="https://…" /></Field>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="button" onClick={() => void saveProfile()} disabled={busy === "profile" || loading} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 text-[10px] uppercase tracking-[0.16em] text-background disabled:opacity-50"><Save size={14} /> {busy === "profile" ? "Saving…" : "Save verified profile"}</button>
            <p className="text-xs text-muted-foreground">Updated fields synchronize to the original inquiry, catalogue request or prospect wherever that source supports them.</p>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="All events" value={history.length} />
            <Metric label="Inbound" value={inboundCount} />
            <Metric label="Outbound" value={outboundCount} />
          </div>

          <section className="border border-border/55 bg-background/30 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2"><MessageCircle size={17} className="text-gold" /><h4 className="font-display text-lg">Log a call, visit or external conversation</h4></div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <Field label="Channel"><select value={log.channel} onChange={(event) => setLog({ ...log, channel: event.target.value as LogDraft["channel"] })} className={FIELD}><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="video_call">Video call</option><option value="in_person">In-person visit</option><option value="website_chat">Website chat</option><option value="other">Other</option></select></Field>
              <Field label="Direction"><select value={log.direction} onChange={(event) => setLog({ ...log, direction: event.target.value as LogDraft["direction"] })} className={FIELD}><option value="outbound">Outbound</option><option value="inbound">Inbound</option><option value="internal">Internal note</option></select></Field>
              <Field label="Status"><select value={log.status} onChange={(event) => setLog({ ...log, status: event.target.value as LogDraft["status"] })} className={FIELD}><option value="logged">Logged</option><option value="sent">Sent</option><option value="received">Received</option><option value="draft">Draft</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></Field>
              <Field label="Date and time"><input type="datetime-local" value={log.occurredLocal} onChange={(event) => setLog({ ...log, occurredLocal: event.target.value })} className={FIELD} /></Field>
            </div>
            <Field label="Subject"><input value={log.subject} onChange={(event) => setLog({ ...log, subject: event.target.value })} className={FIELD} placeholder="Call about sample requirement…" /></Field>
            <Field label="What happened? *"><textarea rows={4} value={log.summary} onChange={(event) => setLog({ ...log, summary: event.target.value })} className={`${FIELD} py-3`} placeholder="Record facts, buyer requests and next step. Do not invent commitments." /></Field>
            <Field label="Optional external link"><input type="url" value={log.externalUrl} onChange={(event) => setLog({ ...log, externalUrl: event.target.value })} className={FIELD} placeholder="https://…" /></Field>
            <button type="button" onClick={() => void logCommunication()} disabled={busy === "communication"} className="min-h-12 inline-flex items-center justify-center gap-2 border border-gold/50 px-5 text-[10px] uppercase tracking-[0.16em] text-gold disabled:opacity-50"><Save size={14} /> {busy === "communication" ? "Saving…" : "Add to history"}</button>
          </section>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setChannelFilter("all")} className={`min-h-10 shrink-0 border px-3 text-[9px] uppercase tracking-[0.14em] ${channelFilter === "all" ? "border-gold text-gold" : "border-border/60 text-muted-foreground"}`}>All {history.length}</button>
            {channels.map((channel) => <button key={channel} type="button" onClick={() => setChannelFilter(channel)} className={`min-h-10 shrink-0 border px-3 text-[9px] uppercase tracking-[0.14em] ${channelFilter === channel ? "border-gold text-gold" : "border-border/60 text-muted-foreground"}`}>{channel} {history.filter((item) => item.channel === channel).length}</button>)}
          </div>

          {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading communication history…</p> : visibleHistory.length === 0 ? (
            <div className="border border-dashed border-border/60 p-10 text-center"><FileClock size={28} className="mx-auto text-gold" /><p className="font-display text-xl mt-3">No communication recorded</p><p className="text-sm text-muted-foreground mt-2">Gmail, WhatsApp, outreach and website events appear automatically when a reliable email, phone or CRM link matches.</p></div>
          ) : (
            <div className="space-y-3">
              {visibleHistory.map((item) => <HistoryCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const source = typeof item.metadata?.source === "string" ? item.metadata.source : "crm";
  const Icon = item.channel === "email" ? Mail : item.channel === "whatsapp" ? MessageCircle : item.channel === "phone" ? Phone : FileClock;
  const DirectionIcon = item.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
  return (
    <article className="border border-border/55 bg-background/35 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em]">
            <span className="inline-flex items-center gap-1.5 border border-border/60 px-2 py-1 text-gold"><Icon size={11} />{item.channel}</span>
            <span className="inline-flex items-center gap-1.5 border border-border/60 px-2 py-1 text-muted-foreground"><DirectionIcon size={11} />{item.direction}</span>
            <span className="border border-border/60 px-2 py-1 text-muted-foreground">{item.status}</span>
            <span className="text-muted-foreground">source: {source}</span>
          </div>
          <h4 className="font-display text-lg mt-3">{item.subject || `${item.channel} communication`}</h4>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap mt-2 leading-relaxed">{item.body}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs text-muted-foreground">{new Date(item.occurred_at).toLocaleString()}</p>
          {item.external_url && <a href={item.external_url} target="_blank" rel="noreferrer" className="min-h-10 mt-2 inline-flex items-center gap-1.5 text-xs text-sky-300 underline underline-offset-4"><ExternalLink size={12} /> Open source</a>}
        </div>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-xs text-muted-foreground"><span>{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/55 bg-background/35 p-3 sm:p-4"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1 tabular-nums">{value}</p></div>;
}
