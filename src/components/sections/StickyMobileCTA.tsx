import { Link } from "react-router-dom";
import { MessageCircle, Send } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

export default function StickyMobileCTA() {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-2 border-t border-border/60 bg-background/95 backdrop-blur">
      <Link
        to="/inquiry"
        className="flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium"
      >
        <Send size={14} /> Get Quote
      </Link>
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 bg-card border-l border-border/60 py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium text-foreground"
      >
        <MessageCircle size={14} className="text-[#25D366]" /> WhatsApp
      </a>
    </div>
  );
}
