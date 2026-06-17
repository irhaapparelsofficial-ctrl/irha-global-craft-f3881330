import { useEffect, useRef, useState } from "react";

const KPIS = [
  { value: 500, suffix: "+", label: "Industrial Machines" },
  { value: 350, suffix: "+", label: "Skilled Artisans" },
  { value: 2, suffix: "M+", label: "Units / Year Capacity" },
  { value: 30, suffix: "+", label: "Export Countries" },
  { value: 12, suffix: "+", label: "Years of Heritage" },
  { value: 98, suffix: "%", label: "QC Pass Rate" },
];

function CounterCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const duration = 1500;
            const start = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setN(Math.round(value * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center md:text-left">
      <p className="font-display text-5xl md:text-6xl lg:text-7xl text-gold tabular-nums">
        {n}
        {suffix}
      </p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function KpiCounters() {
  return (
    <section className="py-24 md:py-32 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow mb-4">By the Numbers</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
              A factory built for <span className="text-gold italic">global scale</span>.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-12 gap-x-6">
          {KPIS.map((k) => (
            <CounterCard key={k.label} {...k} />
          ))}
        </div>
      </div>
    </section>
  );
}
