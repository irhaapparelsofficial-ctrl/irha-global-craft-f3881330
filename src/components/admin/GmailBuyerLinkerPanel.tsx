import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const db = supabase as any;

type BuyerEmail = {
  id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string;
  summary_roman_urdu: string | null;
  received_at: string;
  importance: "low" | "normal" | "high" | "urgent";
  gmail_url: string | null;
};

type Draft = {
  companyName: string;
  country: string;
  buyerType: string;
  priority: "low" | "normal" | "high" | "urgent";
};

const BUYER_TYPES = [
  "Wholesaler",
  "Importer",
  "Distributor",
  "Retailer",
  "Private-label brand",
  "Club / Team",
  "Other",
];

const FIELD_CLASS = "min-h-12 w-full border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-gold";

function initialDraft(item: BuyerEmail): Draft {
  return {
    companyName: item.sender_name?.trim() || "",
    country: "",
    buyerType: "",
    priority: item.importance,
  };
}

export default function GmailBuyerLinkerPanel() {
  const [items, setItems] = useState<BuyerEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await db
      .from("gmail_inbox_items")
      .select("id,sender_name,sender_email,subject,summary_roman_urdu,received_at,importance,gmail_url")
      .eq("category", "buyer")
      .is("linked_lead_id", null)
      .neq("status", "archived")
      .order("received_at", { ascending: false })
      .limit(100);

    const rows = (data || []) as BuyerEmail[];
    setItems(rows);
    setDrafts((current) => {
      const next = { ...current };
      for (const item of rows) {
        if (!next[item.id]) next[item.id] = initialDraft(item);
      }
      return next;
    });
    setError(queryError?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actionable = useMemo(
    () => items.filter((item) => Boolean(item.sender_email?.trim())),
    [items],
  );

  const patchDraft = (id: string, patch: Partial<Draft>) => {
    const item = items.find((row) => row.id === id);
    if (!item) return;
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || initialDraft(item)), ...patch },
    }));
  };

  const promote = async (item: BuyerEmail) => {
    const draft = drafts[item.id] || initialDraft(item);
    if (!draft.companyName.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    if (!draft.country.trim()) {
      toast({ title: "Country is required", description: "Add the buyer country before creating the CRM record.", variant: "destructive" });
      return;
    }

    setSavingId(item.id);
    const { data, error: rpcError } = await db.rpc("gmail_promote_inbox_item_to_lead", {
      _gmail_item_id: item.id,
      _company_name: draft.companyName.trim(),
      _country: draft.country.trim(),
      _buyer_type: draft.buyerType.trim() || null,
      _priority: draft.priority,
    });
    setSavingId(null);

    if (rpcError) {
      toast({ title: "Buyer record could not be created", description: rpcError.message, variant: "destructive" });
      return;
    }

    const result = data as { created?: boolean; lead_id?: string } | null;
    setItems((current) => current.filter((row) => row.id !== item.id));
    setEditingId(null);
    toast({
      title: result?.created ? "Buyer added to CRM" : "Email linked to existing buyer",
      description: `${draft.companyName} is now connected to this Gmail conversation.`,
    });
  };

  if (loading) {
    return <div className="border border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">Checking unlinked buyer emails…</div>;
  }

  if (error) {
    return (
      <section className="border border-red-500/40 bg-red-500/[0.05] p-5">
        <p className="text-sm text-red-200">Buyer-email linking could not load: {error}</p>
        <button type="button" onClick={() => void load()} className="mt-3 min-h-11 inline-flex items-center gap-2 border border-red-500/40 px-4 text-[10px] uppercase tracking-[0.16em] text-red-200">
          <RefreshCw size={13} /> Retry
        </button>
      </section>
    );
  }

  if (actionable.length === 0) {
    return (
      <section className="border border-emerald-500/30 bg-emerald-500/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Buyer emails are connected</p>
            <p className="text-xs text-muted-foreground mt-1">There is no unlinked buyer email requiring a CRM decision right now.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-amber-500/35 bg-amber-500/[0.035] p-4 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link2 size={20} className="text-amber-300 shrink-0 mt-1" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300">Gmail → Buyer CRM</p>
            <h2 className="font-display text-2xl mt-1">{actionable.length} buyer email{actionable.length === 1 ? "" : "s"} need linking</h2>
            <p className="text-sm text-foreground/65 mt-2 max-w-3xl leading-relaxed">
              Confirm the company and country once. The email thread will then stay connected to the buyer profile. No reply or outreach is sent.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-gold hover:text-gold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {actionable.map((item) => {
          const editing = editingId === item.id;
          const draft = drafts[item.id] || initialDraft(item);
          return (
            <article key={item.id} className="border border-border/60 bg-background/40 p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{item.sender_name || item.sender_email}</p>
                  <p className="text-xs text-muted-foreground mt-1 break-all">{item.sender_email}</p>
                  <h3 className="font-display text-lg mt-3">{item.subject}</h3>
                  <p className="text-xs text-foreground/65 mt-2 leading-relaxed">{item.summary_roman_urdu || "Buyer email needs review."}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(item.received_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {item.gmail_url && (
                    <a href={item.gmail_url} target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center gap-2 border border-sky-500/40 px-3 text-[10px] uppercase tracking-[0.14em] text-sky-300">
                      <ExternalLink size={13} /> Gmail
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(editing ? null : item.id)}
                    className={cn(
                      "min-h-11 inline-flex items-center gap-2 border px-4 text-[10px] uppercase tracking-[0.14em]",
                      editing ? "border-gold bg-gold/10 text-gold" : "border-gold/45 text-gold",
                    )}
                  >
                    <UserPlus size={14} /> {editing ? "Close form" : "Create buyer record"}
                  </button>
                </div>
              </div>

              {editing && (
                <div className="mt-5 border-t border-border/50 pt-5">
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <Field label="Company name" required>
                      <input value={draft.companyName} onChange={(event) => patchDraft(item.id, { companyName: event.target.value })} className={FIELD_CLASS} placeholder="Buyer company" />
                    </Field>
                    <Field label="Country" required>
                      <input value={draft.country} onChange={(event) => patchDraft(item.id, { country: event.target.value })} className={FIELD_CLASS} placeholder="Germany, Azerbaijan…" />
                    </Field>
                    <Field label="Buyer type">
                      <select value={draft.buyerType} onChange={(event) => patchDraft(item.id, { buyerType: event.target.value })} className={FIELD_CLASS}>
                        <option value="">Not confirmed</option>
                        {BUYER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select value={draft.priority} onChange={(event) => patchDraft(item.id, { priority: event.target.value as Draft["priority"] })} className={FIELD_CLASS}>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </Field>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void promote(item)}
                      disabled={savingId === item.id}
                      className="min-h-12 inline-flex items-center gap-2 bg-gradient-gold px-5 text-[10px] uppercase tracking-[0.16em] text-background disabled:opacity-50"
                    >
                      <UserPlus size={14} /> {savingId === item.id ? "Creating…" : "Save buyer to CRM"}
                    </button>
                    <p className="text-xs text-muted-foreground">This creates or links a private buyer profile only.</p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-2 text-xs text-muted-foreground">
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}
