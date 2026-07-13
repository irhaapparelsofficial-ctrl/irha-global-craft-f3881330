import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { CORS, errorText, response } from "./utils.ts";
import { connectionTest, discover, health } from "./discovery.ts";
import { enrich, importVerified, review } from "./actions.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL") || "", anon = Deno.env.get("SUPABASE_ANON_KEY") || "", service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const auth = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data } = await auth.auth.getUser(); if (!data.user) return response({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle(); if (!role) return response({ error: "Admin only" }, 403);
    const body = await req.json().catch(() => ({})), db = createClient(url, service);
    if (body.action === "health" || !body.action) return health(db);
    if (body.action === "connection_test") return connectionTest();
    if (body.action === "discover") return discover(db, data.user.id, body);
    if (body.action === "enrich") return enrich(db, data.user.id, body);
    if (body.action === "review") return review(db, data.user.id, body);
    if (body.action === "import") return importVerified(db, data.user.id, body);
    return response({ error: "Unsupported action" }, 400);
  } catch (error) { console.error("lead-research", errorText(error)); return response({ error: errorText(error) }, 500); }
});
