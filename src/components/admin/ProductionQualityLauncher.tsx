import { useEffect, useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ProductionQualityPanel from "@/components/admin/ProductionQualityPanel";

export default function ProductionQualityLauncher() {
  const { pathname } = useLocation();
  const { isAdmin, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  if (pathname !== "/admin" || loading || !isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-5 z-[65] min-h-12 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-background/95 px-4 text-[10px] uppercase tracking-[0.14em] text-gold shadow-2xl backdrop-blur hover:bg-gold/10"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ClipboardCheck size={15} /> Quality Control
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Production quality control workspace">
          <div className="sticky top-0 z-10 min-h-16 border-b border-border/60 bg-background/95 backdrop-blur flex items-center justify-between gap-4 px-4 md:px-7">
            <div>
              <p className="font-display text-lg text-gold">IRHA QUALITY CONTROL</p>
              <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Private factory workspace · owner controlled</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 hover:border-gold" aria-label="Close quality control workspace"><X size={17} /></button>
          </div>
          <main className="p-3 md:p-6 max-w-[1800px] mx-auto">
            <ProductionQualityPanel />
          </main>
        </div>
      )}
    </>
  );
}
