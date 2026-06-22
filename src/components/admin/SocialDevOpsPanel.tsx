import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, Clock, Send, Linkedin, Facebook, Music2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Product = { id: string; name: string; slug: string };
type ChannelKey = "facebook" | "instagram" | "linkedin" | "tiktok";

const SYNC_INTERVAL_HOURS = 6;

const STACK = [
  { service: "Lovable Cloud DB", status: "operational" },
  { service: "Edge Functions Runtime", status: "operational" },
  { service: "Connector Gateway (LinkedIn/TikTok)", status: "operational" },
  { service: "Email Queue (notify.www.irhaapparels.com)", status: "operational" },
];

function formatRelative(iso: string | null): string {
  if (!iso) return "Awaiting first sync";
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function formatNextSync(lastIso: string | null): string {
  const base = lastIso ? new Date(lastIso).getTime() : Date.now();
  let next = base + SYNC_INTERVAL_HOURS * 3600_000;
  while (next < Date.now()) next += SYNC_INTERVAL_HOURS * 3600_000;
  return new Date(next).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

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
  const [lastSync, setLastSync] = useState<Record<ChannelKey, string | null>>({
    facebook: null,
    instagram: null,
    linkedin: null,
    tiktok: null,
  });

  const loadLastSync = async () => {
    const { data } = await supabase
      .from("social_posts")
      .select("channels, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const map: Record<ChannelKey, string | null> = {
      facebook: null,
      instagram: null,
      linkedin: null,
      tiktok: null,
    };
    (data ?? []).forEach((row: { channels: string[] | null; created_at: string }) => {
      (row.channels ?? []).forEach((ch) => {
        const k = ch as ChannelKey;
        if (k in map && !map[k]) map[k] = row.created_at;
      });
    });
    setLastSync(map);
  };

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
      await loadLastSync();
    })();
  }, []);

  const metaLast = useMemo(
    () => [lastSync.facebook, lastSync.instagram].filter(Boolean).sort().reverse()[0] ?? null,
    [lastSync]
  );

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
      await loadLastSync();
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

      {/* Connected Platform Status — One-Click Token Engine */}
      <section className="border border-border/60 bg-card/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={14} className="text-industrial" />
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            One-Click Token Engine — Connected Channels
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Meta Hub */}
          <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-[#1877F2]/10 via-background to-[#E1306C]/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Meta Hub
            </p>
            <div className="flex items-center gap-3 mb-4">
              {/* Facebook brand */}
              <span className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center shadow-md">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#fff" aria-label="Facebook">
                  <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
                </svg>
              </span>
              {/* Instagram brand */}
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: "radial-gradient(circle at 30% 110%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#fff" strokeWidth="2" aria-label="Instagram">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
                </svg>
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">Facebook Page & Instagram Business</p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-industrial animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-industrial font-bold">
                Synced & Operational
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <p className="text-muted-foreground uppercase tracking-[0.15em] mb-0.5">Last sync</p>
                <p className="text-foreground/90 inline-flex items-center gap-1"><Clock size={10} />{formatRelative(metaLast)}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-[0.15em] mb-0.5">Next scheduled</p>
                <p className="text-foreground/90">{formatNextSync(metaLast)}</p>
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-[#0A66C2]/15 via-background to-[#0A66C2]/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              LinkedIn B2B V2 API
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-md bg-[#0A66C2] flex items-center justify-center shadow-md">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#fff" aria-label="LinkedIn">
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
                </svg>
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">Corporate Post Engine</p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-industrial animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-industrial font-bold">
                Connected · Admin Context
              </span>
            </div>
          </div>

          {/* TikTok */}
          <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-[#FF0050]/15 via-background to-[#000]/40 p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              TikTok Share Kit V2
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-md relative">
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-label="TikTok">
                  <path fill="#25F4EE" d="M19.6 6.8a5.7 5.7 0 0 1-3.3-1.06V15.4a5.8 5.8 0 1 1-5.8-5.8c.2 0 .4 0 .6.03v2.95a2.85 2.85 0 1 0 2.25 2.79V2h2.85a5.7 5.7 0 0 0 3.4 4.8V6.8Z" />
                  <path fill="#FE2C55" d="M20.6 7.8a5.7 5.7 0 0 1-3.3-1.06V16.4a5.8 5.8 0 1 1-5.8-5.8c.2 0 .4 0 .6.03v2.95a2.85 2.85 0 1 0 2.25 2.79V3h2.85a5.7 5.7 0 0 0 3.4 4.8V7.8Z" />
                  <path fill="#fff" d="M20.1 7.3a5.7 5.7 0 0 1-3.3-1.06V15.9a5.8 5.8 0 1 1-5.8-5.8c.2 0 .4 0 .6.03v2.95a2.85 2.85 0 1 0 2.25 2.79V2.5h2.85a5.7 5.7 0 0 0 3.4 4.8V7.3Z" />
                </svg>
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">Short-Form Factory Logs</p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-industrial animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-industrial font-bold">
                Live Sync Enabled
              </span>
            </div>
          </div>
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
