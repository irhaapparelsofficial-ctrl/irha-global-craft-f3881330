import { useState, ReactNode } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import MockupRequestModal from "./MockupRequestModal";

interface Props {
  variant?: "primary" | "outline" | "nav" | "navMobile";
  className?: string;
  children?: ReactNode;
}

/**
 * Permanent CTA button that opens the Custom Mockup Request modal.
 * Hardcoded into Navbar + Hero so layout refactors won't drop it.
 */
export default function MockupRequestButton({ variant = "primary", className, children }: Props) {
  const [open, setOpen] = useState(false);

  const styles: Record<NonNullable<Props["variant"]>, string> = {
    primary:
      "inline-flex items-center gap-3 bg-background text-gold border-2 border-gold px-8 py-4 text-xs uppercase tracking-[0.3em] font-medium hover:bg-gold hover:text-primary-foreground hover:shadow-gold transition-all",
    outline:
      "inline-flex items-center gap-2 border-2 border-gold/70 text-gold px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-gold hover:text-primary-foreground transition-all",
    nav: "inline-flex items-center gap-2 border border-gold/60 text-gold px-4 py-2.5 text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-gold/10 hover:border-gold transition-all",
    navMobile:
      "inline-flex w-fit items-center gap-2 border border-gold/60 text-gold px-5 py-2.5 text-[11px] uppercase tracking-[0.25em]",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(styles[variant], className)}
        data-track="mockup-request"
      >
        <Pencil size={14} />
        {children ?? "Request Mockup"}
      </button>
      <MockupRequestModal open={open} onOpenChange={setOpen} />
    </>
  );
}
