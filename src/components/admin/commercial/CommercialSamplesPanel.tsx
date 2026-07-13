import { useMemo, useState } from "react";
import { PackageCheck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  SAMPLE_STATUS_LABELS,
  type CommercialBuyerRef,
  type CurrencyCode,
  type SampleStatus,
} from "@/lib/commercialHub";
import {
  commercialBuyerKey,
  type SampleRow,
} from "@/hooks/useCommercialHub";
import {
  Badge,
  BuyerSelect,
  Empty,
  Input,
  NumberInput,
  TextArea,
} from "@/components/admin/commercial/CommercialUi";

const db = supabase as any;

type SampleDraft = {
  buyerKey: string;
  product: string;
  requirements: string;
  quantity: number;
  currency: CurrencyCode;
  sampleCost: number;
  shippingCost: number;
  notes: string;
};

function freshSample(): SampleDraft {
  return {
    buyerKey: "",
    product: "",
    requirements: "",
    quantity: 1,
    currency: "USD",
    sampleCost: 0,
    shippingCost: 0,
    notes: "",
  };
}

export default function CommercialSamplesPanel({
  buyers,
  samples,
  setSamples,
}: {
  buyers: CommercialBuyerRef[];
  samples: SampleRow[];
  setSamples: React.Dispatch<React.SetStateAction<SampleRow[]>>;
}) {
  const [draft, setDraft] = useState<SampleDraft>(() => freshSample());
  const [busy, setBusy] = useState(false);

  const selectedBuyer = useMemo(
    () => buyers.find((buyer) => commercialBuyerKey(buyer.source, buyer.sourceId) === draft.buyerKey) || null,
    [buyers, draft.buyerKey],
  );

  const applyBuyer = (key: string) => {
    const buyer = buyers.find((row) => commercialBuyerKey(row.source, row.sourceId) === key);
    setDraft((current) => ({
      ...current,
      buyerKey: key,
      product: buyer?.product || current.product,
      requirements: buyer?.quantity
        ? `Estimated bulk quantity context: ${buyer.quantity}`
        : current.requirements,
    }));
  };

  const save = async () => {
    if (!selectedBuyer || !draft.product.trim() || !draft.requirements.trim() || draft.quantity <= 0) {
      toast({ title: "Sample brief is incomplete", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { data, error } = await db
      .from("crm_samples")
      .insert({
        source_type: selectedBuyer.source,
        source_id: selectedBuyer.sourceId,
        product: draft.product.trim(),
        requirements: draft.requirements.trim(),
        quantity: draft.quantity,
        status: "requested",
        currency: draft.currency,
        sample_cost: draft.sampleCost,
        shipping_cost: draft.shippingCost,
        notes: draft.notes.trim() || null,
      })
      .select("*")
      .single();
    setBusy(false);

    if (error) {
      toast({
        title: "Sample backend is not active yet",
        description: "The migration is ready for final activation.",
        variant: "destructive",
      });
      return;
    }

    setSamples((current) => [data as SampleRow, ...current]);
    setDraft(freshSample());
    toast({ title: "Sample request saved" });
  };

  const updateSample = async (sample: SampleRow, patch: Partial<SampleRow>) => {
    const { data, error } = await db
      .from("crm_samples")
      .update(patch)
      .eq("id", sample.id)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Sample update failed", description: error.message, variant: "destructive" });
      return;
    }
    setSamples((current) =>
      current.map((row) => (row.id === sample.id ? (data as SampleRow) : row)),
    );
  };

  return (
    <div className="grid xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)] gap-5">
      <section className="border border-border/60 bg-card/20 p-5 space-y-4">
        <div>
          <p className="eyebrow mb-2">Development brief</p>
          <h3 className="font-display text-2xl">New sample request</h3>
          <p className="text-xs text-muted-foreground mt-2">
            Sample cost and shipment scope remain draft facts until the owner confirms them for this buyer.
          </p>
        </div>
        <BuyerSelect value={draft.buyerKey} buyers={buyers} onChange={applyBuyer} />
        <Input
          label="Product / style"
          value={draft.product}
          onChange={(value) => setDraft({ ...draft, product: value })}
        />
        <TextArea
          label="Sample requirements"
          value={draft.requirements}
          onChange={(value) => setDraft({ ...draft, requirements: value })}
          placeholder="Material, construction, branding, sizes, colors and reference details"
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberInput
            label="Qty"
            value={draft.quantity}
            onChange={(value) => setDraft({ ...draft, quantity: Math.max(1, value) })}
          />
          <NumberInput
            label="Sample cost"
            value={draft.sampleCost}
            step="0.01"
            onChange={(value) => setDraft({ ...draft, sampleCost: value })}
          />
          <NumberInput
            label="Shipping"
            value={draft.shippingCost}
            step="0.01"
            onChange={(value) => setDraft({ ...draft, shippingCost: value })}
          />
        </div>
        <label className="space-y-2 block">
          <span className="text-xs text-muted-foreground">Currency</span>
          <select
            value={draft.currency}
            onChange={(event) =>
              setDraft({ ...draft, currency: event.target.value as CurrencyCode })
            }
            className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"
          >
            {["USD", "EUR", "GBP", "AUD", "CAD", "AED"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <TextArea
          label="Private notes"
          value={draft.notes}
          onChange={(value) => setDraft({ ...draft, notes: value })}
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"
        >
          <Save size={13} /> {busy ? "Saving…" : "Save sample request"}
        </button>
      </section>

      <section className="border border-border/60 bg-card/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">Sample tracker</h3>
          <Badge label={`${samples.length} records`} />
        </div>
        <div className="mt-5 space-y-3 max-h-[760px] overflow-y-auto">
          {samples.length === 0 ? (
            <Empty icon={<PackageCheck size={28} />} text="No sample records yet." />
          ) : (
            samples.map((sample) => {
              const buyer = buyers.find(
                (row) => row.source === sample.source_type && row.sourceId === sample.source_id,
              );
              return (
                <article key={sample.id} className="border border-border/60 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-gold">
                        {sample.sample_reference} · {buyer?.reference || sample.source_type}
                      </p>
                      <p className="font-display text-xl mt-1">{sample.product}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty {sample.quantity} · {sample.currency}{" "}
                        {(Number(sample.sample_cost) + Number(sample.shipping_cost)).toFixed(2)}
                      </p>
                    </div>
                    <select
                      value={sample.status}
                      onChange={(event) =>
                        void updateSample(sample, { status: event.target.value as SampleStatus })
                      }
                      className="min-h-10 bg-background border border-border/60 px-2 text-xs"
                    >
                      {Object.entries(SAMPLE_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-sm text-foreground/65 mt-3 whitespace-pre-wrap">
                    {sample.requirements}
                  </p>

                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    <Input
                      label="Courier"
                      value={sample.courier || ""}
                      onChange={(value) => void updateSample(sample, { courier: value || null })}
                    />
                    <Input
                      label="Tracking number"
                      value={sample.tracking_number || ""}
                      onChange={(value) =>
                        void updateSample(sample, { tracking_number: value || null })
                      }
                    />
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    <TextArea
                      label="Buyer feedback"
                      value={sample.feedback || ""}
                      onChange={(value) =>
                        void updateSample(sample, { feedback: value || null })
                      }
                    />
                    <TextArea
                      label="Private notes"
                      value={sample.notes || ""}
                      onChange={(value) => void updateSample(sample, { notes: value || null })}
                    />
                  </div>

                  {sample.tracking_number && (
                    <p className="mt-3 text-xs text-emerald-300">
                      Tracking reference recorded. Verify the courier and destination before sharing.
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
