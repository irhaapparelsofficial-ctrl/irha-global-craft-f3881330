import { ArrowRight, ListChecks, MessageSquareText, Send, ShieldCheck, UserSearch } from "lucide-react";
import type { AdminView } from "./AdminShell";

type OwnerGrowthStartProps = {
  go: (view: AdminView) => void;
};

type ActionCardProps = {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  accent?: "gold" | "emerald";
};

function ActionCard({ step, title, description, icon, onClick, href, accent = "gold" }: ActionCardProps) {
  const className = [
    "group flex min-h-40 w-full flex-col justify-between rounded-xl border p-5 text-left transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
    accent === "emerald"
      ? "border-emerald-500/45 bg-emerald-500/[0.06] hover:border-emerald-400 hover:bg-emerald-500/[0.1]"
      : "border-gold/35 bg-card/45 hover:border-gold/75 hover:bg-gold/[0.06]",
  ].join(" ");

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className={accent === "emerald" ? "text-emerald-300" : "text-gold"}>{icon}</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{step}</span>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl leading-tight">{title}</h3>
          <ArrowRight size={16} className="shrink-0 opacity-55 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/65">{description}</p>
      </div>
    </>
  );

  if (href) {
    return <a href={href} className={className}>{content}</a>;
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function OwnerGrowthStart({ go }: OwnerGrowthStartProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-card/85 via-card/55 to-gold/[0.04] p-5 shadow-xl shadow-black/10 md:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-2">Start here every day</p>
          <h2 className="font-display text-3xl md:text-4xl">Your 4 Business Growth Actions</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/65">
            Buyers dhoondhein, real leads review karein, outreach prepare karein, ya website par waiting buyer ko foran reply karein.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/[0.07] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
          <ShieldCheck size={14} /> Safe owner approvals active
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          step="1 · Grow pipeline"
          title="Find New Buyers"
          description="Potential importers, wholesalers, distributors and private-label brands discover karein."
          icon={<UserSearch size={23} />}
          onClick={() => go("lead_engine")}
        />
        <ActionCard
          step="2 · Check quality"
          title="Review Ready Leads"
          description="Website, buyer fit, contact evidence aur duplicates check karke sirf useful leads select karein."
          icon={<ListChecks size={23} />}
          href="/admin/lead-review"
        />
        <ActionCard
          step="3 · Start contact"
          title="Contact Buyers"
          description="AI se personalized email drafts prepare karein. Aapki approval ke baghair kuch send nahi hota."
          icon={<Send size={23} />}
          onClick={() => go("mailing")}
        />
        <ActionCard
          step="4 · Reply now"
          title="Live Chat"
          description="Website buyer messages khol kar exact conversation mein foran reply karein."
          icon={<MessageSquareText size={23} />}
          href="/admin/live-chat"
          accent="emerald"
        />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/60 bg-background/35 p-4 text-xs leading-relaxed text-foreground/65">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold" />
        <p>
          <strong className="text-foreground">Automatic:</strong> buyer discovery aur safe verification. <strong className="text-foreground">Aapki approval:</strong> CRM import, email/WhatsApp send, quotation, price commitment aur public post.
        </p>
      </div>
    </section>
  );
}
