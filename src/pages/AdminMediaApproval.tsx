import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SITE_MEDIA_PLACEMENT_MANIFEST, placementKey } from "@/lib/siteMediaPlacementManifest";

type AuditRow = { verification_status: string; total: number; social_approved_count: number };
type SlotMediaRow = {
  id: string;
  reference_code: string;
  role: string;
  sort_order: number;
  is_required: boolean;
  approved: boolean;
  mapping_confidence: string;
  media_asset_id: string;
};
type PlacementRow = {
  id: string;
  page_type: string;
  page_slug: string;
  role: string;
  active: boolean;
  media_asset_id: string;
};

/**
 * PR #5 admin media approval + audit dashboard.
 * - Aggregate media verification counts.
 * - Placement manifest mapping status (mapped vs missing).
 * - Slot media queue with approve / reject / reorder / set-hero actions.
 */
export default function AdminMediaApproval() {
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [slotMedia, setSlotMedia] = useState<SlotMediaRow[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setErr(null);
    const [{ data: a }, { data: sm }, { data: pl }] = await Promise.all([
      supabase.from("admin_media_audit_summary").select("*"),
      supabase
        .from("product_slot_media")
        .select("id,reference_code,role,sort_order,is_required,approved,mapping_confidence,media_asset_id")
        .order("reference_code", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(500),
      supabase.from("site_media_placements").select("id,page_type,page_slug,role,active,media_asset_id"),
    ]);
    setAudit((a ?? []) as AuditRow[]);
    setSlotMedia((sm ?? []) as SlotMediaRow[]);
    setPlacements((pl ?? []) as PlacementRow[]);
  }

  useEffect(() => {
    reload().catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const placedKeys = useMemo(
    () => new Set(placements.filter((p) => p.active).map((p) => `${p.page_type}::${p.page_slug}::${p.role}`)),
    [placements],
  );

  async function act(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("product_slot_media") as any).update(patch).eq("id", id);
    if (error) setErr(error.message);
    setBusy(null);
    await reload();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container-luxe py-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Admin · Media</p>
            <h1 className="font-display text-3xl">Media Approval &amp; Audit</h1>
          </div>
          <Link to="/admin" className="text-[11px] uppercase tracking-[0.28em] text-gold">Back</Link>
        </header>

        {err && <div className="border border-destructive/60 p-3 text-sm text-destructive">{err}</div>}

        <section>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Verification counts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {audit.length === 0 && <div className="text-sm text-muted-foreground">No media assets yet.</div>}
            {audit.map((r) => (
              <div key={r.verification_status} className="border border-border/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{r.verification_status}</div>
                <div className="mt-1 text-2xl font-display">{r.total}</div>
                <div className="text-[10px] text-muted-foreground">social-approved: {r.social_approved_count}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Placement manifest ({placedKeys.size} / {SITE_MEDIA_PLACEMENT_MANIFEST.length} mapped)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-2 pr-4">Page</th><th className="pr-4">Slug</th><th className="pr-4">Role</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {SITE_MEDIA_PLACEMENT_MANIFEST.map((spec) => {
                  const key = placementKey(spec);
                  const mapped = placedKeys.has(key);
                  return (
                    <tr key={key} className="border-t border-border/40">
                      <td className="py-2 pr-4">{spec.pageType}</td>
                      <td className="pr-4">{spec.pageSlug}</td>
                      <td className="pr-4">{spec.role}</td>
                      <td className={mapped ? "text-emerald-500" : "text-amber-500"}>{mapped ? "mapped" : "missing"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Slot media queue ({slotMedia.length})
          </h2>
          {slotMedia.length === 0 && <div className="text-sm text-muted-foreground">No slot media linked yet. Batches land via approved media briefs.</div>}
          <div className="space-y-1">
            {slotMedia.map((r) => (
              <div key={r.id} className="border border-border/60 p-3 flex flex-wrap items-center gap-3 text-sm">
                <code className="text-xs">{r.reference_code}</code>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{r.role}</span>
                <span className="text-[10px]">order {r.sort_order}</span>
                <span className={`text-[10px] uppercase ${r.approved ? "text-emerald-500" : "text-amber-500"}`}>
                  {r.approved ? "approved" : "pending"}
                </span>
                <span className="text-[10px] text-muted-foreground">confidence: {r.mapping_confidence}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => act(r.id, { approved: true, approved_at: new Date().toISOString() })}
                    className="border border-border/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] hover:border-gold"
                  >Approve</button>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => {
                      const reason = window.prompt("Reject reason?") ?? "";
                      if (reason.trim().length < 3) return;
                      act(r.id, { approved: false, rejected_reason: reason });
                    }}
                    className="border border-border/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] hover:border-destructive"
                  >Reject</button>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => act(r.id, { role: "hero", sort_order: 0, is_required: true })}
                    className="border border-border/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] hover:border-gold"
                  >Set Hero</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
