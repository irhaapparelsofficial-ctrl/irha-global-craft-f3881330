import { createClient } from "npm:@supabase/supabase-js@2";
import { MAX_MESSAGE_CHARS } from "./core.ts";

let serviceClient: ReturnType<typeof createClient> | null = null;
export function service() {
  serviceClient ??= createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}

let catalogueCache: { value: string; expiresAt: number } | null = null;
export async function catalogueContext() {
  if (catalogueCache && catalogueCache.expiresAt > Date.now()) return catalogueCache.value;
  try {
    const [categories, products] = await Promise.all([
      service().from("categories").select("slug,name,short").eq("is_published", true).order("sort_order"),
      service().from("products").select("name,slug,categories!inner(name,slug)").eq("is_published", true).order("sort_order").limit(300),
    ]);
    const categoryLines = (categories.data ?? []).map((item: any) =>
      `- ${item.name} (/products/${item.slug})${item.short ? ` — ${item.short}` : ""}`
    );
    const grouped = new Map<string, string[]>();
    for (const item of (products.data ?? []) as any[]) {
      const category = item.categories?.name ?? "Other";
      grouped.set(category, [...(grouped.get(category) ?? []), item.name]);
    }
    const productLines = [...grouped.entries()].map(([category, names]) =>
      `- ${category}: ${names.slice(0, 20).join(", ")}${names.length > 20 ? ` …(+${names.length - 20} more)` : ""}`
    );
    const value = `\nLIVE CATALOGUE DATA:\n${categoryLines.join("\n")}\n\nPUBLISHED PRODUCTS:\n${productLines.join("\n")}\n`;
    catalogueCache = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
    return value;
  } catch (error) {
    console.warn("catalogue context unavailable", error);
    return "";
  }
}

export async function resolveSessionId(value: unknown, req: Request) {
  if (typeof value === "string" && /^[A-Za-z0-9:_-]{8,100}$/.test(value)) return value;
  const fingerprint = `${req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown"}|${req.headers.get("user-agent") ?? "unknown"}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `legacy-${hex.slice(0, 32)}`;
}

export async function persistExchange(sessionId: string, userMessage: string, assistantMessage: string) {
  if (!userMessage.trim() || !assistantMessage.trim()) return;
  const { error } = await service().from("chat_messages").insert([
    { session_id: sessionId, role: "user", message: userMessage.slice(0, MAX_MESSAGE_CHARS) },
    { session_id: sessionId, role: "assistant", message: assistantMessage.slice(0, MAX_MESSAGE_CHARS) },
  ]);
  if (error) console.error("chat persistence failed", error.message);
}
