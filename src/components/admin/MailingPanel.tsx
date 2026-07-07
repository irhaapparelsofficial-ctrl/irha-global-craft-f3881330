import { useState } from "react";
import { Mail, ShieldAlert, Upload } from "lucide-react";

export default function MailingPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const onCsv = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const emails = Array.from(
        new Set(
          text
            .split(/[\s,;]+/)
            .map((value) => value.trim().toLowerCase())
            .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        )
      );
      setRecipients(emails);
    };
    reader.readAsText(f);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 border border-border/60 bg-card/30 p-6 space-y-4">
        <h3 className="font-display text-xl text-gold flex items-center gap-2"><Mail size={18} /> Email Campaign Draft</h3>

        <div className="border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Draft-only mode</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Campaign delivery is not connected to this panel. Sending stays disabled until a verified backend workflow, sender identity, unsubscribe handling and send history are wired in.
            </p>
          </div>
        </div>

        <label className="block border-2 border-dashed border-border/60 p-6 text-center cursor-pointer hover:border-gold transition-colors">
          <input type="file" accept=".csv,.txt" hidden onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
          <Upload className="mx-auto text-gold mb-2" size={20} />
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/80">{file ? file.name : "Upload CSV or TXT recipients"}</p>
          {recipients.length > 0 && <p className="text-[10px] text-gold mt-1">{recipients.length} unique valid emails detected</p>}
        </label>

        <div>
          <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Campaign subject" className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-gold outline-none" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Write the campaign draft here…" className="mt-1 w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-gold outline-none resize-none" />
        </div>

        <button disabled className="w-full border border-border/60 bg-muted/30 text-muted-foreground text-xs uppercase tracking-[0.25em] py-3 cursor-not-allowed">
          Sending Disabled — Backend Not Connected
        </button>
      </div>

      <div className="border border-border/60 bg-card/30 p-6">
        <h3 className="font-display text-lg text-gold mb-4">Verified Send History</h3>
        <div className="border border-dashed border-border/60 p-5">
          <p className="text-sm text-foreground/80">No verified campaign history is connected to this panel.</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Real delivery records should come from the email queue and provider logs before they are displayed here.
          </p>
        </div>
      </div>
    </div>
  );
}