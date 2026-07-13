import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Tab = "performance" | "indexing";
type Dimension = "query" | "page" | "country";
type GSCRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
type Inspection = {
  url: string;
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemap?: string[];
  inspectionLink?: string;
  error?: string;
};

const SITE = "https://irhaapparels.com";
const PRIORITY_URLS = [
  `${SITE}/`,
  `${SITE}/products`,
  `${SITE}/catalogue`,
  `${SITE}/manufacturing`,
  `${SITE}/buyer-trust`,
  `${SITE}/factory-video-call`,
  `${SITE}/resources`,
  `${SITE}/faq`,
  `${SITE}/inquiry`,
  `${SITE}/repeat-order`,
];

function normalizeUrls(value: string) {
  return [...new Set(value
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.startsWith(`${SITE}/`) || item === `${SITE}/`))]
    .slice(0, 25);
}

function statusTone(result: Inspection) {
  if (result.error) return "blocked" as const;
  const verdict = String(result.verdict || "").toUpperCase();
  const indexing = String(result.indexingState || "").toUpperCase();
  if (verdict === "PASS" && indexing.includes("INDEXING_ALLOWED")) return "ready" as const;
  if (verdict === "NEUTRAL" || verdict === "PARTIAL") return "partial" as const;
  return "blocked" as const;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function GoogleSearchCenter() {
  const [tab, setTab] = useState<Tab>("performance");
  const [dimension, setDimension] = useState<Dimension>("query");
  const [days, setDays] = useState(28);
  const [rows, setRows] = useState<GSCRow[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [urlText, setUrlText] = useState(PRIORITY_URLS.join("\n"));
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  const loadPerformance = async (nextDimension = dimension, nextDays = days) => {
    setPerformanceLoading(true);
    setPerformanceError(null);
    const { data, error } = await supabase.functions.invoke("gsc-analytics", {
      body: { dimension: nextDimension, days: nextDays },
    });
    if (error || data?.error) {
      setPerformanceError(data?.error || error?.message || "Search Console analytics failed");
      setRows([]);
    } else {
      setRows((data?.rows ?? []) as GSCRow[]);
    }
    setPerformanceLoading(false);
  };

  useEffect(() => { void loadPerformance("query", 28); }, []);

  const totals = useMemo(() => ({
    clicks: rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
    impressions: rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0),
  }), [rows]);

  const loadSitemapUrls = async () => {
    setSitemapLoading(true);
    try {
      const response = await fetch(`/sitemap.xml?gsc=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Sitemap returned HTTP ${response.status}`);
      const xml = await response.text();
      const documentNode = new DOMParser().parseFromString(xml, "application/xml");
      if (documentNode.querySelector("parsererror")) throw new Error("Sitemap XML could not be parsed");
      const all = Array.from(documentNode.querySelectorAll("url > loc"))
        .map((node) => node.textContent?.trim() || "")
        .filter((url) => url.startsWith(`${SITE}/`) || url === `${SITE}/`);
      const selected = [...new Set([...PRIORITY_URLS, ...all])].slice(0, 25);
      setUrlText(selected.join("\n"));
      toast({ title: "Sitemap URLs loaded", description: `${selected.length} URLs selected for the next read-only inspection.` });
    } catch (error) {
      toast({ title: "Sitemap could not load", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setSitemapLoading(false);
    }
  };

  const inspectUrls = async () => {
    const urls = normalizeUrls(urlText);
    if (urls.length === 0) {
      toast({ title: "Add at least one irhaapparels.com URL", variant: "destructive" });
      return;
    }
    setInspectionLoading(true);
    setInspectionError(null);
    const { data, error } = await supabase.functions.invoke("gsc-inspect", { body: { urls } });
    if (error || data?.error) {
      setInspectionError(data?.error || error?.message || "URL Inspection failed");
      setInspections([]);
    } else {
      setInspections((data?.results ?? []) as Inspection[]);
    }
    setInspectionLoading(false);
  };

  const counts = useMemo(() => ({
    ready: inspections.filter((result) => statusTone(result) === "ready").length,
    partial: inspections.filter((result) => statusTone(result) === "partial").length,
    blocked: inspections.filter((result) => statusTone(result) === "blocked").length,
  }), [inspections]);

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <p className="eyebrow mb-2">Google Search & Indexing Center</p>
        <h2 className="font-display text-3xl md:text-4xl">Performance and URL evidence in one workspace.</h2>
        <p className="text-sm text-foreground/68 mt-3 max-w-3xl leading-relaxed">
          Search Console analytics show demand and visibility. URL Inspection shows Google's latest known crawl, canonical, robots and indexing state. This workspace does not claim that Google will index a page or submit hidden indexing requests.
        </p>
      </section>

      <div className="flex gap-2 border-b border-border/60 overflow-x-auto">
        <TabButton active={tab === "performance"} onClick={() => setTab("performance")} icon={<Search size={13} />} label="Performance" />
        <TabButton active={tab === "indexing"} onClick={() => setTab("indexing")} icon={<FileSearch size={13} />} label="URL Inspection" />
      </div>

      {tab === "performance" ? (
        <section className="space-y-5">
          <div className="flex gap-2 flex-wrap items-center">
            {(["query", "page", "country"] as Dimension[]).map((item) => (
              <button key={item} type="button" onClick={() => { setDimension(item); void loadPerformance(item, days); }} className={`border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${dimension === item ? "border-gold text-gold bg-gold/10" : "border-border/60 text-foreground/55"}`}>
                By {item}
              </button>
            ))}
            {[28, 90].map((value) => (
              <button key={value} type="button" onClick={() => { setDays(value); void loadPerformance(dimension, value); }} className={`border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${days === value ? "border-gold text-gold bg-gold/10" : "border-border/60 text-foreground/55"}`}>
                {value} days
              </button>
            ))}
            <button type="button" onClick={() => void loadPerformance()} disabled={performanceLoading} className="ml-auto inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
              <RefreshCw size={12} className={performanceLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Clicks in loaded rows" value={totals.clicks.toLocaleString()} />
            <Metric label="Impressions in loaded rows" value={totals.impressions.toLocaleString()} />
            <Metric label="Rows" value={rows.length.toLocaleString()} />
            <Metric label="Window" value={`${days} days`} />
          </div>

          {performanceError && <ErrorBox message={performanceError} />}
          {performanceLoading ? (
            <Loading label="Loading Search Console performance…" />
          ) : rows.length === 0 && !performanceError ? (
            <Empty title="No Search Console rows yet" detail="The connected property may need impressions, or the connector may not yet have access to this property." />
          ) : (
            <div className="border border-border/60 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr><th className="text-left py-3 px-4">{dimension}</th><th className="text-right py-3 px-4">Clicks</th><th className="text-right py-3 px-4">Impressions</th><th className="text-right py-3 px-4">CTR</th><th className="text-right py-3 px-4">Position</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((row, index) => (
                    <tr key={`${row.keys[0]}-${index}`} className="border-t border-border/40">
                      <td className="py-2.5 px-4 text-foreground/85 max-w-md break-all">{row.keys[0]}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{row.clicks}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-foreground/70">{row.impressions}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-foreground/70">{(row.ctr * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-foreground/70">{Number(row.position || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-5">
          <div className="border border-border/60 bg-card/25 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h3 className="font-display text-2xl">Inspect up to 25 canonical URLs</h3>
                <p className="text-xs text-foreground/55 mt-2">One URL per line. Only URLs on www.irhaapparels.com are accepted by this interface.</p>
              </div>
              <button type="button" onClick={() => void loadSitemapUrls()} disabled={sitemapLoading} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
                {sitemapLoading ? <Loader2 size={12} className="animate-spin" /> : <Globe2 size={12} />} Load sitemap URLs
              </button>
            </div>
            <textarea value={urlText} onChange={(event) => setUrlText(event.target.value)} rows={11} className="w-full bg-input border border-border focus:border-gold outline-none px-4 py-3 text-xs font-mono resize-y" />
            <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">{normalizeUrls(urlText).length} URL{normalizeUrls(urlText).length === 1 ? "" : "s"} selected</p>
              <button type="button" onClick={() => void inspectUrls()} disabled={inspectionLoading} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">
                {inspectionLoading ? <Loader2 size={12} className="animate-spin" /> : <FileSearch size={12} />} Run read-only inspection
              </button>
            </div>
          </div>

          {inspections.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Pass" value={counts.ready.toString()} tone="ready" />
              <Metric label="Review" value={counts.partial.toString()} tone="partial" />
              <Metric label="Blocked / error" value={counts.blocked.toString()} tone="blocked" />
            </div>
          )}

          {inspectionError && <ErrorBox message={inspectionError} />}
          {inspectionLoading ? (
            <Loading label="Inspecting Google's latest known URL state…" />
          ) : inspections.length === 0 && !inspectionError ? (
            <Empty title="No URLs inspected in this session" detail="Run the read-only inspection to see coverage, robots, crawl and canonical evidence." />
          ) : (
            <div className="space-y-3">
              {inspections.map((result) => <InspectionCard key={result.url} result={result} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function InspectionCard({ result }: { result: Inspection }) {
  const tone = statusTone(result);
  const style = tone === "ready" ? "border-emerald-500/40 text-emerald-300" : tone === "partial" ? "border-amber-500/40 text-amber-300" : "border-red-500/40 text-red-300";
  const Icon = tone === "ready" ? CheckCircle2 : tone === "partial" ? AlertTriangle : XCircle;
  const canonicalMismatch = Boolean(result.userCanonical && result.googleCanonical && result.userCanonical !== result.googleCanonical);
  return (
    <article className="border border-border/60 bg-card/25 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <a href={result.url} target="_blank" rel="noreferrer noopener" className="font-mono text-xs text-gold hover:underline break-all inline-flex items-center gap-1">{result.url}<ExternalLink size={10} /></a>
          <p className="text-sm mt-2">{result.error || result.coverageState || "No coverage state returned"}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${style}`}><Icon size={11} />{result.error ? "Error" : result.verdict || "Unknown"}</span>
      </div>
      {!result.error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          <Evidence label="Indexing" value={result.indexingState} />
          <Evidence label="Robots" value={result.robotsTxtState} />
          <Evidence label="Page fetch" value={result.pageFetchState} />
          <Evidence label="Last crawl" value={formatDate(result.lastCrawlTime)} />
        </div>
      )}
      {canonicalMismatch && <div className="mt-4 border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">Google canonical differs from the declared canonical. Review both URLs before changing code.</div>}
      {!result.error && (
        <details className="mt-4 border-t border-border/40 pt-3">
          <summary className="cursor-pointer text-[9px] uppercase tracking-[0.16em] text-gold/80">Canonical and sitemap evidence</summary>
          <div className="mt-3 space-y-2 text-xs text-foreground/60 break-all">
            <p><span className="text-foreground/40">Declared:</span> {result.userCanonical || "—"}</p>
            <p><span className="text-foreground/40">Google:</span> {result.googleCanonical || "—"}</p>
            <p><span className="text-foreground/40">Sitemap:</span> {result.sitemap?.join(", ") || "—"}</p>
            {result.inspectionLink && <a href={result.inspectionLink} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-gold hover:underline">Open in Search Console <ExternalLink size={10} /></a>}
          </div>
        </details>
      )}
    </article>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.18em] border-b-2 ${active ? "border-gold text-gold" : "border-transparent text-foreground/50"}`}>{icon}{label}</button>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ready" | "partial" | "blocked" }) {
  const color = tone === "ready" ? "text-emerald-300" : tone === "partial" ? "text-amber-300" : tone === "blocked" ? "text-red-300" : "text-foreground";
  return <div className="border border-border/60 bg-card/25 p-4"><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className={`font-display text-3xl mt-1 ${color}`}>{value}</p></div>;
}

function Evidence({ label, value }: { label: string; value?: string }) {
  return <div className="border border-border/50 bg-background/35 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-foreground/40">{label}</p><p className="mt-1 break-words">{value || "—"}</p></div>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="border border-red-500/40 bg-red-500/10 text-red-200 p-4 text-sm flex gap-3"><XCircle size={17} className="shrink-0 mt-0.5" /><span>{message}</span></div>;
}

function Loading({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 size={22} className="animate-spin mx-auto mb-3" />{label}</div>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="border border-dashed border-border/60 bg-card/20 p-10 text-center"><Search size={25} className="mx-auto text-muted-foreground mb-3" /><h3 className="font-display text-xl">{title}</h3><p className="text-xs text-muted-foreground mt-2 max-w-xl mx-auto">{detail}</p></div>;
}
