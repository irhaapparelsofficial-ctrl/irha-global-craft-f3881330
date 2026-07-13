import type { ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";

export const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";

export function label(value: string) {
  return value.replace(/_/g, " ");
}

export function Metric({ label: text, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className="p-4 border-r border-b lg:border-b-0 border-border/60 last:border-r-0"><p className={`font-display text-2xl ${attention ? "text-amber-300" : "text-foreground"}`}>{value}</p><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">{text}</p></div>;
}

export function Mini({ label: text, value }: { label: string; value: number | string }) {
  return <div className="border border-border/50 p-2"><p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{text}</p><p className="text-sm mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p></div>;
}

export function RiskBadge({ risk }: { risk: "clear" | "attention" | "blocked" }) {
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${risk === "clear" ? "border-emerald-500/40 text-emerald-300" : risk === "blocked" ? "border-red-500/40 text-red-300" : "border-amber-500/40 text-amber-300"}`}>{risk}</span>;
}

export function Status({ value }: { value: string }) {
  const positive = ["passed", "closed", "verified", "approved"].includes(value);
  const negative = ["failed", "rework_required", "rejected", "critical", "blocked"].includes(value);
  return <span className={`border px-2 py-1 text-[8px] uppercase tracking-[0.1em] ${positive ? "border-emerald-500/35 text-emerald-300" : negative ? "border-red-500/35 text-red-300" : "border-border/60 text-muted-foreground"}`}>{label(value)}</span>;
}

export function FormCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="border border-border/60 bg-background/20 p-4"><h3 className="font-display text-xl inline-flex items-center gap-2">{icon}{title}</h3><div className="mt-4">{children}</div></section>;
}

export function ListCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="border border-border/60 bg-background/20 p-4"><h3 className="font-display text-xl inline-flex items-center gap-2">{icon}{title}</h3><div className="mt-4 space-y-3 max-h-[34rem] overflow-y-auto">{children}</div></section>;
}

export function Action({ onClick, busy, label: text }: { onClick: () => Promise<void>; busy: boolean; label: string }) {
  return <button type="button" onClick={() => void onClick()} disabled={busy} className="mt-4 min-h-11 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy ? <span className="inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Working…</span> : <span className="inline-flex items-center gap-2"><Plus size={13} /> {text}</span>}</button>;
}

export function Field({ label: text, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-[10px] uppercase tracking-[0.13em] text-muted-foreground">{text}<input type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${FIELD} mt-2`} /></label>;
}

export function Select({ label: text, value, onChange, options, optionLabel, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; optionLabel?: (value: string) => string; placeholder?: string }) {
  return <label className="block text-[10px] uppercase tracking-[0.13em] text-muted-foreground">{text}<select value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-2`}>{placeholder !== undefined && <option value="">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{optionLabel ? optionLabel(option) : label(option)}</option>)}</select></label>;
}

export function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`border border-dashed border-border/50 text-center text-xs text-muted-foreground ${compact ? "p-5" : "m-4 p-10"}`}>{text}</div>;
}

export function Loading() {
  return <div className="py-6 text-center text-xs text-muted-foreground"><Loader2 size={16} className="animate-spin inline mr-2" />Loading…</div>;
}
