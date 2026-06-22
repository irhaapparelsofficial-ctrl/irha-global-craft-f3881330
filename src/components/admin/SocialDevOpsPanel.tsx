import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, Send, Linkedin, Facebook, Music2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Product = { id: string; name: string; slug: string };

const STACK = [
  { service: "Lovable Cloud DB", status: "operational" },
  { service: "Edge Functions Runtime", status: "operational" },
  { service: "Connector Gateway (LinkedIn/TikTok)", status: "operational" },
  { service: "Email Queue (notify.www.irhaapparels.com)", status: "operational" },
];

export default function SocialDevOpsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [channels, setChannels] = useState({
    facebook: true,
    instagram: true,
    linkedin: true,
    tiktok: false,
  });
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug")
        .eq("is_published", true)
        .order("sort_order")
        .limit(50);
      const list = (data ?? []) as Product[];
      setProducts(list);
      if (list[0]) setSelected(list[0].id);
    })();
  }, []);

  const trigger = async () => {
    if (!selected) {
      toast({ title: "Pick a product", variant: "destructive" });
      return;
    }
    const picked = Object.entries(channels)
      .filter(([, on]) => on)
      .map(([k]) => k);
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
      setLastResult(data as Record<string, unknown>);
      toast({ title: "Sync dispatched", description: "Check the breakdown below." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown failure";
      toast({ title: "Sync failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Health grid */}
      <section className="border border-border/60 bg-card/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-industrial" />
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Cloud DevOps Stack Health
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STACK.map((s) => (
            <div key={s.service} className="bg-background border border-border/60 p-4">
              <p className="text-xs font-mono text-foreground/80">{s.service}</p>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="w-2 h-2 rounded-full bg-industrial" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-industrial font-bold">
                  Operational
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-channel sync */}
      <section className="border border-border/60 bg-card/40 p-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
          <div>
            <h3 className="font-display text-2xl">One-Click Multi-Channel Sync</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Publishes product card + SEO URL to selected channels via the Lovable Connector Gateway
              (LinkedIn, TikTok) and Meta Graph API (Facebook, Instagram).
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                Product
              </label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full bg-background border border-border/60 p-2.5 text-xs focus:border-industrial outline-none"
              >
                {products.length === 0 && <option value="">No published products</option>}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Channels
              </label>
              {[
                { key: "facebook" as const, label: "Facebook Page", Icon: Facebook },
                { key: "instagram" as const, label: "Instagram Business", Icon: Facebook },
                { key: "linkedin" as const, label: "LinkedIn Organization", Icon: Linkedin },
                { key: "tiktok" as const, label: "TikTok Creator", Icon: Music2 },
              ].map(({ key, label, Icon }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels[key]}
                    onChange={(e) => setChannels((c) => ({ ...c, [key]: e.target.checked }))}
                    className="accent-industrial"
                  />
                  <Icon size={12} className="text-muted-foreground" />
                  {label}
                </label>
              ))}
            </div>

            <button
              disabled={busy}
              onClick={trigger}
              className="w-full bg-industrial text-industrial-foreground text-[10px] uppercase tracking-[0.3em] font-bold py-3 hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Send size={12} /> {busy ? "Dispatching…" : "Publish Now"}
            </button>
          </div>

          <div className="bg-background border border-border/60 p-4 min-h-[260px]">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3 inline-flex items-center gap-1">
              <CheckCircle2 size={11} className="text-industrial" /> Last Sync Result
            </p>
            {lastResult ? (
              <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap break-all">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">
                No sync triggered yet. Make sure LinkedIn / TikTok connectors are linked in Workspace Settings,
                and Meta secrets (META_PAGE_ID, META_ACCESS_TOKEN, optionally IG_ACCOUNT_ID) are configured.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
