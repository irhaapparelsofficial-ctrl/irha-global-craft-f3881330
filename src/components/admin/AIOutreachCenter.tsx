import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SalesCard } from "@/lib/salesPipeline";
import {
  buildOutreachDraft,
  gmailComposeUrl,
  outreachDraftsCsv,
  whatsappComposeUrl,
  type OutreachApproval,
  type OutreachChannel,
} from "@/lib/outreachAutomation";

const STORAGE_KEY = "irha:outreach-approvals-v1";
const FIELD = "w-full rounded-md border border-border/60 bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-gold";

type ApprovalMap = Record<string, OutreachApproval>;

function readApprovals(): ApprovalMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed as ApprovalMap : {};
  } catch {
    return {};
  }
}

function saveApprovals(value: ApprovalMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  } catch {
    toast({ title: "Copy failed", description: "Select and copy the text manually.", variant: "destructive" });
  }
}

export default function AIOutreachCenter({ card, allCards }: { card: SalesCard; allCards: SalesCard[] }) {
  const generated = useMemo(() => buildOutreachDraft(card), [card]);
  const [emailSubject, setEmailSubject] = useState(generated.emailSubject);
  const [emailBody, setEmailBody] = useState(generated.emailBody);
  const [whatsappBody, setWhatsappBody] = useState(generated.whatsappBody);
  const [approvals, setApprovals] = useState<ApprovalMap>(() => readApprovals());

  useEffect(() => {
    setEmailSubject(generated.emailSubject);
    setEmailBody(generated.emailBody);
    setWhatsappBody(generated.whatsappBody);
  }, [generated]);

  const approval = approvals[card.key] || { email: false, whatsapp: false, approvedAt: null };
  const allDrafts = useMemo(() => allCards.map(buildOutreachDraft), [allCards]);
  const approvedCount = useMemo(
    () => Object.values(approvals).filter((item) => item.email || item.whatsapp).length,
    [approvals],
  );

  const setChannelApproval = (channel: OutreachChannel, approved: boolean) => {
    const ready = channel === "email" ? generated.emailReady : generated.whatsappReady;
    if (approved && !ready) {
      toast({
        title: `${channel === "email" ? "Email" : "WhatsApp"} is not ready`,
        description: "Complete and verify the recipient details before approval.",
        variant: "destructive",
      });
      return;
    }

    const next: ApprovalMap = {
      ...approvals,
      [card.key]: {
        ...approval,
        [channel]: approved,
        approvedAt: approved ? new Date().toISOString() : approval.email || approval.whatsapp ? approval.approvedAt : null,
      },
    };
    if (!next[card.key].email && !next[card.key].whatsapp) next[card.key].approvedAt = null;
    setApprovals(next);
    saveApprovals(next);
    toast({ title: approved ? `${channel === "email" ? "Email" : "WhatsApp"} draft approved` : "Approval removed" });
  };

  const revokeOnEdit = (channel: OutreachChannel) => {
    if (approval[channel]) setChannelApproval(channel, false);
  };

  const regenerate = () => {
    setEmailSubject(generated.emailSubject);
    setEmailBody(generated.emailBody);
    setWhatsappBody(generated.whatsappBody);
    const next = { ...approvals };
    delete next[card.key];
    setApprovals(next);
    saveApprovals(next);
    toast({ title: "Safe drafts regenerated", description: "Previous approvals for this buyer were cleared." });
  };

  const openEmail = () => {
    if (!approval.email) return;
    const url = gmailComposeUrl({ ...generated, emailSubject, emailBody, whatsappBody });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const openWhatsApp = () => {
    if (!approval.whatsapp) return;
    const url = whatsappComposeUrl({ ...generated, emailSubject, emailBody, whatsappBody });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="mb-5 border border-gold/35 bg-card/25">
      <div className="border-b border-border/60 p-4 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bot size={22} className="text-gold shrink-0 mt-1" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold">AI Draft Assistant · Owner approval required</p>
              <h3 className="font-display text-2xl sm:text-3xl mt-1">Ready-to-review email and WhatsApp</h3>
              <p className="text-sm text-foreground/65 mt-2 max-w-3xl leading-relaxed">
                Instant drafts can be copied or opened manually. For audited delivery, use the Quick Email Queue or Quick WhatsApp Queue one approved message at a time.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/outreach-quick" className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.16em] text-gold hover:bg-gold hover:text-background">
              <ExternalLink size={13} /> Quick Email Queue
            </a>
            <a href="/admin/whatsapp-quick" className="min-h-11 inline-flex items-center justify-center gap-2 border border-emerald-500/50 px-4 text-[10px] uppercase tracking-[0.16em] text-emerald-300 hover:bg-emerald-500/10">
              <ExternalLink size={13} /> Quick WhatsApp Queue
            </a>
            <button type="button" onClick={regenerate} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-gold hover:text-gold">
              <RefreshCw size={13} /> Regenerate
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-4 sm:px-6 border-b border-border/60">
        <Metric label="CRM companies" value={allCards.length} />
        <Metric label="Email ready" value={allDrafts.filter((item) => item.emailReady).length} />
        <Metric label="WhatsApp ready" value={allDrafts.filter((item) => item.whatsappReady).length} />
        <Metric label="Approved buyers" value={approvedCount} />
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {generated.warnings.length > 0 && (
          <div className="border border-amber-500/35 bg-amber-500/[0.05] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-amber-300"><AlertTriangle size={14} /> Review warnings</div>
            <div className="mt-3 space-y-2 text-sm text-foreground/75">
              {generated.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
            </div>
          </div>
        )}

        <div className="grid 2xl:grid-cols-2 gap-5">
          <article className={`border p-4 sm:p-5 ${approval.email ? "border-emerald-500/45 bg-emerald-500/[0.035]" : "border-border/60 bg-background/25"}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-gold mt-1" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Email · {generated.email || "recipient missing"}</p>
                  <h4 className="font-display text-xl mt-1">Company-specific email</h4>
                </div>
              </div>
              <Status approved={approval.email} ready={generated.emailReady} />
            </div>

            <label className="block mt-4">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Subject</span>
              <input
                value={emailSubject}
                onChange={(event) => { revokeOnEdit("email"); setEmailSubject(event.target.value); }}
                className={`${FIELD} mt-2 min-h-12`}
              />
            </label>
            <label className="block mt-4">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Message</span>
              <textarea
                rows={16}
                value={emailBody}
                onChange={(event) => { revokeOnEdit("email"); setEmailBody(event.target.value); }}
                className={`${FIELD} mt-2 leading-relaxed`}
              />
            </label>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">
              <button type="button" onClick={() => void copyText(`${emailSubject}\n\n${emailBody}`, "Email draft")} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Copy size={12} /> Copy</button>
              <button type="button" disabled={!generated.emailReady} onClick={() => setChannelApproval("email", !approval.email)} className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 px-3 text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold hover:text-background disabled:opacity-40">
                {approval.email ? <Undo2 size={12} /> : <CheckCircle2 size={12} />} {approval.email ? "Undo OK" : "OK Email"}
              </button>
              <button type="button" disabled={!approval.email} onClick={openEmail} className="min-h-11 sm:col-span-2 xl:col-span-1 inline-flex items-center justify-center gap-2 border border-emerald-500/45 px-3 text-[10px] uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-35"><ExternalLink size={12} /> Open Gmail</button>
            </div>
          </article>

          <article className={`border p-4 sm:p-5 ${approval.whatsapp ? "border-emerald-500/45 bg-emerald-500/[0.035]" : "border-border/60 bg-background/25"}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <MessageCircle size={18} className="text-gold mt-1" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-gold">WhatsApp · {generated.phone || "number missing"}</p>
                  <h4 className="font-display text-xl mt-1">Company-specific WhatsApp</h4>
                </div>
              </div>
              <Status approved={approval.whatsapp} ready={generated.whatsappReady} />
            </div>

            <label className="block mt-4">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Message</span>
              <textarea
                rows={20}
                value={whatsappBody}
                onChange={(event) => { revokeOnEdit("whatsapp"); setWhatsappBody(event.target.value); }}
                className={`${FIELD} mt-2 leading-relaxed`}
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-2 mt-4">
              <button type="button" onClick={() => void copyText(whatsappBody, "WhatsApp draft")} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Copy size={12} /> Copy</button>
              <button type="button" disabled={!generated.whatsappReady} onClick={() => setChannelApproval("whatsapp", !approval.whatsapp)} className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 px-3 text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold hover:text-background disabled:opacity-40">
                {approval.whatsapp ? <Undo2 size={12} /> : <CheckCircle2 size={12} />} {approval.whatsapp ? "Undo OK" : "OK WhatsApp"}
              </button>
              <button type="button" disabled={!approval.whatsapp} onClick={openWhatsApp} className="min-h-11 inline-flex items-center justify-center gap-2 border border-emerald-500/45 px-3 text-[10px] uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-35"><ExternalLink size={12} /> Open WhatsApp</button>
            </div>
          </article>
        </div>

        <section className="border border-border/60 bg-background/25 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Download size={18} className="text-gold mt-1" />
              <div>
                <h4 className="font-display text-xl">Export Center</h4>
                <p className="text-sm text-muted-foreground mt-1">Downloads formula-safe UTF-8 CSV with company details, subject, email draft, WhatsApp draft, readiness and warnings.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => downloadCsv(`${card.reference.toLowerCase()}-outreach.csv`, outreachDraftsCsv([card]))} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Download size={12} /> Selected company</button>
              <button type="button" onClick={() => downloadCsv(`irha-outreach-all-${new Date().toISOString().slice(0, 10)}.csv`, outreachDraftsCsv(allCards))} className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold hover:text-background"><Download size={12} /> All companies</button>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 border border-sky-500/30 bg-sky-500/[0.04] p-4 text-sm text-foreground/70">
          <ShieldCheck size={17} className="text-sky-300 shrink-0 mt-0.5" />
          <p>Instant draft OK status stays in this browser. Real external delivery uses the separate owner-only queues and private backend checks for suppression, opt-out, customer-service windows, approved templates, commercial commitments and audit records.</p>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/55 bg-background/30 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>;
}

function Status({ approved, ready }: { approved: boolean; ready: boolean }) {
  if (approved) return <span className="inline-flex min-h-8 items-center gap-2 border border-emerald-500/45 px-2 text-[9px] uppercase tracking-[0.14em] text-emerald-300"><CheckCircle2 size={12} /> Approved</span>;
  if (ready) return <span className="inline-flex min-h-8 items-center gap-2 border border-sky-500/35 px-2 text-[9px] uppercase tracking-[0.14em] text-sky-300"><ShieldCheck size={12} /> Ready</span>;
  return <span className="inline-flex min-h-8 items-center gap-2 border border-amber-500/35 px-2 text-[9px] uppercase tracking-[0.14em] text-amber-300"><AlertTriangle size={12} /> Needs data</span>;
}
