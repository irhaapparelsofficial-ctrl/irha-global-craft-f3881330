// Sync FOB Pricing + Social Broadcast
// POST /functions/v1/sync-pricing
// Body: { productId: uuid, targetQuantity?: number, targetCurrency?: 'USD'|'EUR'|'GBP', pushToSocial?: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Currency = "USD" | "EUR" | "GBP";

const CURRENCY: Record<Currency, { rate: number; symbol: string }> = {
  USD: { rate: 1.0, symbol: "$" },
  EUR: { rate: 0.92, symbol: "€" },
  GBP: { rate: 0.78, symbol: "£" },
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  details: Record<string, unknown> | null;
  material_specifications: string | null;
};

function num(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) && (n as number) > 0 ? (n as number) : fallback;
}

function calculateMasterFOB(product: ProductRow, quantity: number, currency: Currency) {
  // Production attributes (use details jsonb when present, else defaults tuned for Sialkot export rates)
  const d = (product.details ?? {}) as Record<string, unknown>;
  const fabricCostPerYard = num(d.fabric_cost_per_yard, 6.5);
  const fabricYards = num(d.fabric_yards_per_unit, 2.2);
  const trimsCost = num(d.trims_cost_per_unit, 1.8);
  const cmCost = num(d.cut_make_cost_per_unit, 3.5); // cut+make labor
  const packagingCost = num(d.packaging_cost_per_unit, 0.6);

  const baseProductionCost = fabricCostPerYard * fabricYards + trimsCost + cmCost + packagingCost;

  // Volume-tier discount
  const bulkDiscount = quantity >= 1000 ? 0.85 : quantity >= 500 ? 0.92 : quantity >= 300 ? 0.96 : 1.0;
  // Margin tier
  const marginMultiplier = quantity >= 1000 ? 1.18 : quantity >= 300 ? 1.22 : 1.28;

  const compiledBasePrice = baseProductionCost * bulkDiscount * marginMultiplier;

  // Export handling / port / compliance
  const exportHandlingFactor = 1.1;
  const absoluteFOB_USD = compiledBasePrice * exportHandlingFactor;

  const cfg = CURRENCY[currency] ?? CURRENCY.USD;
  const finalFOB = absoluteFOB_USD * cfg.rate;

  return {
    baseProductionCost: Number(baseProductionCost.toFixed(2)),
    finalFOB: Number(finalFOB.toFixed(2)),
    bulkDiscount,
    marginMultiplier,
    currency,
    currencySymbol: cfg.symbol,
    formattedPrice: `${cfg.symbol}${finalFOB.toFixed(2)}`,
  };
}

async function postToMeta(message: string) {
  const token = Deno.env.get("META_ACCESS_TOKEN");
  const pageId = Deno.env.get("META_PAGE_ID");
  if (!token || !pageId) return { ok: false, network: "meta", error: "Missing META credentials" };
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: token }),
    });
    const body = await res.text();
    return { ok: res.ok, network: "meta", status: res.status, body };
  } catch (e) {
    return { ok: false, network: "meta", error: (e as Error).message };
  }
}

async function postToLinkedIn(message: string) {
  const token = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
  const orgId = Deno.env.get("LINKEDIN_ORG_ID");
  if (!token || !orgId) return { ok: false, network: "linkedin", error: "Missing LinkedIn credentials" };
  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:organization:${orgId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: message },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const body = await res.text();
    return { ok: res.ok, network: "linkedin", status: res.status, body };
  } catch (e) {
    return { ok: false, network: "linkedin", error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const productId = typeof body.productId === "string" ? body.productId : null;
    const targetQuantity = Number.isFinite(body.targetQuantity) ? Math.max(50, Math.floor(body.targetQuantity)) : 300;
    const targetCurrency: Currency = ["USD", "EUR", "GBP"].includes(body.targetCurrency) ? body.targetCurrency : "USD";
    const pushToSocial = Boolean(body.pushToSocial);

    if (!productId) {
      return new Response(JSON.stringify({ error: "productId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product, error: dbError } = await supabase
      .from("products")
      .select("id, slug, name, details, material_specifications")
      .eq("id", productId)
      .maybeSingle();

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!product) {
      return new Response(JSON.stringify({ error: "Product profile not found in database." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pricing = calculateMasterFOB(product as ProductRow, targetQuantity, targetCurrency);

    let socialResults: Array<Record<string, unknown>> = [];
    if (pushToSocial) {
      const message = `B2B Export Update: New quotation available for ${product.name}. FOB Estimate: ${pricing.formattedPrice} per unit (MOQ: ${targetQuantity}). Contact IRHA Apparels for customized manufacturing catalogs.`;
      const settled = await Promise.allSettled([postToMeta(message), postToLinkedIn(message)]);
      socialResults = settled.map((r) =>
        r.status === "fulfilled" ? r.value : { ok: false, error: String(r.reason) },
      );

      // Log to social_posts for traceability (best-effort)
      await supabase
        .from("social_posts")
        .insert(
          socialResults
            .filter((r) => typeof r.network === "string")
            .map((r) => ({
              platform: r.network as string,
              content: message,
              status: r.ok ? "published" : "failed",
              metadata: { productId, pricing, response: r },
            })),
        )
        .then(() => {}, () => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        sku: (product as ProductRow).slug,
        productName: product.name,
        pricing,
        socialBroadcast: pushToSocial,
        socialResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
