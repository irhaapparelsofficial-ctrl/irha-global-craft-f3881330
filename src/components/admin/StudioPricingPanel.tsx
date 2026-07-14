import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FilePlus2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  slug: string;
  primary_material: string | null;
};

type PricingTask = {
  id: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type Draft = {
  productId: string;
  quantity: string;
  currency: "USD" | "EUR" | "GBP";
  materialBrief: string;
  brandingBrief: string;
  destinationCountry: string;
  notes: string;
};

const emptyDraft: Draft = {
  productId: "",
  quantity: "",
  currency: "USD",
  materialBrief: "",
  brandingBrief: "",
  destinationCountry: "",
  notes: "",
};

function idempotencyKey() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-pricing-review-${suffix}`;
}

function payloadText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default function StudioPricingPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tasks, setTasks] = useState<PricingTask[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [productResult, taskResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,slug,primary_material")
        .eq("is_published", true)
        .order("name")
        .limit(500),
      supabase
        .from("automation_tasks")
        .select("id,title,status,payload,error,created_at,updated_at")
        .eq("module", "system")
        .eq("action", "pricing_review")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const nextError = productResult.error?.message || taskResult.error?.message || null;
    setError(nextError);
    setProducts((productResult.data ?? []) as Product[]);
    setTasks((taskResult.data ?? []) as unknown as PricingTask[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === draft.productId) ?? null,
    [draft.productId, products],
  );

  const saveBrief = async (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(draft.quantity);
    if (!selectedProduct) {
      toast({ title: "Select a published product", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    if (!draft.materialBrief.trim()) {
      toast({ title: "Material or construction brief is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("automation_tasks").insert({
      module: "system",
      action: "pricing_review",
      title: `Pricing review · ${selectedProduct.name} · ${quantity} pcs`,
      status: "ready_for_review",
      requires_approval: true,
      external_action: false,
      idempotency_key: idempotencyKey(),
      payload: {
        product_id: selectedProduct.id,
        product_slug: selectedProduct.slug,
        product_name: selectedProduct.name,
        quantity,
        preferred_currency: draft.currency,
        material_brief: draft.materialBrief.trim(),
        branding_brief: draft.brandingBrief.trim() || null,
        destination_country: draft.destinationCountry.trim() || null,
        owner_notes: draft.notes.trim() || null,
        source: "admin-pricing-brief",
        commercial_state: "unquoted",
      },
      result: {},
    } as never);
    setSaving(false);

    if (insertError) {
      toast({ title: "Pricing brief could not be saved", description: insertError.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Pricing review saved",
      description: "No price was generated. The brief is stored for owner-approved costing and quotation work.",
    });
    setDraft(emptyDraft);
    await load();
  };

  const cancelTask = async (task: PricingTask) => {
    if (!["draft", "ready_for_review", "blocked", "failed"].includes(task.status)) return;
    if (!window.confirm(`Cancel “${task.title}”?`)) return;
    const { error: updateError } = await supabase
      .from("automation_tasks")
      .update({ status: "cancelled", error: null })
      .eq("id", task.id);
    if (updateError) {
      toast({ title: "Task could not be cancelled", description: updateError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pricing review cancelled" });
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <p className="eyebrow mb-2">Real costing workflow</p>
            <h2 className="font-display text-2xl md:text-4xl">Custom Lab & Pricing Briefs</h2>
            <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">
              Save a product requirement for internal costing review. This screen never invents FOB, EXW, MOQ, sample fees or delivery timing. Commercial values are confirmed only inside the persistent quotation workflow after owner review.
            </p>
          </div>
          <a
            href="/studio"
            target="_blank"
            rel="noreferrer"
            className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/60 text-gold px-4 text-[10px] uppercase tracking-[0.18em] hover:bg-gold hover:text-background"
          >
            Open real Custom Lab <ExternalLink size={13} />
          </a>
        </div>
      </section>

      {error && (
        <div className="border border-red-500/40 bg-red-500/5 p-4 flex items-start gap-3 text-sm text-red-200">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Pricing data could not load</p>
            <p className="mt-1 text-xs text-foreground/60 break-words">{error}</p>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-6">
        <form onSubmit={saveBrief} className="border border-border/60 bg-card/30 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FilePlus2 size={16} className="text-gold" />
            <h3 className="font-display text-xl">New pricing review</h3>
          </div>

          <Field label="Published product">
            <select
              value={draft.productId}
              onChange={(event) => {
                const productId = event.target.value;
                const product = products.find((item) => item.id === productId);
                setDraft((current) => ({
                  ...current,
                  productId,
                  materialBrief: current.materialBrief || product?.primary_material || "",
                }));
              }}
              className={inputClass}
              required
            >
              <option value="">Select product…</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Quantity">
              <input
                type="number"
                min={1}
                step={1}
                value={draft.quantity}
                onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Preferred quote currency">
              <select
                value={draft.currency}
                onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as Draft["currency"] }))}
                className={inputClass}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </Field>
          </div>

          <Field label="Material / construction brief">
            <textarea
              rows={3}
              value={draft.materialBrief}
              onChange={(event) => setDraft((current) => ({ ...current, materialBrief: event.target.value }))}
              placeholder="Verified material, composition, GSM/weight, construction or approved sample reference…"
              className={inputClass}
              required
            />
          </Field>

          <Field label="Branding and trims">
            <textarea
              rows={2}
              value={draft.brandingBrief}
              onChange={(event) => setDraft((current) => ({ ...current, brandingBrief: event.target.value }))}
              placeholder="Embroidery, DTF, labels, hang tags, packaging…"
              className={inputClass}
            />
          </Field>

          <Field label="Destination country">
            <input
              value={draft.destinationCountry}
              onChange={(event) => setDraft((current) => ({ ...current, destinationCountry: event.target.value }))}
              className={inputClass}
            />
          </Field>

          <Field label="Internal notes">
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            disabled={saving || loading}
            className="min-h-12 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            <FilePlus2 size={14} /> {saving ? "Saving…" : "Save for costing review"}
          </button>
        </form>

        <section className="border border-border/60 bg-card/30 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="eyebrow mb-1">Persistent queue</p>
              <h3 className="font-display text-xl">Pricing reviews</h3>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {loading && tasks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading saved pricing reviews…</p>
          ) : tasks.length === 0 ? (
            <div className="border border-dashed border-border/60 p-8 text-center">
              <Clock3 size={24} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm">No pricing review has been saved yet.</p>
              <p className="text-xs text-muted-foreground mt-2">New briefs will remain here until reviewed, cancelled or completed.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {tasks.map((task) => {
                const productName = payloadText(task.payload?.product_name);
                const quantity = task.payload?.quantity;
                const currency = payloadText(task.payload?.preferred_currency);
                const canCancel = ["draft", "ready_for_review", "blocked", "failed"].includes(task.status);
                return (
                  <article key={task.id} className="border border-border/60 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {[productName, quantity ? `${quantity} pcs` : "", currency].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="mt-3 text-xs text-foreground/60">
                      Saved {new Date(task.created_at).toLocaleString()}
                    </p>
                    {task.error && <p className="mt-2 text-xs text-red-300 break-words">{task.error}</p>}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => void cancelTask(task)}
                        className="mt-3 min-h-10 inline-flex items-center gap-2 border border-red-500/40 text-red-300 px-3 text-[10px] uppercase tracking-[0.16em]"
                      >
                        <XCircle size={12} /> Cancel review
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const complete = status === "executed";
  const cancelled = status === "cancelled";
  const Icon = complete ? CheckCircle2 : cancelled ? XCircle : Clock3;
  const tone = complete
    ? "border-emerald-500/40 text-emerald-300"
    : cancelled
      ? "border-slate-500/40 text-slate-300"
      : status === "failed" || status === "blocked"
        ? "border-red-500/40 text-red-300"
        : "border-amber-500/40 text-amber-300";
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${tone}`}>
      <Icon size={11} /> {status.replace(/_/g, " ")}
    </span>
  );
}

const inputClass = "w-full bg-background border border-border/60 px-3 py-2.5 text-sm outline-none focus:border-gold resize-y";
