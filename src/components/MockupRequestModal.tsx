import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WHATSAPP_NUMBER, BRAND } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Upload, Send, Sparkles } from "lucide-react";
import { z } from "zod";
import { submitPublicInquiry, uploadPublicLeadFile } from "@/lib/publicLeadGateway";
import type { UploadedFileRef } from "@/lib/inquiryDraft";

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(254),
  message: z.string().trim().min(5, "Tell us a bit about the mockup").max(2000),
  website: z.string().max(300),
});

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MockupRequestModal({ open, onOpenChange }: Props) {
  const [data, setData] = useState({ name: "", email: "", message: "", website: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAtRef = useRef(Date.now());

  const update = (key: keyof typeof data, value: string) => setData((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (file && (file.size > MAX_SIZE || !ALLOWED_TYPES.has(file.type))) {
      toast({ title: "File must be PDF, JPG, PNG or WEBP and under 10 MB", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      let uploaded: UploadedFileRef | null = null;
      if (file) uploaded = await uploadPublicLeadFile(file, "mockup", startedAtRef.current);

      const { reference } = await submitPublicInquiry({
        kind: "mockup",
        name: data.name,
        email: data.email,
        category: "Mockup Request",
        message: data.message,
        source: "mockup-modal",
        intent: "reference",
        website: data.website,
        form_started_at: startedAtRef.current,
        files: uploaded ? [uploaded] : [],
        lead_context: {
          conversion_type: "mockup-request",
          source_page: window.location.pathname + window.location.search,
          secure_file_uploaded: Boolean(uploaded),
        },
      });

      const whatsapp = `New Mockup Request — ${BRAND.name}
━━━━━━━━━━━━━━━━━━
Reference: ${reference}
Name: ${data.name}
Email: ${data.email}
Requirements: ${data.message}
Secure file uploaded: ${uploaded ? "Yes" : "No"}`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsapp)}`, "_blank");

      toast({ title: "Mockup request saved", description: "The team will review the requirement and confirm the next step." });
      setData({ name: "", email: "", message: "", website: "" });
      setFile(null);
      startedAtRef.current = Date.now();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Request could not be saved",
        description: error instanceof Error ? error.message : "Please try again or use WhatsApp.",
        variant: "destructive",
      });
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
            Send a reference image, PDF or logo with your product requirements. Feasibility, mockup scope and quotation details are confirmed after review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3 pt-2">
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px opacity-0"
            name="website"
            value={data.website}
            onChange={(event) => update("website", event.target.value)}
          />
          <input
            className={input}
            placeholder="Your name *"
            value={data.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={100}
            required
          />
          <input
            className={input}
            type="email"
            placeholder="Email *"
            value={data.email}
            onChange={(event) => update("email", event.target.value)}
            maxLength={254}
            required
          />
          <textarea
            className={`${input} min-h-[110px] resize-y`}
            placeholder="Describe your product, fabric, quantity, deadline… *"
            value={data.message}
            onChange={(event) => update("message", event.target.value)}
            maxLength={2000}
            required
          />

          <label className="flex items-center gap-3 border border-dashed border-border hover:border-gold/60 px-4 py-3 cursor-pointer transition-colors">
            <Upload size={16} className="text-gold shrink-0" />
            <span className="text-sm text-foreground/75 truncate">
              {file ? file.name : "Upload PDF / JPG / PNG / WEBP (optional, max 10 MB)"}
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3.5 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all disabled:opacity-60"
          >
            <Send size={14} />
            {busy ? "Saving…" : "Save & Open WhatsApp"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Files are uploaded to a private request bucket using a short-lived signed upload token.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
