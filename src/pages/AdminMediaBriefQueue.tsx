import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { isValidReferenceCode } from "@/lib/catalogTaxonomyManifest";

type BriefRow = {
  id: string;
  reference_code: string;
  subject: string;
  style: string | null;
  aspect_ratio: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export default function AdminMediaBriefQueue() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<BriefRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    reference_code: "",
    subject: "",
    style: "",
    aspect_ratio: "1:1",
    notes: "",
  });

  const load = async () => {
    setBusy(true);
    const { data } = await supabase
      .from("admin_media_brief_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setRows(data as BriefRow[]);
    setBusy(false);
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  if (loading) return <div className="p-8 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const submit = async () => {
    if (!isValidReferenceCode(draft.reference_code)) {
      toast({ title: "Invalid reference code" });
      return;
    }
    if (draft.subject.trim().length < 3) {
      toast({ title: "Subject too short" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("media_generation_briefs").insert({
      reference_code: draft.reference_code,
      subject: draft.subject.trim(),
      style: draft.style || null,
      aspect_ratio: draft.aspect_ratio || null,
      notes: draft.notes || null,
      status: "draft",
    });
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message });
    else {
      toast({ title: "Brief queued (draft)" });
      setDraft({
        reference_code: "",
        subject: "",
        style: "",
        aspect_ratio: "1:1",
        notes: "",
      });
      void load();
    }
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(true);
    const patch =
      status === "approved"
        ? { status, owner_approved_at: new Date().toISOString() }
        : { status };
    const { error } = await supabase
      .from("media_generation_briefs")
      .update(patch)
      .eq("id", id);
    setBusy(false);
    if (error) toast({ title: "Update failed", description: error.message });
    else void load();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin — Media generation briefs"
        description="Owner-approval-gated media generation queue."
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
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">New brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Reference code</Label>
              <Input
                placeholder="IRHA-BAV-M-LHS-001"
                value={draft.reference_code}
                onChange={(e) =>
                  setDraft({ ...draft, reference_code: e.target.value.trim() })
                }
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Style</Label>
              <Input
                value={draft.style}
                onChange={(e) => setDraft({ ...draft, style: e.target.value })}
              />
            </div>
            <div>
              <Label>Aspect ratio</Label>
              <Input
                value={draft.aspect_ratio}
                onChange={(e) =>
                  setDraft({ ...draft, aspect_ratio: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <Button size="sm" onClick={submit} disabled={busy}>
              <Plus className="mr-2 h-4 w-4" /> Queue brief
            </Button>
            <p className="text-xs text-muted-foreground">
              Briefs stay in <b>draft</b> until an admin flips them to
              <b> approved</b>. No AI generation runs automatically.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No briefs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Ratio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {r.reference_code}
                      </TableCell>
                      <TableCell>{r.subject}</TableCell>
                      <TableCell className="text-xs">{r.aspect_ratio ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "approved" ? "default" : "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        {r.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(r.id, "approved")}
                            disabled={busy}
                          >
                            Approve
                          </Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStatus(r.id, "rejected")}
                            disabled={busy}
                          >
                            Reject
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
