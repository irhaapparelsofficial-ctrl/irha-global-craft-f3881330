# Final Backend Activation Addendum — AI Business Rules

Include this addendum in the single final Lovable/Supabase activation batch.

## Migration

Apply after the existing AI Command Center foundation:

`supabase/migrations/20260712213000_ai_business_rules_master.sql`

## Required database evidence

Verify:

- `public.ai_business_rules` exists
- RLS is enabled
- only authenticated admins and service role can read/write it
- singleton constraint permits only `id = 'default'`
- status accepts only `draft`, `approved`, `archived`
- JSON rules object check exists
- `trg_ai_business_rules_updated` exists

## Data import

1. Export the owner-approved JSON from Admin → AI → Business Rules.
2. Insert or update the singleton row with `id = 'default'`.
3. Preserve `version`, `status`, approval identity and timestamps.
4. Do not mark the row approved unless the frontend readiness score is 100% and the owner approved it.
5. Increment `version` whenever approved commercial or authority rules change.

## Function source to deploy

Deploy the exact repository versions after the rules row exists:

- `supabase/functions/admin-agent/index.ts`
- `supabase/functions/admin-agent-execute/index.ts`
- shared guard: `supabase/functions/_shared/ai-business-rules.ts`

Preserve the existing JWT/admin checks.

## Runtime enforcement requirements

- `admin-agent` reads Business Rules before every plan.
- Requested `operate` mode is downgraded to `plan` when rules are unavailable, incomplete or not approved.
- Every run context stores the requested/effective mode and Business Rules snapshot/reference.
- Every structured action stores the rules version/reference used for planning.
- Draft/plan actions must report `external_execution: false`.
- External actions remain proposed until explicit owner approval.
- `admin-agent-execute` reads Business Rules again at execution time.
- An action planned against an older rules version must be rejected and re-planned.
- Commercial commitment language in external payloads must be rejected.
- Final quotations, discounts, payment terms, production/delivery commitments, complaint settlements and shipment claims remain owner-controlled.
- A `listing_task` updates only the internal listing registry and returns `external_platform_changed: false`.
- A social channel verification without a published post must not be returned as publish success.

## Controlled plan-only test

1. Keep the Business Rules row in `draft` state.
2. Call `admin-agent` as an authenticated admin with `mode: operate` and a harmless planning command.
3. Confirm `effective_mode` is `plan` and `operate_downgraded` is true.
4. Confirm the action payload contains a Business Rules reference.
5. Confirm no external action executes.

## Controlled approved-rules test

1. Load the 100%-complete owner-approved rules row.
2. Run one internal social-content planning command.
3. Confirm the draft reports `external_execution: false`.
4. Create one clearly labelled QA `listing_task` that changes only the internal registry.
5. Approve it as the authenticated owner/admin.
6. Confirm the result contains:
   - `internal_registry_only: true`
   - `external_platform_changed: false`
   - current Business Rules version/reference
7. Delete the QA listing record after verification.

## Social truth test

- Use a non-public or owner-controlled QA social target only when one is available.
- If the connector only verifies identity/channel access, confirm the action is not marked published.
- Do not post to any public business channel during activation unless the owner separately approves the exact content and target.

## Prohibited activation tests

Do not execute a real prospect email, final quotation, discount, payment term, production commitment, complaint settlement, shipment claim or public social post as part of activation.
