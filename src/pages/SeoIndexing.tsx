import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
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
const SITE_PROPERTY = "https://www.irhaapparels.com/";

function verdictBadge(v?: string) {
  if (!v) return <Badge variant="secondary">Unknown</Badge>;
  if (v === "PASS") return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Indexed</Badge>;
  if (v === "FAIL") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Not indexed</Badge>;
  if (v === "PARTIAL") return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
  return <Badge variant="secondary">{v}</Badge>;
}

export default function SeoIndexing() {
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
      // Chunk to 10 per call (function caps at 25, sequential per call)
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
            Live Google Search Console status for every URL in your sitemap. Use this to spot pages
            Google has dropped, slow-crawled, or never seen.
          </p>
        </div>

        {/* Checklist */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold mb-3">Indexing Checklist</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> Site verified in Google Search Console ({SITE_PROPERTY})</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> Sitemap submitted: <a className="underline" href={`${GSC_BASE}/sitemaps?resource_id=${encodeURIComponent(SITE_PROPERTY)}`} target="_blank" rel="noreferrer">open Sitemaps report</a></li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> robots.txt allows crawling: <a className="underline" href="/robots.txt" target="_blank" rel="noreferrer">view</a></li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> Canonical tags on every page (handled by &lt;SEO/&gt;)</li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" /> After each deploy, request re-indexing for changed URLs (use the buttons below)</li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" /> Monitor <a className="underline" href={`${GSC_BASE}/performance/search-analytics?resource_id=${encodeURIComponent(SITE_PROPERTY)}`} target="_blank" rel="noreferrer">Performance</a> and <a className="underline" href={`${GSC_BASE}/index/coverage?resource_id=${encodeURIComponent(SITE_PROPERTY)}`} target="_blank" rel="noreferrer">Coverage</a> weekly</li>
          </ul>
        </Card>

        {/* Stats + actions */}
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
            onClick={() => inspectBatch(visibleUrls)}
            disabled={loading || visibleUrls.length === 0}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
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

        {/* Results table */}
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
                  const path = url.replace(SITE_PROPERTY.replace(/\/$/, ""), "") || "/";
                  const inspectInGsc = `${GSC_BASE}/inspect?resource_id=${encodeURIComponent(SITE_PROPERTY)}&id=${encodeURIComponent(url)}`;
                  return (
                    <tr key={url} className="border-t">
                      <td className="p-3 max-w-[280px]">
                        <div className="truncate font-mono text-xs">{path}</div>
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
                          <Button size="sm" variant="ghost" onClick={() => inspectBatch([url])} disabled={loading}>
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <a href={inspectInGsc} target="_blank" rel="noreferrer">
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
