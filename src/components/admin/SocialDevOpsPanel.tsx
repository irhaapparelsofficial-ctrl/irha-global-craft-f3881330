import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Facebook, Linkedin, Music2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Product = { id: string; name: string; slug: string };
type ChannelKey = "facebook" | "instagram" | "linkedin" | "tiktok";

type SyncSummary = {
  published: string[];
  verified: string[];
  skipped: string[];
  failed: string[];
};

type SyncResponse = {
  success?: boolean;
  partial?: boolean;
  product?: { name: string; url: string };
  summary?: SyncSummary;
  results?: Record<string, unknown>;
  error?: string;
};

const CHANNELS: Array<{
  key: ChannelKey;
  label: string;
  note: string;
  Icon: typeof Facebook;
}> = [
  { key: "facebook", label: "Facebook Page", note: "Publish attempt", Icon: Facebook },
  { key: "instagram", label: "Instagram Business", note: "Publish attempt", Icon: Facebook },
  { key: "linkedin", label: "LinkedIn", note: "Publish attempt", Icon: Linkedin },
  { key: "tiktok", label: "TikTok", note: "Profile verification only", Icon: Music2 },
];

export default function SocialDevOpsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>({
    facebook: false,
    instagram: false,
    linkedin: false,
    tiktok: false,
  });
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug")
        .eq("is_published", true)
        .order("sort_order")
        .limit(100);

      if (error) {
        toast({ title: "Products could not load", description: error.message, variant: "destructive" });
        return;
      }

      const list = (data ?? []) as Product[];
      setProducts(list);
      if (list[0]) setSelected(list[0].id);
    })();
  }, []);

  const trigger = async () => {
    if (!selected) {
      toast({ title: "Pick a published product", variant: "destructive" });
      return;
    }

    const picked = CHANNELS.filter(({ key }) => channels[key]).map(({ key }) => key);
    if (picked.length === 0) {
      toast({ title: "Select at least one channel", variant: "destructive" });
      return;
    }

    setBusy(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("social-multi-sync", {
        body: { productId: selected, channels: picked },
      });
      if (error) throw error;

      const result = (data ?? {}) as SyncResponse;
      setLastResult(result);

      const published = result.summary?.published.length ?? 0;
      const verified = result.summary?.verified.length ?? 0;
      const issues = (result.summary?.failed.length ?? 0) + (result.summary?.skipped.length ?? 0);

      if (published > 0 && issues === 0) {
        toast({ title: "Publish complete", description: `${published} channel${published === 1 ? "" : "s"} published successfully.` });
      } else if (published > 0) {
        toast({ title: "Partial result", description: `${published} published; ${issues} channel${issues === 1 ? "" : "s"} need attention.` });
      } else if (verified > 0 && issues === 0) {
        toast({ title: "Connection verified", description: "No post was published in this action." });
      } else {
        toast({ title: "Nothing published", description: "Review the exact channel breakdown below.", variant: "destructive" });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown failure";
      toast({ title: "Social action failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const summary = lastResult?.summary;

  return (
    <div className="space-y-8">
      <section className="border border-amber-500/40 bg-amber-500/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-xl">Manual Social Delivery Console</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-3xl leading-relaxed">
              No channel is assumed connected or operational. Select channels deliberately, run the action manually, and use the result breakdown below as the source of truth. TikTok currently verifies the connected profile only and does not publish a post.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-border/60 bg-card/40 p-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow mb-2">Manual Action</p>
            <h3 className="font-display text-2xl">Select Product and Channels</h3>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">No automatic schedule</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                Published Product
              </label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full bg-background border border-border/60 p-2.5 text-xs focus:border-industrial outline-none"
              >
                {products.length === 0 && <option value="">No published products</option>}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                Channels
              </label>
              <div className="space-y-2">
                {CHANNELS.map(({ key, label, note, Icon }) => (
                  <label key={key} className="flex items-center justify-between gap-4 border border-border/60 bg-background px-3 py-3 cursor-pointer hover:border-industrial/60">
                    <span className="flex items-center gap-3 text-xs text-foreground/85">
                      <input
                        type="checkbox"
                        checked={channels[key]}
                        onChange={(e) => setChannels((current) => ({ ...current, [key]: e.target.checked }))}
                        className="accent-industrial"
                      />
                      <Icon size={14} className="text-muted-foreground" />
                      {label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{note}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              disabled={busy || !selected}
              onClick={trigger}
              className="w-full bg-industrial text-industrial-foreground text-[10px] uppercase tracking-[0.3em] font-bold py-3 hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Send size={12} /> {busy ? "Running…" : "Run Selected Channels"}
            </button>
          </div>

          <div className="border border-border/60 bg-background p-5 min-h-[320px]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-2">
                <CheckCircle2 size={12} className="text-industrial" /> Verified Result
              </p>
              {lastResult?.product?.url && (
                <a href={lastResult.product.url} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.2em] text-industrial hover:underline">
                  Open Product ↗
                </a>
              )}
            </div>

            {!lastResult ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No social action has been run in this session. Results will appear only after the backend returns an exact per-channel outcome.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCount label="Published" count={summary?.published.length ?? 0} />
                  <ResultCount label="Verified only" count={summary?.verified.length ?? 0} />
                  <ResultCount label="Skipped" count={summary?.skipped.length ?? 0} />
                  <ResultCount label="Failed" count={summary?.failed.length ?? 0} />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Exact channel breakdown</p>
                  <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap break-all border border-border/60 p-3 max-h-[360px] overflow-auto">
                    {JSON.stringify(lastResult.results ?? lastResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl mt-1">{count}</p>
    </div>
  );
}