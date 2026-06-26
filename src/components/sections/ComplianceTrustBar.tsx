import { ShieldCheck, BadgeCheck, Award, ClipboardCheck, FlaskConical, Check } from "lucide-react";
import { Link } from "react-router-dom";

const ITEMS = [
  { Icon: ShieldCheck, name: "OEKO-TEX® 100", note: "Compliant Fabrics", status: "compliant" as const },
  { Icon: ClipboardCheck, name: "BSCI Audited", note: "In Progress", status: "progress" as const },
  { Icon: Award, name: "ISO 9001:2015", note: "Quality Management", status: "compliant" as const },
  { Icon: BadgeCheck, name: "SEDEX Member", note: "Social Audit", status: "compliant" as const },
  { Icon: FlaskConical, name: "REACH", note: "EU Compliant", status: "compliant" as const },
];

export default function ComplianceTrustBar() {
  return (
    <section
      aria-label="Certifications & compliance"
      className="bg-[#0A0A0A] border-y border-border/60 py-6 md:py-7"
    >
      <div className="container-luxe">
        <div className="flex items-center justify-between gap-4 mb-4 md:mb-5">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-foreground/55">
            Certifications & Compliance
          </p>
          <Link
            to="/compliance"
            className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-gold hover:text-gold/80 transition-colors"
          >
            View all →
          </Link>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {ITEMS.map(({ Icon, name, note, status }) => (
            <li
              key={name}
              className="flex items-start gap-3 border border-foreground/10 bg-foreground/[0.02] px-3 py-3 md:px-4 md:py-3.5 hover:border-gold/40 transition-colors"
            >
              <div className="relative shrink-0">
                <Icon size={22} strokeWidth={1.4} className="text-foreground/55" />
                <span
                  className={`absolute -bottom-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full ${
                    status === "compliant"
                      ? "bg-gold text-[#0A0A0A]"
                      : "bg-foreground/30 text-[#0A0A0A]"
                  }`}
                  aria-hidden
                >
                  <Check size={9} strokeWidth={3} />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-medium text-foreground/90 truncate">
                  {name}
                </p>
                <p
                  className={`text-[10px] md:text-[11px] mt-0.5 ${
                    status === "compliant" ? "text-foreground/55" : "text-gold/80"
                  }`}
                >
                  {note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
