import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface InspectResult {
  url: string;
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  inspectionLink?: string;
  error?: string;
}

const GSC_BASE = "https://search.google.com/search-console";
const SITE_PROPERTY = "sc-domain:irhaapparels.com";
const CANONICAL_ORIGIN = "https://irhaapparels.com";
const SEO_RELEASE_URLS = [
  `${CANONICAL_ORIGIN}/de/bekleidungshersteller-deutschland`,
  `${CANONICAL_ORIGIN}/custom-sportswear-manufacturer-germany`,
  `${CANONICAL_ORIGIN}/de/sportbekleidung-hersteller`,
  `${CANONICAL_ORIGIN}/leather-apparel-manufacturer-germany`,
  `${CANONICAL_ORIGIN}/de/lederbekleidung-hersteller`,
];

function verdictBadge(v?: string) {
  if (!v) return <Badge variant="secondary">Unknown</Badge>;
  if (v === "PASS") return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Indexed</Badge>;
  if (v === "FAIL") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Not indexed</Badge>;
  if (v === "PARTIAL") return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
  return <Badge variant="secondary">{v}</Badge>;
}

function displayPath(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return value;
  }
}

export default function SeoIndexing() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, InspectResult>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/sitemap.xml")
      .then((r) => r.text())
      .then((xml) => {
        const matches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
        setSitemapUrls(matches);
      })
      .catch(() => toast.error("Could not load sitemap.xml"));
  }, []);

  const visibleUrls = useMemo(
    () => sitemapUrls.filter((u) => u.toLowerCase().includes(filter.toLowerCase())),
    [sitemapUrls, filter],
  );

  const stats = useMemo(() => {
    const r = Object.values(results);
    return {
      checked: r.length,
      indexed: r.filter((x) => x.verdict === "PASS").length,
      notIndexed: r.filter((x) => x.verdict === "FAIL").length,
      errors: r.filter((x) => x.error).length,
    };
  }, [results]);

  async function inspectBatch(urls: string[]) {
    if (urls.length === 0) return;
    setLoading(true);
    try {
      // Chunk to 10 per call (the Edge Function caps each request at 25 URLs).
      for (let i = 0; i < urls.length; i += 10) {
        const chunk = urls.slice(i, i + 10);
        const { data, error } = await supabase.functions.invoke("gsc-inspect", {
          body: { urls: chunk },
        });
        if (error) {
          toast.error(`Inspection failed: ${error.message}`);
          break;
        }
        const newResults: Record<string, InspectResult> = {};
        for (const r of (data?.results ?? []) as InspectResult[]) {
          newResults[r.url] = r;
        }
        setResults((prev) => ({ ...prev, ...newResults }));
      }
      toast.success("Inspection complete");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!user || !isAdmin) return <Navigate to="/auth" replace />;

  return (
    <>
      <Helmet>
        <title>SEO Indexing Monitor — Irha Apparels</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <main className="container max-w-6xl py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">SEO Indexing Monitor</h1>
          <p className="text-muted-foreground">
            Read Google Search Console index status for sitemap URLs under the verified domain property. Google requires the final “Request indexing” action to be completed manually in URL Inspection.
          </p>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="font-semibold mb-3">Indexing Checklist</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> Verified Search Console domain property: <code>{SITE_PROPERTY}</code></li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> Sitemap submitted: <a className="underline" href={`${GSC_BASE}/sitemaps?resource_id=${encodeURIComponent(SITE_PROPERTY)}`} target="_blank" rel="noreferrer">open Sitemaps report</a></li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> robots.txt allows canonical pages: <a className="underline" href="/robots.txt" target="_blank" rel="noreferrer">view</a></li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> Canonical tags and crawler-ready static HTML are deployed.</li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" /> The API can inspect index status only. Open a URL in Search Console and press <strong>Request indexing</strong> manually after the live test passes.</li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" /> Monitor <a className="underline" href={`${GSC_BASE}/performance/search-analytics?resource_id=${encodeURIComponent(SITE_PROPERTY)}`} target="_blank" rel="noreferrer">Performance</a> and <a className="underline" href={`${GSC_BASE}/index/coverage?resource_id=${encodeURIComponent(SITE_PROPERTY)}`} target="_blank" rel="noreferrer">Page indexing</a> weekly.</li>
          </ul>
        </Card>

        <div className="grid sm:grid-cols-4 gap-3 mb-4">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Sitemap URLs</div><div className="text-2xl font-bold">{sitemapUrls.length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Checked</div><div className="text-2xl font-bold">{stats.checked}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Indexed</div><div className="text-2xl font-bold text-green-600">{stats.indexed}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Not indexed</div><div className="text-2xl font-bold text-destructive">{stats.notIndexed}</div></Card>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <Input
            placeholder="Filter URLs…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs"
          />
          <Button
            onClick={() => inspectBatch(SEO_RELEASE_URLS)}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Inspect Germany release ({SEO_RELEASE_URLS.length})
          </Button>
          <Button
            variant="outline"
            onClick={() => inspectBatch(visibleUrls)}
            disabled={loading || visibleUrls.length === 0}
          >
            Inspect visible ({visibleUrls.length})
          </Button>
          <Button
            variant="outline"
            onClick={() => inspectBatch(visibleUrls.filter((u) => !results[u]))}
            disabled={loading}
          >
            Inspect unchecked only
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">URL</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Coverage</th>
                  <th className="p-3">Last crawl</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUrls.map((url) => {
                  const r = results[url];
                  const inspectInGsc = r?.inspectionLink || `${GSC_BASE}/inspect?resource_id=${encodeURIComponent(SITE_PROPERTY)}&id=${encodeURIComponent(url)}`;
                  return (
                    <tr key={url} className="border-t">
                      <td className="p-3 max-w-[280px]">
                        <div className="truncate font-mono text-xs">{displayPath(url)}</div>
                        {r?.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
                      </td>
                      <td className="p-3">{verdictBadge(r?.verdict)}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {r?.coverageState ?? "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {r?.lastCrawlTime ? new Date(r.lastCrawlTime).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => inspectBatch([url])} disabled={loading} aria-label={`Inspect ${displayPath(url)}`}>
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <a href={inspectInGsc} target="_blank" rel="noreferrer" aria-label={`Open ${displayPath(url)} in Search Console`}>
                            <Button size="sm" variant="ghost"><ExternalLink className="w-3 h-3" /></Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}