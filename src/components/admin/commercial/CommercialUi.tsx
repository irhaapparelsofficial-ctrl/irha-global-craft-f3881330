import type { ReactNode } from "react";
import type { CommercialBuyerRef } from "@/lib/commercialHub";
import { commercialBuyerKey } from "@/hooks/useCommercialHub";

export function BuyerSelect({
  value,
  buyers,
  onChange,
}: {
  value: string;
  buyers: CommercialBuyerRef[];
  onChange: (key: string) => void;
}) {
  return (
    <label className="space-y-2 block">
      <span className="text-xs text-muted-foreground">Buyer record</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"
      >
        <option value="">Select buyer</option>
        {buyers.map((buyer) => (
          <option
            key={commercialBuyerKey(buyer.source, buyer.sourceId)}
            value={commercialBuyerKey(buyer.source, buyer.sourceId)}
          >
            {buyer.reference} · {buyer.company || buyer.name} · {buyer.product || "No product"}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label className="space-y-2 block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full bg-background border border-border/60 px-3 py-3 text-sm outline-none focus:border-gold resize-y"
      />
    </label>
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center border px-2.5 text-[9px] uppercase tracking-[0.14em] ${
        tone === "good"
          ? "border-emerald-500/50 text-emerald-300"
          : tone === "warn"
            ? "border-amber-500/50 text-amber-300"
            : "border-border/60 text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

export function Action({
  onClick,
  icon,
  children,
  primary = false,
  disabled = false,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-10 inline-flex items-center gap-2 px-3 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50 ${
        primary
          ? "bg-gradient-gold text-primary-foreground"
          : "border border-border/60 hover:border-gold hover:text-gold"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="py-12 text-center border border-dashed border-border/60 text-muted-foreground">
      <div className="flex justify-center text-gold">{icon}</div>
      <p className="text-sm mt-3">{text}</p>
    </div>
  );
}

export function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong ? "font-bold text-lg border-t border-current/20 pt-2 mt-2" : ""
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function downloadText(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
