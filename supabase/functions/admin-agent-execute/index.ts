// Executes an approved Irha AI action.
// Admin-only. Never treats connector verification as a successful publish.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  actionGuard,
  loadAiBusinessRules,
  rulesReference,
} from "../_shared/ai-business-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const actionId = typeof body?.action_id === "string" ? body.action_id : "";
    if (!actionId) return json({ error: "action_id is required" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: action, error: actionError } = await service
      .from("ai_actions")
      .select("*")
      .eq("id", actionId)
      .maybeSingle();
    if (actionError || !action) return json({ error: "Action not found" }, 404);
    if (!action.requires_approval) return json({ error: "This action does not require execution approval" }, 400);
    if (!["proposed", "approved", "failed"].includes(action.status)) {
      return json({ error: `Action cannot run from status ${action.status}` }, 409);
    }

    const rulesState = await loadAiBusinessRules(service);
    const guard = actionGuard(action.action_type, action.payload, action.description, rulesState);
    if (!guard.executable) {
      return json({
        error: "Execution blocked by Business Rules",
        reason: guard.reason,
        action_id: action.id,
        rules_reference: rulesReference(rulesState),
      }, 409);
    }

    const plannedRulesVersion = readPlannedRulesVersion(action.payload);
    if (plannedRulesVersion !== null && rulesState.version !== plannedRulesVersion) {
      return json({
        error: "Business Rules changed after this action was planned",
        reason: "Re-run the AI plan so the action uses the current approved rules version.",
        action_id: action.id,
        planned_rules_version: plannedRulesVersion,
        current_rules_version: rulesState.version,
      }, 409);
    }

    const approvedAt = new Date().toISOString();
    await service
      .from("ai_actions")
      .update({
        status: "running",
        approved_by: user.id,
        approved_at: approvedAt,
        error: null,
      })
      .eq("id", action.id);

    let result: Record<string, unknown>;
    try {
      if (action.action_type === "social_publish") {
        result = await executeSocialPublish(action.payload, authHeader);
      } else if (action.action_type === "listing_task") {
        result = await executeListingTask(service, action.payload);
      } else {
        throw new Error(`Execution is not enabled for ${action.action_type}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution failed";
      result = {
        ok: false,
        error: message,
        external_execution: false,
        rules_reference: rulesReference(rulesState),
      };
    }

    result = {
      ...result,
      rules_reference: rulesReference(rulesState),
      owner_approved_by: user.id,
      owner_approved_at: approvedAt,
    };

    const completed = result.ok === true;
    await service
      .from("ai_actions")
      .update({
        status: completed ? "completed" : "failed",
        result,
        error: completed ? null : String(result.error || "Action did not complete"),
        executed_at: new Date().toISOString(),
      })
      .eq("id", action.id);

    await finalizeRun(service, action.run_id);
    return json({ ok: completed, action_id: action.id, result }, completed ? 200 : 422);
  } catch (error) {
    console.error("admin-agent-execute error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function executeSocialPublish(payload: unknown, authHeader: string) {
  const value = isRecord(payload) ? payload : {};
  const productId = typeof value.productId === "string" ? value.productId : "";
  const allowed = new Set(["facebook", "instagram", "linkedin", "tiktok"]);
  const channels = Array.isArray(value.channels)
    ? value.channels.filter((item): item is string => typeof item === "string" && allowed.has(item))
    : [];
  if (!productId || channels.length === 0) {
    return { ok: false, error: "Valid productId and at least one supported channel are required", external_execution: false };
  }

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/social-multi-sync`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, channels }),
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 1000) };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: `Social backend returned ${response.status}`,
      response: data,
      external_execution: false,
    };
  }

  const summary = isRecord(data.summary) ? data.summary : {};
  const published = Array.isArray(summary.published) ? summary.published : [];
  const verified = Array.isArray(summary.verified) ? summary.verified : [];
  const failed = Array.isArray(summary.failed) ? summary.failed : [];
  const skipped = Array.isArray(summary.skipped) ? summary.skipped : [];
  const publishedSomething = published.length > 0;

  return {
    ok: publishedSomething,
    partial: !publishedSomething && verified.length > 0,
    external_execution: publishedSomething,
    published,
    verified_only: verified,
    failed,
    skipped,
    note: verified.length > 0
      ? "Verified-only channels were not counted as published."
      : "Only channels reported in published were treated as published.",
    response: data,
    error: publishedSomething
      ? null
      : verified.length > 0
        ? "Channel connection was verified, but no post was published"
        : "No selected channel published successfully",
  };
}

