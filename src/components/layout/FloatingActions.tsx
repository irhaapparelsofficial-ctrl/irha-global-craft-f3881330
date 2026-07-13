import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { settingsWhatsappLink } from "@/lib/siteSettings";

export default function FloatingActions() {
  const { data: settings } = useSiteSettings();

  return (
    <a
      href={settingsWhatsappLink(settings)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Discuss a B2B manufacturing requirement on WhatsApp"
      title="Discuss your requirement on WhatsApp"
      data-track="whatsapp-floating"
      className="fixed bottom-6 right-6 z-50 hidden h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#25D366] text-white shadow-elegant transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:inline-flex"
    >
      <MessageCircle size={20} />
    </a>
  );
}
