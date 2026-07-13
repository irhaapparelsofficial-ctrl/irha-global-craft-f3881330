import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  Plus,
  Printer,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  QUOTATION_STATUS_LABELS,
  canTransitionQuotation,
  quotationReadiness,
  quotationTotals,
  type CommercialBuyerRef,
  type CurrencyCode,
  type QuotationItemDraft,
  type QuotationStatus,
} from "@/lib/commercialHub";
import {
  commercialBuyerKey,
  type QuotationItemRow,
  type QuotationRow,
} from "@/hooks/useCommercialHub";
import {
  Action,
  Badge,
  BuyerSelect,
  Empty,
  Input,
  Line,
  NumberInput,
  TextArea,
} from "@/components/admin/commercial/CommercialUi";

const db = supabase as any;

type QuoteDraft = {
  buyerKey: string;
  buyerName: string;
  company: string;
  destination: string;
  buyerEmail: string;
  currency: CurrencyCode;
  validUntil: string;
  incoterm: string;
  shippingScope: string;
  paymentTerms: string;
  notes: string;
  items: QuotationItemDraft[];
  shipping: number;
  discount: number;
};

function freshQuote(): QuoteDraft {
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return {
    buyerKey: "",
    buyerName: "",
    company: "",
    destination: "",
    buyerEmail: "",
    currency: "USD",
    validUntil,
    incoterm: "FOB",
    shippingScope: "Confirmed separately against destination and shipment scope.",
    paymentTerms: "To be approved by owner before issue.",
    notes: "",
    items: [
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit: "piece",
        unitPrice: 0,
      },
    ],
    shipping: 0,
    discount: 0,
  };
}

