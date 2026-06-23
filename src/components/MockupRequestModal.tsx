import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_NUMBER, BRAND } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Upload, Send, Sparkles } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  message: z.string().trim().min(5, "Tell us a bit about the mockup").max(2000),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MockupRequestModal({ open, onOpenChange }: Props) {
  const [data, setData] = useState({ name: "", email: "", message: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (k: keyof typeof data, v: string) => setData((d) => ({ ...d, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      toast({ title: "File must be under 10 MB", variant: "destructive" });
      return;
    }

    setBusy(true);
    let attachmentUrl: string | null = null;

    try {
      if (file) {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `requests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("mockup-uploads")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("mockup-uploads")
          .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
        attachmentUrl = signed?.signedUrl ?? null;
      }

      void supabase.from("inquiries").insert({
        name: data.name,
        email: data.email,
        country: "—",
        category: "Mockup Request",
        message: `${data.message}${attachmentUrl ? `\n\nAttachment: ${attachmentUrl}` : ""}`,
        source: "mockup-modal",
      });

      const wa = `New Mockup Request — ${BRAND.name}
━━━━━━━━━━━━━━━━━━
Name: ${data.name}
Email: ${data.email}
Requirements: ${data.message}${attachmentUrl ? `\n\nSketch/Logo: ${attachmentUrl}` : ""}`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(wa)}`, "_blank");

      toast({ title: "Mockup request sent", description: "We'll respond within 4 working hours." });
      setData({ name: "", email: "", message: "" });
      setFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message ?? "Please try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full bg-input border border-border focus:border-gold outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border-gold/40">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 text-gold text-[10px] font-mono uppercase tracking-[0.3em] mb-2">
            <Sparkles size={14} /> Custom Mockup Studio
          </div>
          <DialogTitle className="font-display text-2xl md:text-3xl leading-tight">
            Request a custom <span className="text-gold italic">mockup</span>
          </DialogTitle>
          <DialogDescription className="text-foreground/70 text-sm">
            Send your sketch, tech-pack or logo. Our design team will return a digital mockup + FOB quote within 24 h.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3 pt-2">
          <input
            className={input}
            placeholder="Your name *"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            maxLength={100}
            required
          />
          <input
            className={input}
            type="email"
            placeholder="Email *"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            maxLength={255}
            required
          />
          <textarea
            className={`${input} min-h-[110px] resize-y`}
            placeholder="Describe your product, fabric, quantity, deadline… *"
            value={data.message}
            onChange={(e) => update("message", e.target.value)}
            maxLength={2000}
            required
          />

          <label className="flex items-center gap-3 border border-dashed border-border hover:border-gold/60 px-4 py-3 cursor-pointer transition-colors">
            <Upload size={16} className="text-gold shrink-0" />
            <span className="text-sm text-foreground/75 truncate">
              {file ? file.name : "Upload sketch / logo / tech-pack (optional, max 10 MB)"}
            </span>
            <input
              type="file"
              accept="image/*,.pdf,.ai,.psd,.zip"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3.5 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all disabled:opacity-60"
          >
            <Send size={14} />
            {busy ? "Sending…" : "Send Mockup Request"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            We never share your files. Response time: under 4 working hours.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
