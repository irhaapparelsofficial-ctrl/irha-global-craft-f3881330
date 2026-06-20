import { CheckCircle2, AlertCircle, XCircle, ExternalLink } from "lucide-react";

const listings = [
  { platform: "Alibaba", status: "active", products: 24, views: "4.2k", url: "https://alibaba.com" },
  { platform: "Tradewheel", status: "active", products: 18, views: "1.8k", url: "https://tradewheel.com" },
  { platform: "Faire", status: "pending", products: 12, views: "0", url: "https://faire.com" },
  { platform: "Made-in-China", status: "inactive", products: 0, views: "—", url: "https://made-in-china.com" },
  { platform: "Etsy Wholesale", status: "active", products: 8, views: "920", url: "https://etsy.com" },
];

const statusIcon = {
  active: <CheckCircle2 size={14} className="text-emerald-400" />,
  pending: <AlertCircle size={14} className="text-orange-400" />,
  inactive: <XCircle size={14} className="text-muted-foreground" />,
};

export default function ListingsPanel() {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((l) => (
          <div key={l.platform} className="border border-border/60 bg-card/30 p-5 hover:border-gold/60 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-display text-xl text-gold">{l.platform}</h3>
              {statusIcon[l.status as keyof typeof statusIcon]}
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Status"><span className="capitalize">{l.status}</span></Row>
              <Row label="Products"><span className="tabular-nums">{l.products}</span></Row>
              <Row label="Monthly Views"><span className="tabular-nums">{l.views}</span></Row>
            </div>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gold hover:underline">
              Open Store <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-foreground/80">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
