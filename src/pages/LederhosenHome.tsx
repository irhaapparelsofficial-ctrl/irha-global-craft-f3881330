import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { MessageCircle, ShieldCheck, Factory, Globe2, Award, Truck, X } from "lucide-react";
import { whatsappLink, BRAND } from "@/lib/constants";

import heroLederhosen from "@/assets/lederhosen/hero-lederhosen.jpg";
import heroBundhosen from "@/assets/lederhosen/hero-bundhosen.jpg";
import heroTrachten from "@/assets/lederhosen/hero-trachten.jpg";
import catLederhosen from "@/assets/lederhosen/cat-herren-lederhosen.jpg";
import catBundhosen from "@/assets/lederhosen/cat-herren-bundhosen.jpg";
import catDamen from "@/assets/lederhosen/cat-damen-trachten.jpg";
import catWesten from "@/assets/lederhosen/cat-herren-westen.jpg";
import catKinder from "@/assets/lederhosen/cat-kinder-trachten.jpg";
import catAccessories from "@/assets/lederhosen/cat-accessories.jpg";

type Lang = "en" | "de";

const t = {
  en: {
    nav: { products: "Collections", manufacturing: "Manufacturing", contact: "Contact" },
    eyebrow: "Direct Factory · Sialkot, Pakistan",
    headline: "Traditional Lederhosen Manufacturer from Pakistan – Direct Factory",
    sub: "OEM · ODM · Private Label · MOQ 50 · 45 Days Delivery",
    ctaQuote: "Request Quote",
    ctaWhatsApp: "WhatsApp Us",
    catEyebrow: "Our Collections",
    catTitle: "Six Heritage Categories, One Factory",
    promiseTitle: "Why brands choose Irha",
    promises: [
      { icon: Factory, t: "Direct Factory", d: "No middlemen. Manufactured in our own Sialkot atelier since 2014." },
      { icon: ShieldCheck, t: "Genuine Leather", d: "Full-grain cowhide & suede. Hand-embroidered Bavarian motifs." },
      { icon: Truck, t: "45 Days Delivery", d: "From tech-pack to FOB Karachi. Air & sea freight worldwide." },
      { icon: Award, t: "MOQ from 50", d: "Low minimum order quantity for new buyers and boutique brands." },
    ],
    countries: { title: "Serving wholesalers worldwide", items: ["Germany", "USA", "UK", "Australia", "Austria", "Switzerland"] },
    contactTitle: "Start your order today",
    contactSub: "Send your tech-pack or sketches. We reply within 12 hours.",
    foot: "© " + new Date().getFullYear() + " Irha Apparels · Sialkot, Pakistan",
    popup: {
      title: "🇩🇪 Hallo aus Sialkot!",
      body: "Sie scheinen aus Deutschland zu kommen. Möchten Sie unsere deutsche Seite besuchen?",
      yes: "Ja, zur deutschen Seite",
      no: "Continue in English",
    },
  },
  de: {
    nav: { products: "Kollektionen", manufacturing: "Herstellung", contact: "Kontakt" },
    eyebrow: "Direkte Fabrik · Sialkot, Pakistan",
    headline: "Traditioneller Lederhosen Hersteller aus Pakistan – Direkt ab Werk",
    sub: "OEM · ODM · Eigenmarke · MOQ 50 · 45 Tage Lieferung",
    ctaQuote: "Angebot anfordern",
    ctaWhatsApp: "WhatsApp",
    catEyebrow: "Unsere Kollektionen",
    catTitle: "Sechs Trachten-Kategorien, eine Manufaktur",
    promiseTitle: "Warum Marken Irha wählen",
    promises: [
      { icon: Factory, t: "Direkt vom Hersteller", d: "Keine Zwischenhändler. Eigene Manufaktur in Sialkot seit 2014." },
      { icon: ShieldCheck, t: "Echtes Leder", d: "Vollnarbiges Rindsleder & Wildleder. Handbestickte bayerische Motive." },
      { icon: Truck, t: "45 Tage Lieferung", d: "Vom Tech-Pack bis FOB Karachi. Luft- und Seefracht weltweit." },
      { icon: Award, t: "MOQ ab 50", d: "Niedrige Mindestbestellmenge für neue Käufer und Boutique-Marken." },
    ],
    countries: { title: "Großhändler weltweit", items: ["Deutschland", "USA", "UK", "Australien", "Österreich", "Schweiz"] },
    contactTitle: "Starten Sie Ihre Bestellung",
    contactSub: "Senden Sie Ihr Tech-Pack oder Skizzen. Wir antworten innerhalb von 12 Stunden.",
    foot: "© " + new Date().getFullYear() + " Irha Apparels · Sialkot, Pakistan",
    popup: { title: "🇩🇪 Hallo aus Sialkot!", body: "Sie scheinen aus Deutschland zu kommen.", yes: "Deutsche Seite", no: "English" },
  },
};

