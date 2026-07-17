import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TAXONOMY_TARGETS } from "@/lib/catalogTaxonomyManifest";

type DashboardRow = {
  reference_code: string;
  main_slug: string;
  audience_slug: string;
  family_slug: string;
  slot_slug: string;
  working_title: string;
  owner_approved_title: string | null;
  publish_state: string;
  publishable: boolean;
  taxonomy_assigned: boolean;
  approved_media_count: number;
  spec_sheet_ready: boolean;
  owner_signed_off: boolean;
  blocking_gate: string;
  published_at: string | null;
  updated_at: string;
};

const GATE_LABEL: Record<string, string> = {
  missing_title: "Owner-approved title",
  missing_description: "Factual description",
  missing_taxonomy: "Taxonomy assignment",
  missing_media: "Approved media",
  missing_spec_sheet: "Spec sheet",
  awaiting_owner_signoff: "Owner sign-off",
  ready_to_publish: "Ready — publish",
  live: "Live",
};

export default function AdminCatalogueCompletion() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("admin_slot_completion_dashboard")
      .select("*")
      .order("main_slug", { ascending: true })
      .order("reference_code", { ascending: true })
      .limit(500);
    if (!error && data) setRows(data as DashboardRow[]);
    setBusy(false);
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const rollup = useMemo(() => {
    const total = TAXONOMY_TARGETS.productSlotCount;
    const started = rows.length;
    const publishable = rows.filter((r) => r.publishable).length;
    const live = rows.filter((r) => r.publish_state === "published").length;
    const blockedByGate: Record<string, number> = {};
    for (const r of rows) {
      if (!r.publishable) {
        blockedByGate[r.blocking_gate] =
          (blockedByGate[r.blocking_gate] ?? 0) + 1;
      }
    }
    return {
      total,
      started,
      notStarted: Math.max(total - started, 0),
      publishable,
      live,
      blockedByGate,
    };
  }, [rows]);

  if (loading) return <div className="p-8 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin — Catalogue completion"
        description="Per-slot completion gates against the 206-slot manifest."
        noindex
      />
      <div className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={busy}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Catalogue completion</h1>
          <p className="text-sm text-muted-foreground">
            Every planned slot is unpublished + noindex by default. A slot
            only goes live when every gate is green and an admin runs the
            server-side publish function.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat label="Planned slots" value={rollup.total} />
          <Stat
            label="Started"
            value={`${rollup.started} / ${rollup.total}`}
          />
          <Stat label="Not started" value={rollup.notStarted} />
          <Stat label="Publishable (green)" value={rollup.publishable} />
          <Stat label="Live" value={rollup.live} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blocked-by gate</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(rollup.blockedByGate).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No blocked slots recorded yet.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                {Object.entries(rollup.blockedByGate).map(([gate, n]) => (
                  <li key={gate} className="flex justify-between rounded border px-3 py-2">
                    <span>{GATE_LABEL[gate] ?? gate}</span>
                    <span className="font-mono">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Slots in progress</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No slot rows submitted yet. Rows appear here as reviewed
                release batches land on the owner project.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Main</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Blocking gate</TableHead>
                      <TableHead className="text-right">Media</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.reference_code}>
                        <TableCell className="font-mono text-xs">
                          {r.reference_code}
                        </TableCell>
                        <TableCell>
                          {r.owner_approved_title ?? r.working_title}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.main_slug}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.publish_state === "published"
                                ? "default"
                                : r.publishable
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {r.publish_state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {GATE_LABEL[r.blocking_gate] ?? r.blocking_gate}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {r.approved_media_count}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/admin/catalogue-completion/${encodeURIComponent(r.reference_code)}`}
                            className="text-sm underline"
                          >
                            Open
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
