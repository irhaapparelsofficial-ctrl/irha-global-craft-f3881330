import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Sparkles } from "lucide-react";
import { useGlobalSettings } from "@/hooks/useSiteConfiguration";
import { globalWhatsappLink } from "@/lib/siteConfiguration";

export default function FloatingActions() {
  const { pathname } = useLocation();
  const { data: settings } = useGlobalSettings();
  const onStudio = pathname === "/studio";

  return (
    <>
      {!onStudio && (
        <Link
          to="/studio"
          aria-label="Launch AI Mockup Studio"
          data-track="floating-ai-designer"
          className="hidden md:inline-flex fixed z-40 group bg-gradient-gold text-primary-foreground shadow-gold hover:scale-105 transition-all md:bottom-[6.25rem] md:right-6 md:rounded-full md:pl-4 md:pr-5 md:py-3 items-center"
        >
          <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] ml-2">AI Designer</span>
        </Link>
      )}

      <a
        href={globalWhatsappLink(settings)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Chat on WhatsApp"
        data-track="whatsapp-floating"
        className="hidden md:inline-flex fixed bottom-6 right-6 z-40 group items-center gap-3 bg-[#25D366] text-white rounded-full pl-4 pr-5 py-3.5 shadow-elegant hover:scale-105 transition-transform"
      >
        <MessageCircle size={20} />
        <span className="text-xs font-medium uppercase tracking-[0.2em]">WhatsApp</span>
      </a>
    </>
  );
}
