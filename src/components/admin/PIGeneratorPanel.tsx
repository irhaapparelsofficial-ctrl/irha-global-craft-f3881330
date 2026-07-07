import { useMemo, useState } from "react";
import { FileText, Printer } from "lucide-react";

export default function PIGeneratorPanel() {
  const [client, setClient] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState(0);
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [terms, setTerms] = useState("");
  const [preview, setPreview] = useState(false);

  const total = useMemo(() => qty * price, [qty, price]);
  const piNo = useMemo(() => `PI-DRAFT-${Date.now().toString().slice(-6)}`, []);
  const canPreview = client.trim().length > 0 && product.trim().length > 0 && qty > 0 && price > 0;

  const print = () => {
    if (!canPreview) return;
    setPreview(true);
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="border border-border/60 bg-card/30 p-6 space-y-4 print:hidden">
        <h3 className="font-display text-xl text-gold flex items-center gap-2"><FileText size={18} /> New Proforma Invoice Draft</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Start from blank commercial terms. Review buyer details, quantity, price, delivery and payment terms before issuing any final PI.
        </p>
        <Field label="Client" value={client} onChange={setClient} />
        <Field label="Product" value={product} onChange={setProduct} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Qty" type="number" value={String(qty)} onChange={(v) => setQty(+v || 0)} />
          <Field label="Unit Price" type="number" value={String(price)} onChange={(v) => setPrice(+v || 0)} />
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm">
              {["USD", "EUR", "GBP", "AUD"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Commercial Terms</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={4}
            placeholder="Add approved payment, delivery, Incoterm and validity terms for this buyer…"
            className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-gold outline-none resize-y"
          />
        </div>
        {!canPreview && (
          <p className="text-[11px] text-amber-500">Client, product, quantity and unit price are required before preview or print.</p>
        )}
        <div className="flex gap-2 pt-2">
          <button disabled={!canPreview} onClick={() => setPreview(true)} className="flex-1 bg-gradient-gold text-background text-xs uppercase tracking-[0.25em] py-3 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Preview Draft</button>
          <button disabled={!canPreview} onClick={print} className="inline-flex items-center gap-2 border border-gold/60 text-gold text-xs uppercase tracking-[0.25em] px-4 py-3 hover:bg-gold hover:text-background disabled:opacity-40 disabled:cursor-not-allowed">
            <Printer size={12} /> Print Draft
          </button>
        </div>
      </div>

      {preview && canPreview && (
        <div className="border border-gold/40 bg-background p-8 print:border-0 print:p-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="font-display text-2xl text-gold">IRHA APPARELS</h2>
              <p className="text-xs text-muted-foreground mt-1">Sialkot, Pakistan · irhaapparels.com</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Proforma Invoice Draft</p>
              <p className="font-display text-lg text-gold">{piNo}</p>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Bill To</p>
            <p className="text-base">{client}</p>
          </div>
          <table className="w-full text-sm border-t border-b border-gold/40">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-gold/80">
                <th className="text-left py-3">Description</th>
                <th className="text-right py-3">Qty</th>
                <th className="text-right py-3">Unit</th>
                <th className="text-right py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/40">
                <td className="py-4">{product}</td>
                <td className="py-4 text-right tabular-nums">{qty}</td>
                <td className="py-4 text-right tabular-nums">{currency} {price.toFixed(2)}</td>
                <td className="py-4 text-right tabular-nums">{currency} {total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end mt-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Grand Total</p>
              <p className="font-display text-3xl text-gold">{currency} {total.toFixed(2)}</p>
            </div>
          </div>
          {terms.trim() && (
            <div className="mt-8 border-t border-border/40 pt-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Approved Commercial Terms</p>
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">{terms.trim()}</p>
            </div>
          )}
          <p className="text-[10px] text-amber-500 mt-8 text-center print:text-black">DRAFT — verify buyer details and commercial terms before issue.</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-gold outline-none" />
    </div>
  );
}