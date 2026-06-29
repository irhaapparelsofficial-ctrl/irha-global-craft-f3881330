import { useEffect, useState } from "react";
import { Search, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  phone: string | null;
  category: string | null;
  quantity: string | null;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["new", "contacted", "quoted", "waiting", "won", "lost", "spam"] as const;

const statusColor: Record<string, string> = {
  new: "bg-gold/20 text-gold border-gold/40",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  quoted: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  waiting: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  lost: "bg-red-500/15 text-red-300 border-red-500/40",
  spam: "bg-foreground/10 text-foreground/50 border-foreground/20",
};

export default function LeadsPanel() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Could not load leads", description: error.message, variant: "destructive" });
    setRows((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const prev = rows;
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  };

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (!q) return true;
    return [r.name, r.company, r.country, r.email, r.phone, r.category, r.source]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const exportCsv = () => {
    const headers = ["Created", "Name", "Company", "Country", "Email", "Phone", "Category", "Quantity", "Source", "Status", "Message"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        new Date(r.created_at).toISOString(),
        r.name, r.company || "", r.country || "", r.email, r.phone || "",
        r.category || "", r.quantity || "", r.source || "", r.status, (r.message || "").replace(/\n/g, " "),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `irha-leads-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 border border-border/60 bg-card/30 px-4 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, email…"
            className="bg-transparent text-sm w-full outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card/30 border border-border/60 px-3 py-2.5 text-xs uppercase tracking-[0.15em]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
          <Download size={12} /> Export CSV
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-auto">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="border border-border/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-[10px] uppercase tracking-[0.2em] text-gold/80">
            <tr>
              {["Date", "Name", "Company", "Country", "Contact", "Interest", "Source", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">
                No leads yet. Submissions from /connect, /inquiry, RFQ form and quote form will appear here in real time.
              </td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/40 hover:bg-card/40 align-top">
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-foreground/80">{r.company || "—"}</td>
                <td className="px-4 py-3 text-foreground/80">{r.country || "—"}</td>
                <td className="px-4 py-3 space-y-1">
                  <a href={`mailto:${r.email}`} className="block text-gold hover:underline text-xs">{r.email}</a>
                  {r.phone && (
                    <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="block text-emerald-400 hover:underline text-xs">
                      {r.phone}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground/70 text-xs">
                  {r.category || "—"}{r.quantity ? ` · ${r.quantity}` : ""}
                </td>
                <td className="px-4 py-3 text-foreground/60 text-[11px]">{r.source || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 border bg-transparent ${statusColor[r.status] || statusColor.new}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s} className="bg-background text-foreground">{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
