import { Users, Mail, FileText, Globe2, TrendingUp } from "lucide-react";

const cards = [
  { label: "Total Leads", value: 248, change: "+12%", icon: Users },
  { label: "Emails Sent", value: 1542, change: "+8%", icon: Mail },
  { label: "PI Generated", value: 87, change: "+23%", icon: FileText },
  { label: "Active Listings", value: 14, change: "+2", icon: Globe2 },
];

export default function HomePanel() {
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-gold/30 bg-gradient-to-br from-card/80 to-background p-6 hover:border-gold transition-colors">
            <div className="flex items-start justify-between mb-6">
              <c.icon className="text-gold" size={22} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 inline-flex items-center gap-1">
                <TrendingUp size={10} /> {c.change}
              </span>
            </div>
            <p className="font-display text-4xl text-gold tabular-nums">{c.value.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-2">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border/60 bg-card/30 p-6">
          <h3 className="font-display text-xl mb-4 text-gold">Recent Activity</h3>
          <ul className="space-y-3 text-sm">
            {[
              { t: "New lead", d: "Hans Müller (Germany) — Lederhosen 200pcs", time: "2h ago" },
              { t: "PI sent", d: "PI-0087 → Trachten GmbH €12,400", time: "5h ago" },
              { t: "Email campaign", d: "DE wholesalers · 320 recipients", time: "1d ago" },
              { t: "Listing updated", d: "Alibaba — new Bundhosen variant", time: "2d ago" },
            ].map((a, i) => (
              <li key={i} className="flex justify-between gap-4 border-b border-border/40 pb-2 last:border-0">
                <div>
                  <p className="text-gold/90 text-xs uppercase tracking-[0.2em]">{a.t}</p>
                  <p className="text-foreground/80">{a.d}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border/60 bg-card/30 p-6">
          <h3 className="font-display text-xl mb-4 text-gold">Leads by Country</h3>
          <div className="space-y-3">
            {[
              ["Germany", 112], ["USA", 54], ["UK", 38], ["Australia", 24], ["Austria", 20],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{k}</span><span className="text-muted-foreground tabular-nums">{v}</span>
                </div>
                <div className="h-1.5 bg-secondary/60 overflow-hidden">
                  <div className="h-full bg-gradient-gold" style={{ width: `${((v as number) / 112) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
