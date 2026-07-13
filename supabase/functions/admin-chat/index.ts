// Irha Atelier AI — zero-credit lead operations chat.
// Admin-only. Uses the internal lead-research Edge Function; no Lovable AI or paid search credits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DbClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const command = [...messages]
      .reverse()
      .find((item) => item && item.role === "user" && typeof item.content === "string")?.content?.trim()
      ?.slice(0, 4000) ?? "";
    if (!command) return json({ error: "messages required" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const reply = await handleCommand(command, authHeader, service);
    return streamText(reply);
  } catch (error) {
    console.error("admin-chat zero-credit error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function handleCommand(command: string, authHeader: string, service: DbClient) {
  const value = command.toLowerCase();

  if (/(lead|buyer|prospect).*(status|count|kitn|haal)|(?:status|count|kitn|haal).*(lead|buyer|prospect)/i.test(value)) {
    return await leadStatus(service);
  }

  if (/(import|crm).*(verified|lead|buyer)|verified.*(import|crm)/i.test(value)) {
    const { data, error } = await service
      .from("lead_candidates")
      .select("id")
      .eq("verification_status", "verified")
      .limit(100);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((row: { id: string }) => row.id);
    if (!ids.length) return "Abhi koi verified lead CRM import ke liye available nahi. Pehle `verify leads` command chalao.";
    const result = await callLeadResearch(authHeader, { action: "import", candidate_ids: ids });
    return `CRM import complete.\n\nImported: ${number(result.imported_count)}\nSkipped: ${number(result.skipped_count)}\n\nSirf verified aur non-duplicate leads import ki gayi hain.`;
  }

  if (/(verify|enrich|scan|check).*(lead|buyer|prospect)|(?:lead|buyer|prospect).*(verify|enrich|scan|check)/i.test(value)) {
    const { data, error } = await service
      .from("lead_candidates")
      .select("id")
      .in("verification_status", ["unverified", "needs_review"])
      .limit(20);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((row: { id: string }) => row.id);
    if (!ids.length) return "Verification ke liye koi pending lead nahi. Nayi leads dhoondhne ka command do, misal: `Germany se 20 Lederhosen wholesalers find karo`.";
    const result = await callLeadResearch(authHeader, { action: "enrich", candidate_ids: ids });
    const summary = isRecord(result.summary) ? result.summary : {};
    return `Lead verification complete.\n\nVerified: ${number(summary.verified)}\nNeeds review: ${number(summary.needs_review)}\nRejected: ${number(summary.rejected)}\nDuplicate: ${number(summary.duplicate)}\nFailed: ${number(summary.failed)}\n\nExternal credits used: 0`;
  }

  if (isLeadCommand(value)) {
    const campaign = parseCampaign(command);
    const result = await callLeadResearch(authHeader, { action: "discover", campaign });
    const counts = isRecord(result.counts) ? result.counts : {};
    return `Real public-source buyer search complete.\n\nMarket: ${campaign.market}\nProducts: ${campaign.product_focus.join(", ")}\nBuyer types: ${campaign.buyer_types.join(", ")}\nRequested: ${campaign.target_count}\nDiscovered: ${number(result.inserted)}\nNeeds review: ${number(counts.needs_review)}\nDuplicates: ${number(counts.duplicate)}\nCampaign ID: ${String(result.campaign_id ?? "-")}\n\nCredits used: 0\n\nAgla command: \`verify leads\`, phir \`import verified leads to CRM\`.`;
  }

  return "Zero-credit AI mode active hai. Main ab direct real buyer discovery chala sakta hun. Misal: `Germany se 25 Lederhosen wholesalers find karo`, `verify leads`, `import verified leads to CRM`, ya `lead status`. Is mode mein Lovable AI aur Firecrawl credits use nahi hote.";
}

async function leadStatus(service: DbClient) {
  const [campaigns, candidates, verified, imported, crm] = await Promise.all([
    service.from("lead_campaigns").select("id", { count: "exact", head: true }),
    service.from("lead_candidates").select("id", { count: "exact", head: true }),
    service.from("lead_candidates").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    service.from("lead_candidates").select("id", { count: "exact", head: true }).eq("verification_status", "imported"),
    service.from("b2b_leads").select("id", { count: "exact", head: true }),
  ]);
  return `Lead Engine status:\n\nCampaigns: ${campaigns.count ?? 0}\nCandidates: ${candidates.count ?? 0}\nVerified awaiting import: ${verified.count ?? 0}\nImported candidates: ${imported.count ?? 0}\nCRM buyer records: ${crm.count ?? 0}\n\nBilling mode: zero external credits`;
}

async function callLeadResearch(authHeader: string, payload: JsonRecord) {
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/lead-research`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data: JsonRecord = {};
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { error: text.slice(0, 800) };
  }
  if (!response.ok) throw new Error(String(data.error ?? `Lead engine returned ${response.status}`));
  return data;
}

function parseCampaign(command: string) {
  const lower = command.toLowerCase();
  const countMatch = lower.match(/\b(\d{1,3})\b/);
  const targetCount = clamp(countMatch ? Number(countMatch[1]) : 25, 1, 100);

  const markets: Array<[RegExp, string]> = [
    [/\b(germany|deutschland)\b/i, "Germany"],
    [/\b(austria|österreich|osterreich)\b/i, "Austria"],
    [/\b(switzerland|schweiz)\b/i, "Switzerland"],
    [/\b(united kingdom|uk|england|britain)\b/i, "United Kingdom"],
    [/\b(united states|usa|u\.s\.a|america)\b/i, "United States"],
    [/\b(canada)\b/i, "Canada"],
    [/\b(australia)\b/i, "Australia"],
    [/\b(uae|united arab emirates|dubai)\b/i, "United Arab Emirates"],
    [/\b(azerbaijan|baku)\b/i, "Azerbaijan"],
    [/\b(netherlands|holland)\b/i, "Netherlands"],
    [/\b(spain|españa|espana)\b/i, "Spain"],
    [/\b(france)\b/i, "France"],
    [/\b(italy|italia)\b/i, "Italy"],
    [/\b(belgium)\b/i, "Belgium"],
    [/\b(poland)\b/i, "Poland"],
    [/\b(czech|czechia)\b/i, "Czechia"],
  ];
  const market = markets.find(([pattern]) => pattern.test(lower))?.[1] ?? "Germany";

  const productMap: Array<[RegExp, string]> = [
    [/\blederhosen|lederhose|trachtenhose\b/i, "Lederhosen"],
    [/\bdirndl|trachtenkleid\b/i, "Dirndl"],
    [/\btrachten|bavarian|oktoberfest\b/i, "Bavarian & Trachten"],
    [/\bsportswear|teamwear|football kit|soccer kit|tracksuit\b/i, "Sportswear"],
    [/\bleatherwear|leather jacket|biker jacket|lederjacke\b/i, "Premium Leather"],
    [/\bstreetwear|activewear|hoodie|jogger\b/i, "Streetwear & Activewear"],
    [/\bnightwear|sleepwear|pajama|pyjama|loungewear\b/i, "Leisurewear & Nightwear"],
    [/\bbusiness suit|formal suit|suiting\b/i, "Business Suits"],
  ];
  const productFocus = unique(productMap.filter(([pattern]) => pattern.test(lower)).map(([, label]) => label));
  if (!productFocus.length) productFocus.push("Bavarian & Trachten");

  const buyerMap: Array<[RegExp, string]> = [
    [/\bwholesaler|wholesale|großhandel|grosshandel\b/i, "wholesaler"],
    [/\bimporter|importeur\b/i, "importer"],
    [/\bdistributor|vertrieb\b/i, "distributor"],
    [/\bretailer|retail|shop|store|boutique|händler\b/i, "retailer"],
    [/\bprivate[ -]?label|brand\b/i, "private-label brand"],
    [/\be-?commerce|webshop|online seller\b/i, "ecommerce seller"],
  ];
  const buyerTypes = unique(buyerMap.filter(([pattern]) => pattern.test(lower)).map(([, label]) => label));
  if (!buyerTypes.length) buyerTypes.push("wholesaler", "importer", "distributor", "retailer", "private-label brand");

  return {
    name: `${market} · ${productFocus.slice(0, 2).join(" + ")} · AI zero-credit`,
    market,
    product_focus: productFocus,
    buyer_types: buyerTypes,
    target_count: targetCount,
  };
}

function isLeadCommand(value: string) {
  return /\b(lead|leads|buyer|buyers|prospect|prospects|wholesaler|wholesale|importer|distributor|retailer|private[ -]?label)\b/i.test(value) &&
    /\b(find|search|dhoond|dhund|nikal|discover|research|lao|laye|bring|chahiye|chaya)\b/i.test(value);
}

function streamText(content: string) {
  const id = `chatcmpl-${crypto.randomUUID()}`;
  const first = JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }] });
  const last = JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
  return new Response(`data: ${first}\n\ndata: ${last}\n\ndata: [DONE]\n\n`, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
    },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function unique(values: string[]) {
  return [...new Set(values)];
}
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
function number(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
