// Animated "Trusted by" marquee. Renders text-based brand-style marks (no real client logos).
const BRANDS = [
  "NORD/ATELIER", "MAISON KÜHLER", "AURORA SPORT", "BAYERN HAUS",
  "RIVERA & CO.", "DUNE DUBAI", "LONDON LANE", "VERITÀ MILANO",
  "STÜDIO BERLIN", "PACIFIC NORTH", "HEIRLOOM NYC", "MONTE LUXE",
];

export default function ClientsMarquee() {
  return (
    <section className="py-12 md:py-16 border-y border-border/60 bg-background overflow-hidden">
      <div className="container-luxe">
        <p className="eyebrow justify-center inline-flex w-full mb-8 text-center">
          Trusted by 80+ brands in 30+ countries
        </p>
      </div>
      <div className="flex whitespace-nowrap animate-marquee">
        {Array.from({ length: 2 }).map((_, k) => (
          <div key={k} className="flex shrink-0 items-center gap-14 px-7">
            {BRANDS.map((b) => (
              <span
                key={`${k}-${b}`}
                className="font-display text-xl md:text-2xl tracking-[0.2em] text-foreground/35 hover:text-primary transition-colors"
              >
                {b}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
