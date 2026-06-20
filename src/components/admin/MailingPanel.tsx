import { useState } from "react";
import { Upload, Send, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MailingPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onCsv = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const emails = text.split(/[\s,\n;]+/).filter((s) => /@/.test(s));
      setRecipients(emails);
    };
    reader.readAsText(f);
  };

  const send = async () => {
    if (!recipients.length || !subject || !message) {
      toast({ title: "Missing fields", description: "Add recipients, subject and message." });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    toast({ title: "Campaign queued", description: `${recipients.length} emails will be sent.` });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 border border-border/60 bg-card/30 p-6 space-y-4">
        <h3 className="font-display text-xl text-gold flex items-center gap-2"><Mail size={18} /> New Email Campaign</h3>

        <label className="block border-2 border-dashed border-border/60 p-6 text-center cursor-pointer hover:border-gold transition-colors">
          <input type="file" accept=".csv,.txt" hidden onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
          <Upload className="mx-auto text-gold mb-2" size={20} />
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/80">{file ? file.name : "Upload CSV of recipients"}</p>
          {recipients.length > 0 && <p className="text-[10px] text-gold mt-1">{recipients.length} emails detected</p>}
        </label>

        <div>
          <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Premium Lederhosen — Factory Direct from Pakistan" className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-gold outline-none" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Dear partner,&#10;&#10;We manufacture premium traditional Lederhosen…" className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-gold outline-none resize-none" />
        </div>

        <button onClick={send} disabled={sending} className="w-full bg-gradient-gold text-background text-xs uppercase tracking-[0.25em] py-3 hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
          <Send size={14} /> {sending ? "Sending…" : `Send Campaign${recipients.length ? ` (${recipients.length})` : ""}`}
        </button>
      </div>

      <div className="border border-border/60 bg-card/30 p-6">
        <h3 className="font-display text-lg text-gold mb-4">Recent Sends</h3>
        <ul className="space-y-3 text-sm">
          {[
            { s: "DE Wholesalers Q4", n: 320, t: "1d ago" },
            { s: "USA Importers", n: 145, t: "4d ago" },
            { s: "UK Trachten Shops", n: 89, t: "1w ago" },
            { s: "Oktoberfest AU", n: 56, t: "2w ago" },
          ].map((r, i) => (
            <li key={i} className="border-b border-border/40 pb-2 last:border-0">
              <p className="text-foreground/90">{r.s}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{r.n} sent · {r.t}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
