import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  BUSINESS_RULES_STORAGE_KEY,
  businessRulesApproved,
  businessRulesReadiness,
  loadBusinessRules,
  type BusinessRulesMaster,
} from "@/lib/businessRules";

export default function AIRulesEnforcementStatus() {
  const [rules, setRules] = useState<BusinessRulesMaster>(() => loadBusinessRules());
  const readiness = useMemo(() => businessRulesReadiness(rules), [rules]);
  const approved = businessRulesApproved(rules);

  useEffect(() => {
    const refresh = () => setRules(loadBusinessRules());
    window.addEventListener("focus", refresh);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === BUSINESS_RULES_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <section className={`mb-5 border p-4 md:p-5 ${approved ? "border-emerald-500/35 bg-emerald-500/[0.06]" : "border-amber-500/35 bg-amber-500/[0.06]"}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {approved ? <CheckCircle2 size={20} className="text-emerald-300 shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="text-amber-300 shrink-0 mt-0.5" />}
          <div>
            <p className={`text-[10px] uppercase tracking-[0.18em] ${approved ? "text-emerald-300" : "text-amber-300"}`}>
              {approved ? "Approved business rules" : "Plan-only safety mode"}
            </p>
            <h2 className="font-display text-xl md:text-2xl mt-1">
              {approved ? "AI may create guarded actions within the authority matrix." : "AI may plan and draft, but external/commercial execution remains locked."}
            </h2>
            <p className="text-xs text-foreground/62 mt-2 leading-relaxed max-w-4xl">
              {approved
                ? `Rules v${rules.version} are locally approved at ${readiness.score}% readiness. The final backend activation must copy this approval into the admin-only rules table before server-side operate mode is enabled.`
                : `Readiness ${readiness.score}%. Missing: ${readiness.missing.length ? readiness.missing.join(", ") : "owner approval"}. Complete Admin → AI → Business Rules; unknown facts must be escalated, not guessed.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Status icon={<ShieldCheck size={12} />} label={`Rules ${readiness.score}%`} active={readiness.score === 100} />
          <Status icon={<LockKeyhole size={12} />} label={approved ? "Operate guarded" : "Plan only"} active={approved} />
        </div>
      </div>
    </section>
  );
}

function Status({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span className={`min-h-9 inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${active ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>
      {icon}{label}
    </span>
  );
}