async function executeListingTask(service: ReturnType<typeof createClient>, payload: unknown) {
  const value = isRecord(payload) ? payload : {};
  const platform = typeof value.platform === "string" ? value.platform.trim().slice(0, 120) : "";
  const profileUrl = typeof value.profile_url === "string" && value.profile_url.trim()
    ? safeUrl(value.profile_url)
    : null;
  const accountName = typeof value.account_name === "string" ? value.account_name.trim().slice(0, 180) || null : null;
  const nextAction = typeof value.next_action === "string" ? value.next_action.trim().slice(0, 1200) : "";
  const notes = typeof value.notes === "string" ? value.notes.trim().slice(0, 4000) || null : null;
  const allowedStatuses = new Set(["not_started", "in_progress", "pending_verification", "active", "needs_attention", "paused", "rejected"]);
  const requestedStatus = typeof value.status === "string" && allowedStatuses.has(value.status) ? value.status : "not_started";
  const status = requestedStatus === "active" && !profileUrl ? "pending_verification" : requestedStatus;
  if (!platform || !nextAction) {
    return { ok: false, error: "platform and next_action are required", external_execution: false };
  }

  let query = service.from("business_listings").select("id").ilike("platform", platform).limit(1);
  query = profileUrl ? query.eq("profile_url", profileUrl) : query.is("profile_url", null);
  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) return { ok: false, error: findError.message, external_execution: false };

  const values = {
    platform,
    account_name: accountName,
    profile_url: profileUrl,
    status,
    verification_level: status === "active" ? "self_reported" : "unverified",
    next_action: nextAction,
    notes,
    source: "ai-command-center",
    last_verified_at: null,
  };

  if (existing?.id) {
    const { data, error } = await service
      .from("business_listings")
      .update(values)
      .eq("id", existing.id)
      .select("*")
      .single();
    return error
      ? { ok: false, error: error.message, external_execution: false }
      : {
          ok: true,
          operation: "updated",
          listing: data,
          internal_registry_only: true,
          external_platform_changed: false,
          status_adjusted: requestedStatus !== status,
        };
  }

  const { data, error } = await service.from("business_listings").insert(values).select("*").single();
  return error
    ? { ok: false, error: error.message, external_execution: false }
    : {
        ok: true,
        operation: "created",
        listing: data,
        internal_registry_only: true,
        external_platform_changed: false,
        status_adjusted: requestedStatus !== status,
      };
}

async function finalizeRun(service: ReturnType<typeof createClient>, runId: string) {
  const { data } = await service.from("ai_actions").select("status").eq("run_id", runId);
  const statuses = (data ?? []).map((row: { status: string }) => row.status);
  let runStatus = "planned";
  if (statuses.some((status: string) => ["proposed", "approved", "running"].includes(status))) {
    runStatus = "planned";
  } else if (statuses.some((status: string) => status === "failed") && statuses.some((status: string) => status === "completed")) {
    runStatus = "partial";
  } else if (statuses.length > 0 && statuses.every((status: string) => status === "rejected")) {
    runStatus = "cancelled";
  } else if (statuses.some((status: string) => status === "failed")) {
    runStatus = "failed";
  } else {
    runStatus = "completed";
  }
  await service.from("ai_runs").update({ status: runStatus }).eq("id", runId);
}

function readPlannedRulesVersion(payload: unknown) {
  if (!isRecord(payload)) return null;
  const reference = isRecord(payload._rules_reference) ? payload._rules_reference : null;
  return reference && typeof reference.version === "number" ? reference.version : null;
}

function safeUrl(input: string) {
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
