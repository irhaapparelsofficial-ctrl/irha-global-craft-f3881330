import { useState } from "react";
import { Search } from "lucide-react";

const dummy = [
  { name: "Hans Müller", company: "Trachten GmbH", country: "Germany", email: "hans@trachten.de", status: "new" },
  { name: "Sarah Johnson", company: "Alpine Imports", country: "USA", email: "sarah@alpineimports.com", status: "contacted" },
  { name: "James Walker", company: "Bavaria UK Ltd", country: "UK", email: "james@bavariauk.co.uk", status: "negotiating" },
  { name: "Liam O'Brien", company: "Oktoberfest AU", country: "Australia", email: "liam@oktoberfest.au", status: "new" },
  { name: "Klaus Weber", company: "Lederhosen World", country: "Germany", email: "k.weber@lhw.de", status: "won" },
  { name: "Maria Schmidt", company: "Volksfest Co", country: "Austria", email: "maria@volksfest.at", status: "contacted" },
  { name: "Tom Becker", company: "Munich Style Co", country: "USA", email: "tom@munichstyle.com", status: "new" },
];

const statusColor: Record<string, string> = {
  new: "bg-gold/20 text-gold border-gold/40",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  negotiating: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

export default function LeadsPanel() {
  const [q, setQ] = useState("");
  const rows = dummy.filter((r) =>
    [r.name, r.company, r.country, r.email].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border border-border/60 bg-card/30 px-4 py-2.5 max-w-md">
        <Search size={14} className="text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search leads…"
          className="bg-transparent text-sm w-full outline-none"
        />
      </div>

      <div className="border border-border/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-[10px] uppercase tracking-[0.2em] text-gold/80">
            <tr>
              {["Name", "Company", "Country", "Email", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t border-border/40 hover:bg-card/40">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-foreground/80">{r.company}</td>
                <td className="px-4 py-3 text-foreground/80">{r.country}</td>
                <td className="px-4 py-3"><a href={`mailto:${r.email}`} className="text-gold hover:underline">{r.email}</a></td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 border ${statusColor[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-[10px] uppercase tracking-[0.2em] border border-border/60 px-3 py-1.5 hover:border-gold hover:text-gold">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
