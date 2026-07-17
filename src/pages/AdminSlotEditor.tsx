import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  evaluateSlotCompletion,
  type SlotCompletionInput,
} from "@/lib/slotCompleteness";

type SlotRow = {
  reference_code: string;
  main_slug: string;
  audience_slug: string;
  family_slug: string;
  slot_slug: string;
  working_title: string;
  owner_approved_title: string | null;
  factual_description: string | null;
  taxonomy_assigned: boolean;
  approved_media_count: number;
  spec_sheet_ready: boolean;
  owner_signed_off: boolean;
  publish_state: string;
  publishable: boolean;
  published_at: string | null;
};

export default function AdminSlotEditor() {
  const { user, loading } = useAuth();
  const { referenceCode = "" } = useParams();
  const [row, setRow] = useState<SlotRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase
      .from("catalog_slot_completion")
      .select("*")
      .eq("reference_code", referenceCode)
      .maybeSingle();
    if (data) setRow(data as SlotRow);
    setBusy(false);
  };

  useEffect(() => {
    if (user && referenceCode) void load();
  }, [user, referenceCode]);

  if (loading) return <div className="p-8 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const evalInput: SlotCompletionInput = row
    ? {
        referenceCode: row.reference_code,
        ownerApprovedTitle: row.owner_approved_title,
        factualDescription: row.factual_description,
        taxonomyAssigned: row.taxonomy_assigned,
        approvedMediaCount: row.approved_media_count,
        specSheetReady: row.spec_sheet_ready,
        ownerSignedOff: row.owner_signed_off,
      }
    : {
        referenceCode,
        ownerApprovedTitle: null,
        factualDescription: null,
        taxonomyAssigned: false,
        approvedMediaCount: 0,
        specSheetReady: false,
        ownerSignedOff: false,
      };
  const completion = evaluateSlotCompletion(evalInput);

  const patch = async (fields: Partial<SlotRow>) => {
    setBusy(true);
    const { error } = await supabase
      .from("catalog_slot_completion")
      .update(fields)
      .eq("reference_code", referenceCode);
    setBusy(false);
    if (error) {
      toast({ title: "Save failed", description: error.message });
      return;
    }
    void load();
  };

  const publish = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("publish_slot_ref", {
      _reference_code: referenceCode,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Publish blocked", description: error.message });
    } else {
      toast({ title: "Slot published" });
      void load();
    }
  };

  const unpublish = async () => {
    const reason = window.prompt("Reason for unpublishing (min 4 chars)?");
    if (!reason || reason.trim().length < 4) return;
    setBusy(true);
    const { error } = await supabase.rpc("unpublish_slot_ref", {
      _reference_code: referenceCode,
      _reason: reason,
    });
    setBusy(false);
    if (error) toast({ title: "Unpublish failed", description: error.message });
    else {
      toast({ title: "Slot unpublished" });
      void load();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Admin — Slot ${referenceCode}`}
        description="Owner-controlled slot editor."
        noindex
      />
      <div className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link
            to="/admin/catalogue-completion"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Completion dashboard
          </Link>
          <div className="flex gap-2">
            {row?.publish_state === "published" ? (
              <Button variant="destructive" size="sm" onClick={unpublish} disabled={busy}>
                Unpublish
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={publish}
                disabled={busy || !completion.publishable}
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {referenceCode}{" "}
                <Badge variant="outline" className="ml-2">
                  {row?.publish_state ?? "not-started"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!row ? (
                <p className="text-sm text-muted-foreground">
                  No completion row for this reference code yet. Owner-approved
                  batches populate it.
                </p>
              ) : (
                <>
                  <div>
                    <Label>Owner-approved title</Label>
                    <Input
                      defaultValue={row.owner_approved_title ?? ""}
                      onBlur={(e) =>
                        patch({ owner_approved_title: e.target.value || null })
                      }
                    />
                  </div>
                  <div>
                    <Label>Factual description</Label>
                    <Textarea
                      rows={6}
                      defaultValue={row.factual_description ?? ""}
                      onBlur={(e) =>
                        patch({ factual_description: e.target.value || null })
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      40–6000 chars. No invented certifications, MOQ, prices,
                      or timelines.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <ToggleField
                      label="Taxonomy assigned"
                      checked={row.taxonomy_assigned}
                      onChange={(v) => patch({ taxonomy_assigned: v })}
                    />
                    <ToggleField
                      label="Spec sheet ready"
                      checked={row.spec_sheet_ready}
                      onChange={(v) => patch({ spec_sheet_ready: v })}
                    />
                    <ToggleField
                      label="Owner signed off"
                      checked={row.owner_signed_off}
                      onChange={(v) => patch({ owner_signed_off: v })}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Approved media count is set by the media pipeline, not
                    editable here.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publication gates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completion.gates.map((g) => (
              <div
                key={g.key}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>{g.label}</span>
                <Badge variant={g.passed ? "default" : "outline"}>
                  {g.passed ? "green" : "red"}
                </Badge>
              </div>
            ))}
            <div className="pt-2 text-sm">
              {completion.publishable ? (
                <span className="text-green-600 dark:text-green-500">
                  All gates green — ready to publish.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Blocked on: <b>{completion.firstBlockingGate}</b>. Server
                  gate refuses publish until fixed.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