export default function CommercialQuotationsPanel({
  buyers,
  quotations,
  quoteItems,
  setQuotations,
  setQuoteItems,
}: {
  buyers: CommercialBuyerRef[];
  quotations: QuotationRow[];
  quoteItems: QuotationItemRow[];
  setQuotations: React.Dispatch<React.SetStateAction<QuotationRow[]>>;
  setQuoteItems: React.Dispatch<React.SetStateAction<QuotationItemRow[]>>;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<QuoteDraft>(() => freshQuote());
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(quotations[0]?.id || null);

  const selectedQuote = quotations.find((quote) => quote.id === selectedId) || null;
  const selectedItems = selectedQuote
    ? quoteItems.filter((item) => item.quotation_id === selectedQuote.id)
    : [];
  const selectedBuyer = useMemo(
    () => buyers.find((buyer) => commercialBuyerKey(buyer.source, buyer.sourceId) === draft.buyerKey) || null,
    [buyers, draft.buyerKey],
  );
  const totals = useMemo(
    () => quotationTotals(draft.items, draft.shipping, draft.discount),
    [draft],
  );
  const readiness = useMemo(
    () =>
      quotationReadiness({
        buyerReference: selectedBuyer?.reference || "",
        buyerName: draft.buyerName,
        company: draft.company,
        currency: draft.currency,
        validUntil: draft.validUntil,
        incoterm: draft.incoterm,
        paymentTerms: draft.paymentTerms,
        shippingScope: draft.shippingScope,
        items: draft.items,
      }),
    [draft, selectedBuyer],
  );

  const applyBuyer = (key: string) => {
    const buyer = buyers.find((row) => commercialBuyerKey(row.source, row.sourceId) === key);
    setDraft((current) => ({
      ...current,
      buyerKey: key,
      buyerName: buyer?.name || "",
      company: buyer?.company || "",
      destination: buyer?.country || "",
      buyerEmail: buyer?.email || "",
      items: current.items.map((item, index) =>
        index === 0 && !item.description
          ? { ...item, description: buyer?.product || "" }
          : item,
      ),
    }));
  };

  const patchItem = (id: string, patch: Partial<QuotationItemDraft>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const saveQuotation = async () => {
    if (!selectedBuyer || !readiness.ready) {
      toast({
        title: "Quotation draft is incomplete",
        description: readiness.missing.slice(0, 6).join(" · "),
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    const { data: quoteData, error: quoteError } = await db
      .from("crm_quotations")
      .insert({
        source_type: selectedBuyer.source,
        source_id: selectedBuyer.sourceId,
        buyer_name: draft.buyerName.trim(),
        company: draft.company.trim() || null,
        destination_country: draft.destination.trim() || null,
        buyer_email: draft.buyerEmail.trim().toLowerCase() || null,
        currency: draft.currency,
        status: "draft",
        valid_until: draft.validUntil,
        incoterm: draft.incoterm.trim(),
        shipping_scope: draft.shippingScope.trim(),
        payment_terms: draft.paymentTerms.trim(),
        notes: draft.notes.trim() || null,
        shipping_amount: totals.shipping,
        discount_amount: totals.discount,
      })
      .select("*")
      .single();

    if (quoteError || !quoteData) {
      setBusy(false);
      toast({
        title: "Quotation backend is not active yet",
        description: "The migration is ready for final activation.",
        variant: "destructive",
      });
      return;
    }

    const itemsPayload = draft.items.map((item, index) => ({
      quotation_id: quoteData.id,
      description: item.description.trim(),
      quantity: item.quantity,
      unit: item.unit.trim(),
      unit_price: item.unitPrice,
      sort_order: index,
    }));
    const { data: itemData, error: itemError } = await db
      .from("crm_quotation_items")
      .insert(itemsPayload)
      .select("*");

    if (itemError) {
      await db.from("crm_quotations").delete().eq("id", quoteData.id);
      setBusy(false);
      toast({
        title: "Quotation line save failed",
        description: itemError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: refreshed } = await db
      .from("crm_quotations")
      .select("*")
      .eq("id", quoteData.id)
      .single();
    const savedQuote = (refreshed || quoteData) as QuotationRow;
    setQuotations((current) => [savedQuote, ...current]);
    setQuoteItems((current) => [
      ...current,
      ...((itemData ?? []) as QuotationItemRow[]),
    ]);
    setSelectedId(savedQuote.id);
    setDraft(freshQuote());
    setBusy(false);
    toast({
      title: "Quotation draft saved",
      description: `${savedQuote.quotation_number} requires owner review before issue.`,
    });
  };

  const transitionQuote = async (quote: QuotationRow, next: QuotationStatus) => {
    const ownerApproved = Boolean(quote.owner_approved_at) || next === "approved";
    if (!canTransitionQuotation(quote.status, next, ownerApproved)) {
      toast({
        title: "Status transition blocked",
        description: "Owner approval and the required workflow sequence must be completed first.",
        variant: "destructive",
      });
      return;
    }
    if (
      next === "approved" &&
      !window.confirm(
        `Approve ${quote.quotation_number} for issue? Verify prices, terms and delivery scope first.`,
      )
    ) {
      return;
    }
    if (
      next === "sent" &&
      !window.confirm(
        `Mark ${quote.quotation_number} as sent? This records state but does not send an email.`,
      )
    ) {
      return;
    }

    const patch: Record<string, unknown> = { status: next };
    if (next === "approved") {
      patch.owner_approved_at = new Date().toISOString();
      patch.owner_approved_by = user?.email || "owner";
    }
    if (next === "sent") patch.sent_at = new Date().toISOString();
    if (next === "accepted") patch.accepted_at = new Date().toISOString();

    const { data, error } = await db
      .from("crm_quotations")
      .update(patch)
      .eq("id", quote.id)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Quotation update failed", description: error.message, variant: "destructive" });
      return;
    }

    setQuotations((current) =>
      current.map((row) => (row.id === quote.id ? (data as QuotationRow) : row)),
    );

    if (next === "sent") {
      const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      void db.from("crm_tasks").insert({
        source_type: quote.source_type,
        source_id: quote.source_id,
        title: `Follow up ${quote.quotation_number}`,
        notes:
          "Confirm receipt and review open questions. Do not alter approved terms without a new revision.",
        priority: "high",
        status: "open",
        due_at: dueAt,
        assigned_to: user?.email || null,
      });
    }

    toast({
      title: `${quote.quotation_number} → ${QUOTATION_STATUS_LABELS[next]}`,
      description:
        next === "sent"
          ? "A three-day follow-up task was prepared; no email was sent."
          : undefined,
    });
  };

  const copyQuoteMessage = async (quote: QuotationRow) => {
    const message = [
      `Hello ${quote.buyer_name || quote.company || ""},`,
      "",
      `Please find quotation ${quote.quotation_number} for review.`,
      `Currency: ${quote.currency}`,
      `Total: ${quote.currency} ${Number(quote.total_amount).toFixed(2)}`,
      `Valid until: ${new Date(quote.valid_until).toLocaleDateString()}`,
      "",
      "Please confirm any questions or required revisions before approval.",
      "",
      "Irha Apparels",
    ].join("\n");
    await navigator.clipboard.writeText(message);
    toast({
      title: "Quotation message copied",
      description: "Review it before sending through an approved channel.",
    });
  };

  const printQuote = (quote: QuotationRow) => {
    setSelectedId(quote.id);
    window.setTimeout(() => window.print(), 120);
  };

  return (
    <div className="space-y-5">
      <section className="border border-border/60 bg-card/20 p-5 print:hidden">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Owner-controlled pricing</p>
            <h3 className="font-display text-2xl">New quotation draft</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-3xl">
              Prices, payment terms, Incoterm and shipping scope must be entered and approved by the owner. Saving never sends or promises anything automatically.
            </p>
          </div>
          <div
            className={`border px-4 py-3 ${
              readiness.ready
                ? "border-emerald-500/40 text-emerald-300"
                : "border-amber-500/40 text-amber-300"
            }`}
          >
            <p className="font-display text-xl">
              {readiness.ready ? "Ready to save draft" : `${readiness.missing.length} items missing`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-2">
            <BuyerSelect value={draft.buyerKey} buyers={buyers} onChange={applyBuyer} />
          </div>
          <Input
            label="Buyer name"
            value={draft.buyerName}
            onChange={(value) => setDraft({ ...draft, buyerName: value })}
          />
          <Input
            label="Company"
            value={draft.company}
            onChange={(value) => setDraft({ ...draft, company: value })}
          />
          <Input
            label="Destination"
            value={draft.destination}
            onChange={(value) => setDraft({ ...draft, destination: value })}
          />
          <Input
            label="Buyer email"
            value={draft.buyerEmail}
            type="email"
            onChange={(value) => setDraft({ ...draft, buyerEmail: value })}
          />
          <label className="space-y-2">
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
          <Input
            label="Valid until"
            type="date"
            value={draft.validUntil}
            onChange={(value) => setDraft({ ...draft, validUntil: value })}
          />
          <Input
            label="Incoterm"
            value={draft.incoterm}
            onChange={(value) => setDraft({ ...draft, incoterm: value })}
          />
          <div className="xl:col-span-2">
            <Input
              label="Shipping scope"
              value={draft.shippingScope}
              onChange={(value) => setDraft({ ...draft, shippingScope: value })}
            />
          </div>
          <div className="xl:col-span-2">
            <Input
              label="Payment terms"
              value={draft.paymentTerms}
              onChange={(value) => setDraft({ ...draft, paymentTerms: value })}
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-xl">Line items</h4>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  items: [
                    ...draft.items,
                    {
                      id: crypto.randomUUID(),
                      description: "",
                      quantity: 1,
                      unit: "piece",
                      unitPrice: 0,
                    },
                  ],
                })
              }
              className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-xs hover:border-gold"
            >
              <Plus size={13} /> Add item
            </button>
          </div>
          <div className="mt-3 space-y-2 overflow-x-auto">
            {draft.items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(180px,1fr)_90px_100px_120px_42px] gap-2 min-w-[650px]"
              >
                <input
                  value={item.description}
                  onChange={(event) => patchItem(item.id, { description: event.target.value })}
                  placeholder={`Item ${index + 1} description`}
                  className="min-h-11 bg-background border border-border/60 px-3 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(event) =>
                    patchItem(item.id, { quantity: Number(event.target.value) || 0 })
                  }
                  className="min-h-11 bg-background border border-border/60 px-2 text-sm"
                />
                <input
                  value={item.unit}
                  onChange={(event) => patchItem(item.id, { unit: event.target.value })}
                  className="min-h-11 bg-background border border-border/60 px-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(event) =>
                    patchItem(item.id, { unitPrice: Number(event.target.value) || 0 })
                  }
                  className="min-h-11 bg-background border border-border/60 px-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      items: draft.items.filter((row) => row.id !== item.id),
                    })
                  }
                  className="min-h-11 min-w-10 inline-flex items-center justify-center text-destructive"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <TextArea
            label="Commercial notes"
            value={draft.notes}
            onChange={(value) => setDraft({ ...draft, notes: value })}
          />
          <div className="border border-gold/35 bg-gold/5 p-4 space-y-3">
            <NumberInput
              label="Shipping amount"
              value={draft.shipping}
              step="0.01"
              onChange={(value) => setDraft({ ...draft, shipping: value })}
            />
            <NumberInput
              label="Discount amount"
              value={draft.discount}
              step="0.01"
              onChange={(value) => setDraft({ ...draft, discount: value })}
            />
            <div className="border-t border-border/60 pt-3 text-sm space-y-1">
              <Line label="Subtotal" value={`${draft.currency} ${totals.subtotal.toFixed(2)}`} />
              <Line label="Shipping" value={`${draft.currency} ${totals.shipping.toFixed(2)}`} />
              <Line label="Discount" value={`-${draft.currency} ${totals.discount.toFixed(2)}`} />
              <Line label="Total" value={`${draft.currency} ${totals.total.toFixed(2)}`} strong />
            </div>
          </div>
        </div>

        {!readiness.ready && (
          <p className="mt-4 text-xs text-amber-300">Missing: {readiness.missing.join(" · ")}</p>
        )}
        <button
          type="button"
          onClick={() => void saveQuotation()}
          disabled={busy || !readiness.ready}
          className="mt-5 min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"
        >
          <Save size={13} /> {busy ? "Saving…" : "Save quotation draft"}
        </button>
      </section>

      <section className="border border-border/60 bg-card/20 p-5 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">Quotation register</h3>
          <Badge label={`${quotations.length} records`} />
        </div>
        <div className="mt-5 space-y-3">
          {quotations.length === 0 ? (
            <Empty icon={<FileText size={28} />} text="No persistent quotations yet." />
          ) : (
            quotations.map((quote) => {
              const buyer = buyers.find(
                (row) => row.source === quote.source_type && row.sourceId === quote.source_id,
              );
              const count = quoteItems.filter((item) => item.quotation_id === quote.id).length;
              return (
                <article
                  key={quote.id}
                  className={`border p-4 ${
                    selectedId === quote.id ? "border-gold/60 bg-gold/5" : "border-border/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(quote.id)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-gold">
                          {quote.quotation_number} · {buyer?.reference || quote.source_type}
                        </p>
                        <p className="font-display text-xl mt-1">
                          {quote.company || quote.buyer_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {count} item{count === 1 ? "" : "s"} · valid until{" "}
                          {new Date(quote.valid_until).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="font-display text-2xl text-gold">
                          {quote.currency} {Number(quote.total_amount).toFixed(2)}
                        </p>
                        <Badge
                          label={QUOTATION_STATUS_LABELS[quote.status]}
                          tone={
                            quote.status === "accepted"
                              ? "good"
                              : quote.status === "rejected" || quote.status === "expired"
                                ? "warn"
                                : "neutral"
                          }
                        />
                      </div>
                    </div>
                  </button>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quote.status === "draft" && (
                      <Action
                        onClick={() => void transitionQuote(quote, "owner_review")}
                        icon={<ClipboardList size={13} />}
                      >
                        Owner review
                      </Action>
                    )}
                    {quote.status === "owner_review" && (
                      <Action
                        onClick={() => void transitionQuote(quote, "approved")}
                        icon={<ShieldCheck size={13} />}
                        primary
                      >
                        Owner approve
                      </Action>
                    )}
                    {quote.status === "approved" && (
                      <Action
                        onClick={() => void transitionQuote(quote, "sent")}
                        icon={<Send size={13} />}
                      >
                        Mark sent
                      </Action>
                    )}
                    {quote.status === "sent" && (
                      <>
                        <Action
                          onClick={() => void transitionQuote(quote, "accepted")}
                          icon={<CheckCircle2 size={13} />}
                        >
                          Accepted
                        </Action>
                        <Action
                          onClick={() => void transitionQuote(quote, "rejected")}
                          icon={<X size={13} />}
                        >
                          Rejected
                        </Action>
                      </>
                    )}
                    <Action
                      onClick={() => void copyQuoteMessage(quote)}
                      icon={<Copy size={13} />}
                    >
                      Copy message
                    </Action>
                    <Action onClick={() => printQuote(quote)} icon={<Printer size={13} />}>
                      Print / PDF
                    </Action>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {selectedQuote && <QuotationPrint quote={selectedQuote} items={selectedItems} />}
    </div>
  );
}

function QuotationPrint({
  quote,
  items,
}: {
  quote: QuotationRow;
  items: QuotationItemRow[];
}) {
  return (
    <section className="hidden print:block bg-white text-black p-8 font-sans">
      <div className="flex justify-between items-start border-b border-black/30 pb-6">
        <div>
          <h1 className="text-3xl font-bold">IRHA APPARELS</h1>
          <p className="text-sm mt-1">Custom B2B Apparel Manufacturing · Sialkot, Pakistan</p>
          <p className="text-sm">irhaapparelsofficial@gmail.com · irhaapparels.com</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase">Quotation</p>
          <p className="text-xl font-bold">{quote.quotation_number}</p>
          <p className="text-sm">Created {new Date(quote.created_at).toLocaleDateString()}</p>
          <p className="text-sm">Valid until {new Date(quote.valid_until).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 py-6">
        <div>
          <p className="text-xs uppercase text-black/60">Prepared for</p>
          <p className="font-bold mt-1">{quote.company || quote.buyer_name}</p>
          <p>{quote.buyer_name}</p>
          <p>{quote.destination_country || ""}</p>
          <p>{quote.buyer_email || ""}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-black/60">Commercial scope</p>
          <p className="mt-1">Currency: {quote.currency}</p>
          <p>Incoterm: {quote.incoterm}</p>
          <p>Shipping: {quote.shipping_scope}</p>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-black/30 text-left text-xs uppercase">
            <th className="py-3">Description</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Unit</th>
            <th className="text-right">Unit price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-black/15">
              <td className="py-3">{item.description}</td>
              <td className="text-right">{Number(item.quantity)}</td>
              <td className="text-right">{item.unit}</td>
              <td className="text-right">
                {quote.currency} {Number(item.unit_price).toFixed(2)}
              </td>
              <td className="text-right">
                {quote.currency} {Number(item.line_total).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto max-w-xs space-y-2">
        <Line label="Subtotal" value={`${quote.currency} ${Number(quote.subtotal).toFixed(2)}`} />
        <Line
          label="Shipping"
          value={`${quote.currency} ${Number(quote.shipping_amount).toFixed(2)}`}
        />
        <Line
          label="Discount"
          value={`-${quote.currency} ${Number(quote.discount_amount).toFixed(2)}`}
        />
        <Line
          label="Grand total"
          value={`${quote.currency} ${Number(quote.total_amount).toFixed(2)}`}
          strong
        />
      </div>

      <div className="mt-8 border-t border-black/30 pt-5">
        <p className="text-xs uppercase text-black/60">Payment terms</p>
        <p className="mt-1 whitespace-pre-wrap">{quote.payment_terms}</p>
        {quote.notes && (
          <>
            <p className="text-xs uppercase text-black/60 mt-5">Notes</p>
            <p className="mt-1 whitespace-pre-wrap">{quote.notes}</p>
          </>
        )}
      </div>
      <p className="mt-10 text-xs text-center">
        Terms apply only to this approved quotation and referenced requirement. Changes require written revision.
      </p>
    </section>
  );
}
