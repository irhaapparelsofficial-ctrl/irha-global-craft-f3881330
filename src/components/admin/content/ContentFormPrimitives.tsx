import type { ReactNode } from "react";
import { X } from "lucide-react";

export function EditorModal({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  maxWidth = "max-w-4xl",
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/85 backdrop-blur-sm p-3 md:p-8">
      <div className={`mx-auto w-full ${maxWidth} border border-border/60 bg-card shadow-2xl`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/60 bg-card/95 px-4 md:px-6 py-4">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
            <h3 className="font-display text-xl md:text-2xl mt-1 truncate">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Close editor">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 md:p-6">{children}</div>
        <div className="sticky bottom-0 border-t border-border/60 bg-card/95 px-4 md:px-6 py-4 flex flex-wrap items-center justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: "text" | "number" | "url";
  required?: boolean;
}) {
  const textValue = String(value ?? "");
  return (
    <label className="block min-w-0">
      <span className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        <span>{label}{required ? " *" : ""}</span>
        {maxLength && <span>{textValue.length}/{maxLength}</span>}
      </span>
      <input
        type={type}
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  maxLength,
  placeholder,
  required = false,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        <span>{label}{required ? " *" : ""}</span>
        {maxLength && <span>{value.length}/{maxLength}</span>}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`w-full border border-border/60 bg-background px-3 py-3 text-sm leading-relaxed outline-none focus:border-gold resize-y ${mono ? "font-mono text-xs" : ""}`}
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  return (
    <label className="flex items-start gap-3 border border-border/50 bg-background/35 p-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">{description}</span>}
      </span>
    </label>
  );
}

export function StatusBadge({ published, noindex }: { published: boolean; noindex?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`text-[9px] uppercase tracking-[0.15em] border px-2 py-1 ${published ? "border-emerald-500/45 text-emerald-400" : "border-border/60 text-muted-foreground"}`}>
        {published ? "Published" : "Draft"}
      </span>
      {noindex && <span className="text-[9px] uppercase tracking-[0.15em] border border-amber-500/45 text-amber-300 px-2 py-1">Noindex</span>}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="min-h-11 bg-gradient-gold text-background px-5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">{children}</button>;
}

export function SecondaryButton({ children, onClick, disabled, danger = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 border px-4 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50 ${danger ? "border-destructive/50 text-destructive hover:border-destructive" : "border-border/60 hover:border-gold hover:text-gold"}`}>{children}</button>;
}