const slides = [
  { src: heroLederhosen, en: "Herren Lederhosen", de: "Herren Lederhosen" },
  { src: heroBundhosen, en: "Herren Bundhosen", de: "Herren Bundhosen" },
  { src: heroTrachten, en: "Damen Trachten", de: "Damen Trachten" },
];

const categoriesData = [
  { id: "herren-lederhosen", img: catLederhosen, en: "Herren Lederhosen", de: "Herren Lederhosen" },
  { id: "herren-bundhosen", img: catBundhosen, en: "Herren Bundhosen", de: "Herren Bundhosen" },
  { id: "damen-trachten", img: catDamen, en: "Damen Trachten", de: "Damen Trachten" },
  { id: "herren-westen", img: catWesten, en: "Herren Westen", de: "Herren Westen" },
  { id: "kinder-trachten", img: catKinder, en: "Kinder Trachten", de: "Kinder Trachten" },
  { id: "accessories", img: catAccessories, en: "Accessories", de: "Accessoires" },
];

export default function LederhosenHome() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored) return stored;
    const path = window.location.pathname;
    return path.startsWith("/de") ? "de" : "en";
  });
  const [slide, setSlide] = useState(0);
  const [showDePopup, setShowDePopup] = useState(false);

  useEffect(() => { localStorage.setItem("lang", lang); document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  // Germany detection popup (simple timezone heuristic, GDPR-friendly — no IP API)
  useEffect(() => {
    if (localStorage.getItem("de_popup_seen")) return;
    if (lang === "de") return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = (navigator.language || "").toLowerCase();
    const isDe = tz === "Europe/Berlin" || locale.startsWith("de");
    if (isDe) setShowDePopup(true);
  }, [lang]);

  const L = t[lang];

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Manufacturer",
    name: BRAND.name,
    url: "https://www.irhaapparels.com/",
    description: "Traditional Lederhosen, Bundhosen and Trachten manufacturer from Sialkot, Pakistan. OEM, ODM, private label. MOQ 50, 45 days delivery worldwide.",
    address: { "@type": "PostalAddress", addressLocality: "Sialkot", addressCountry: "PK" },
    telephone: BRAND.phone,
    areaServed: ["DE", "US", "GB", "AU", "AT", "CH"],
    sameAs: ["https://www.instagram.com/irhaapparels", "https://www.facebook.com/irhaapparels"],
  }), []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#D4AF37] selection:text-black">
      <Helmet>
        <title>{lang === "de" ? "Lederhosen Hersteller Pakistan – Irha Apparels" : "Lederhosen Manufacturer Pakistan – Irha Apparels"}</title>
        <meta name="description" content={lang === "de"
          ? "Lederhosen Hersteller aus Pakistan. OEM, ODM, Eigenmarke. MOQ 50. Direkte Fabrik in Sialkot. Lieferung in 45 Tagen weltweit."
          : "Lederhosen, Bundhosen & Trachten manufacturer from Pakistan. OEM, ODM, private label. MOQ 50. Direct factory in Sialkot. 45 days delivery worldwide."} />
        <link rel="canonical" href={`https://www.irhaapparels.com/${lang === "de" ? "de/" : ""}`} />
        <meta property="og:title" content={lang === "de" ? "Lederhosen Hersteller Pakistan" : "Lederhosen Manufacturer Pakistan"} />
        <meta property="og:url" content={`https://www.irhaapparels.com/${lang === "de" ? "de/" : ""}`} />
        <meta property="og:type" content="website" />
        <link rel="alternate" hrefLang="en" href="https://www.irhaapparels.com/" />
        <link rel="alternate" hrefLang="de" href="https://www.irhaapparels.com/de/" />
        <link rel="alternate" hrefLang="x-default" href="https://www.irhaapparels.com/" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* TOP BAR */}
      <header className="fixed top-0 inset-x-0 z-40 bg-black/85 backdrop-blur-md border-b border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="font-serif text-xl tracking-[0.2em] text-[#D4AF37]">IRHA</a>
          <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.3em] text-white/70">
            <a href="#collections" className="hover:text-[#D4AF37] transition-colors">{L.nav.products}</a>
            <a href="#manufacturing" className="hover:text-[#D4AF37] transition-colors">{L.nav.manufacturing}</a>
            <a href="#contact" className="hover:text-[#D4AF37] transition-colors">{L.nav.contact}</a>
          </nav>
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang === "en" ? "text-[#D4AF37]" : "text-white/50 hover:text-white"}`}>🇬🇧 EN</button>
            <span className="text-white/30">|</span>
            <button onClick={() => setLang("de")} className={`px-2 py-1 rounded ${lang === "de" ? "text-[#D4AF37]" : "text-white/50 hover:text-white"}`}>🇩🇪 DE</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative h-[100svh] min-h-[640px] overflow-hidden pt-16">
        {slides.map((s, i) => (
          <img
            key={i}
            src={s.src}
            alt={lang === "de" ? s.de : s.en}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === slide ? "opacity-60" : "opacity-0"}`}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black" />

        <div className="relative h-full max-w-7xl mx-auto px-5 flex flex-col justify-end pb-20 md:pb-28">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-[#D4AF37] mb-4">{L.eyebrow}</p>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight max-w-4xl">{L.headline}</h1>
          <p className="mt-5 text-sm md:text-base text-white/80 tracking-wide max-w-2xl">{L.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 text-xs uppercase tracking-[0.25em] font-medium hover:bg-[#e5c14a] transition-colors">
              {L.ctaQuote}
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#D4AF37]/60 text-[#D4AF37] px-6 py-3 text-xs uppercase tracking-[0.25em] hover:bg-[#D4AF37] hover:text-black transition-colors">
              <MessageCircle size={14} /> {L.ctaWhatsApp}
            </a>
          </div>

          {/* slide dots */}
          <div className="mt-10 flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                className={`h-[2px] transition-all ${i === slide ? "w-12 bg-[#D4AF37]" : "w-6 bg-white/30"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="collections" className="py-24 md:py-32 px-5">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] mb-3">{L.catEyebrow}</p>
          <h2 className="font-serif text-3xl md:text-5xl mb-12 max-w-2xl">{L.catTitle}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {categoriesData.map((c) => (
              <a key={c.id} href="#contact"
                className="group relative aspect-[4/5] overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all">
                <img src={c.img} alt={lang === "de" ? c.de : c.en} loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:from-[#D4AF37]/30 group-hover:via-black/30 transition-all" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-serif text-xl md:text-2xl group-hover:text-[#D4AF37] transition-colors">{lang === "de" ? c.de : c.en}</h3>
                  <span className="mt-2 inline-block text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity">
                    {lang === "de" ? "Anfragen →" : "Enquire →"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PROMISES */}
      <section id="manufacturing" className="py-24 px-5 border-t border-[#D4AF37]/15 bg-gradient-to-b from-black to-zinc-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-16">{L.promiseTitle}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {L.promises.map((p, i) => (
              <div key={i} className="p-6 border border-white/10 hover:border-[#D4AF37]/60 transition-colors text-center">
                <p.icon className="mx-auto text-[#D4AF37] mb-4" size={28} />
                <h3 className="font-serif text-lg text-[#D4AF37] mb-2">{p.t}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COUNTRIES */}
      <section className="py-20 px-5 border-t border-[#D4AF37]/15">
        <div className="max-w-5xl mx-auto text-center">
          <Globe2 className="mx-auto text-[#D4AF37] mb-4" size={24} />
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 mb-6">{L.countries.title}</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 font-serif text-lg md:text-xl text-white/80">
            {L.countries.items.map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 px-5 border-t border-[#D4AF37]/15">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-5xl text-[#D4AF37] mb-4">{L.contactTitle}</h2>
          <p className="text-white/70 mb-10">{L.contactSub}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 text-xs uppercase tracking-[0.25em] hover:bg-[#e5c14a]">
              <MessageCircle size={14} /> WhatsApp {BRAND.phoneDisplay}
            </a>
            <a href={`mailto:${BRAND.email}`}
              className="inline-flex items-center gap-2 border border-[#D4AF37]/60 text-[#D4AF37] px-6 py-3 text-xs uppercase tracking-[0.25em] hover:bg-[#D4AF37] hover:text-black">
              {BRAND.email}
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-5 text-center text-xs text-white/50 border-t border-[#D4AF37]/10">
        {L.foot}
      </footer>

      {/* Floating WhatsApp */}
      <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
        <MessageCircle className="text-white" size={26} />
      </a>

      {/* Germany popup */}
      {showDePopup && (
        <div className="fixed bottom-5 left-5 z-50 max-w-sm bg-zinc-950 border border-[#D4AF37]/60 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <button onClick={() => { setShowDePopup(false); localStorage.setItem("de_popup_seen", "1"); }}
            aria-label="Close" className="absolute top-2 right-2 text-white/50 hover:text-white">
            <X size={16} />
          </button>
          <h3 className="font-serif text-lg text-[#D4AF37] mb-2">{t.en.popup.title}</h3>
          <p className="text-sm text-white/80 mb-4">{t.en.popup.body}</p>
          <div className="flex gap-2">
            <button onClick={() => { setLang("de"); setShowDePopup(false); localStorage.setItem("de_popup_seen", "1"); }}
              className="flex-1 bg-[#D4AF37] text-black text-[11px] uppercase tracking-[0.25em] py-2.5 hover:bg-[#e5c14a]">
              {t.en.popup.yes}
            </button>
            <button onClick={() => { setShowDePopup(false); localStorage.setItem("de_popup_seen", "1"); }}
              className="flex-1 border border-white/30 text-white/80 text-[11px] uppercase tracking-[0.25em] py-2.5 hover:border-white">
              {t.en.popup.no}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
