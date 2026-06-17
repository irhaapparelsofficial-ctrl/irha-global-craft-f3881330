import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

export default function FloatingActions() {
  return (
    <>
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 bg-[#25D366] text-white rounded-full pl-4 pr-5 py-3.5 shadow-elegant hover:scale-105 transition-transform"
      >
        <MessageCircle size={20} />
        <span className="text-xs font-medium uppercase tracking-[0.2em] hidden sm:inline">
          WhatsApp
        </span>
      </a>
      <Link
        to="/inquiry"
        className="fixed bottom-6 left-6 z-40 hidden md:inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium shadow-gold hover:scale-105 transition-transform"
      >
        Get Instant Quote
      </Link>
    </>
  );
}
