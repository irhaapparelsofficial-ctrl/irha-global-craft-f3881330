import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  Facebook,
  Linkedin,
  Music2,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Product = { id: string; name: string; slug: string };
type ChannelKey = "facebook" | "instagram" | "linkedin" | "tiktok";

type PlatformAccount = {
  id: string;
  platform: ChannelKey;
  display_name: string;
  external_account_id: string | null;
  enabled: boolean;
  verification_status: string;
  capabilities: Record<string, boolean>;
  last_verified_at: string | null;
  connection_note: string | null;
};

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
  action: "publish" | "verify";
  Icon: typeof Facebook;
}> = [
  { key: "facebook", label: "Facebook Page", action: "publish", Icon: Facebook },
  { key: "instagram", label: "Instagram Business", action: "publish", Icon: Facebook },
  { key: "linkedin", label: "LinkedIn", action: "publish", Icon: Linkedin },
  { key: "tiktok", label: "TikTok", action: "verify", Icon: Music2 },
];

function accountReady(account: PlatformAccount | undefined) {
  return Boolean(
    account
      && account.enabled
      && account.external_account_id
      && account.verification_status === "verified",
  );
}

export default function SocialDevOpsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selected, setSelected] = useState("");
  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>({
    facebook: false,
    instagram: false,
    linkedin: false,
    tiktok: false,
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.platform, account])),
    [accounts],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [productResult, accountResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,slug")
        .eq("is_published", true)
        .order("sort_order")
        .limit(500),
      (supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string) => Promise<{ data: unknown; error: { message: string } | null }> } } })
        .from("social_platform_accounts")
        .select("id,platform,display_name,external_account_id,enabled,verification_status,capabilities,last_verified_at,connection_note")
        .order("platform"),
    ]);

    const nextProducts = (productResult.data ?? []) as Product[];
    setProducts(nextProducts);
    setAccounts((accountResult.data ?? []) as unknown as PlatformAccount[]);
    setLoadError(productResult.error?.message || accountResult.error?.message || null);
    setSelected((current) => current || nextProducts[0]?.id || "");
    setChannels((current) => {
      const next = { ...current };
      for (const channel of CHANNELS) {
        const account = ((accountResult.data ?? []) as unknown as PlatformAccount[])
          .find((row) => row.platform === channel.key);
        if (!accountReady(account)) next[channel.key] = false;
      }
      return next;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedChannels = CHANNELS
    .filter(({ key }) => channels[key] && accountReady(accountMap.get(key)))
    .map(({ key }) => key);

  const trigger = async () => {
    if (!selected) {
      toast({ title: "Pick a published product", variant: "destructive" });
      return;
    }
    if (selectedChannels.length === 0) {
      toast({
        title: "No verified channel selected",
        description: "Enable and verify a real platform account before any publish or verification action.",
        variant: "destructive",
      });
      return;
    }

    const labels = selectedChannels.map((key) => CHANNELS.find((channel) => channel.key === key)?.label || key);
    if (!window.confirm(`Run a manual backend action for: ${labels.join(", ")}? Exact channel results will be logged.`)) return;

    setBusy(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("social-multi-sync", {
        body: { productId: selected, channels: selectedChannels },
      });
      if (error) throw error;

      const result = (data ?? {}) as SyncResponse;
      setLastResult(result);

      const published = result.summary?.published.length ?? 0;
      const verified = result.summary?.verified.length ?? 0;
      const issues = (result.summary?.failed.length ?? 0) + (result.summary?.skipped.length ?? 0);

      if (published > 0 && issues === 0) {
        toast({ title: "Publish complete", description: `${published} verified channel${published === 1 ? "" : "s"} published successfully.` });
      } else if (published > 0) {
        toast({ title: "Partial result", description: `${published} published; ${issues} channel${issues === 1 ? "" : "s"} need attention.` });
      } else if (verified > 0 && issues === 0) {
        toast({ title: "Connection verified", description: "No post was published in this action." });
      } else {
        toast({ title: "Nothing published", description: "Review the exact backend result below.", variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Social action failed",
        description: error instanceof Error ? error.message : "Unknown failure",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const summary = lastResult?.summary;
  const readyCount = CHANNELS.filter(({ key }) => accountReady(accountMap.get(key))).length;

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <p className="eyebrow mb-2">Verified platform delivery</p>
            <h2 className="font-display text-2xl md:text-4xl">Social Connections</h2>
            <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">
              A deployed Edge Function is not treated as a connected social account. A channel becomes selectable only after its account is enabled, has a real external account ID and has passed verification in owner Supabase.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh accounts
          </button>
        </div>
      </section>

      {loadError && (
        <div className="border border-red-500/40 bg-red-500/5 p-4 flex items-start gap-3 text-sm text-red-200">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Connection state could not load</p>
            <p className="mt-1 text-xs text-foreground/60 break-words">{loadError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CHANNELS.map(({ key, label, action, Icon }) => {
          const account = accountMap.get(key);
          const ready = accountReady(account);
          return (
            <div key={key} className={`border p-4 ${ready ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              <div className="flex items-center justify-between gap-2">
                <Icon size={16} className={ready ? "text-emerald-300" : "text-amber-300"} />
                {ready ? <CheckCircle2 size={15} className="text-emerald-300" /> : <ShieldAlert size={15} className="text-amber-300" />}
              </div>
              <p className="font-medium mt-3">{label}</p>
              <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">{action === "publish" ? "Publish channel" : "Verification only"}</p>
              <p className={`mt-3 text-[10px] uppercase tracking-[0.15em] ${ready ? "text-emerald-300" : "text-amber-300"}`}>
                {ready ? "Verified and enabled" : account?.verification_status || "Missing"}
              </p>
              {account?.connection_note && <p className="mt-2 text-xs text-foreground/55 break-words">{account.connection_note}</p>}
              {account?.last_verified_at && <p className="mt-2 text-[10px] text-foreground/45">Verified {new Date(account.last_verified_at).toLocaleString()}</p>}
            </div>
          );
        })}
      </div>

      {readyCount === 0 && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-100">No social account is verified yet</p>
            <p className="mt-2 text-xs text-foreground/65 leading-relaxed">
              Publishing remains blocked. Add the official platform credentials through the approved secure connection process, then verify the exact account before enabling this console.
            </p>
          </div>
        </div>
      )}

      <section className="border border-border/60 bg-card/30 p-5 md:p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Published product</label>
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="w-full bg-background border border-border/60 p-2.5 text-sm outline-none focus:border-gold"
              >
                {products.length === 0 && <option value="">No published products</option>}
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Verified channels only</p>
              <div className="space-y-2">
                {CHANNELS.map(({ key, label, action, Icon }) => {
                  const account = accountMap.get(key);
                  const ready = accountReady(account);
                  return (
                    <label key={key} className={`flex items-center justify-between gap-4 border px-3 py-3 ${ready ? "border-border/60 bg-background cursor-pointer hover:border-gold/60" : "border-border/35 bg-background/30 cursor-not-allowed opacity-55"}`}>
                      <span className="flex items-center gap-3 text-xs text-foreground/85">
                        <input
                          type="checkbox"
                          disabled={!ready || busy}
                          checked={ready && channels[key]}
                          onChange={(event) => setChannels((current) => ({ ...current, [key]: event.target.checked }))}
                          className="accent-gold"
                        />
                        <Icon size={14} className="text-muted-foreground" />
                        {label}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                        {ready ? (action === "publish" ? "Publish attempt" : "Verify only") : "Blocked · unverified"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={busy || !selected || selectedChannels.length === 0}
              onClick={() => void trigger()}
              className="min-h-12 w-full bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.22em] font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <Send size={13} /> {busy ? "Running verified action…" : "Run selected verified channels"}
            </button>
          </div>

          <div className="border border-border/60 bg-background p-5 min-h-[320px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground inline-flex items-center gap-2 mb-4">
              <CheckCircle2 size={12} className="text-gold" /> Exact backend result
            </p>

            {!lastResult ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No social action has been run in this session. A result appears only after the authenticated backend returns an exact per-channel outcome.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCount label="Published" count={summary?.published.length ?? 0} />
                  <ResultCount label="Verified only" count={summary?.verified.length ?? 0} />
                  <ResultCount label="Skipped" count={summary?.skipped.length ?? 0} />
                  <ResultCount label="Failed" count={summary?.failed.length ?? 0} />
                </div>
                <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap break-all border border-border/60 p-3 max-h-[360px] overflow-auto">
                  {JSON.stringify(lastResult.results ?? lastResult, null, 2)}
                </pre>
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
      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl mt-1 tabular-nums">{count}</p>
    </div>
  );
}
