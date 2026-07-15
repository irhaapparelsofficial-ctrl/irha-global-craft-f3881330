import { Navigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import LeadPriorityQueue from "@/components/admin/LeadPriorityQueue";
import LeadReviewActivationPanel from "@/components/admin/LeadReviewActivationPanel";

export default function AdminLeadReview() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Checking owner access…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Admin access is required.</div>;

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-6 lg:p-8">
      <SEO title="Lead Review & CRM Activation — Irha Apparels" description="Private owner candidate validation and CRM activation workspace." path="/admin/lead-review" noindex />
      <div className="mx-auto max-w-[1700px] space-y-5">
        <div className="flex flex-wrap gap-2">
          <a href="/admin" className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><ArrowLeft size={12} /> Main admin</a>
          <a href="/admin/lead-intake" className="inline-flex min-h-11 items-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold hover:text-background"><Upload size={12} /> Bulk lead intake</a>
        </div>
        <LeadPriorityQueue />
        <div id="lead-review-workspace" className="scroll-mt-4">
          <LeadReviewActivationPanel />
        </div>
      </div>
    </main>
  );
}
