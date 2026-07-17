// Repository-controlled RFQ runtime release marker.
//
// This file intentionally lives under supabase/functions so the post-Quality
// deployment workflow reconciles every committed Edge Function after the
// relational RFQ migrations are ledgered. It contains no secret and is safe to
// import from future functions that need to expose runtime diagnostics.
export const RFQ_RUNTIME_RELEASE = "2026-07-17-rfq-v1" as const;

export const RFQ_RUNTIME_COMPONENTS = Object.freeze([
  "public-lead-gateway",
  "notification-dispatcher",
  "meta-webhook",
] as const);
