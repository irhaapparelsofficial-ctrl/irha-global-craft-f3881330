# Final Backend Activation Addendum — AI Business Rules

Include this addendum in the single final Lovable/Supabase activation batch.

## Migration

Apply after the existing AI Command Center foundation:

`supabase/migrations/20260712213000_ai_business_rules_master.sql`

## Required evidence

Verify:

- `public.ai_business_rules` exists
- RLS is enabled
- only authenticated admins and service role can read/write it
- singleton constraint permits only `id = 'default'`
- status accepts only `draft`, `approved`, `archived`
- JSON rules object check exists
- `trg_ai_business_rules_updated` exists

## Data import

1. Export the approved JSON from Admin → AI → Business Rules.
2. Insert or update the singleton row with `id = 'default'`.
3. Preserve `version`, `status`, approval identity and timestamps.
4. Do not mark the row approved unless the frontend readiness score is 100% and the owner approved it.

## Runtime enforcement

Before external or commercial AI actions:

- `admin-agent` must read the approved Business Rules row.
- `admin-agent-execute` must read it again at execution time.
- Missing or draft rules must block final quotations, discounts, payment terms, production commitments and complaint settlements.
- Unknown commercial facts must be escalated rather than guessed.
- Safe acknowledgements, approved catalogue delivery and qualification questions may follow the configured authority matrix.

## Controlled test

- Load the approved rules row through an authenticated admin read.
- Run one internal planning command.
- Confirm the resulting action payload contains a rules version/reference.
- Do not execute a real email, social publish, quotation or commercial commitment.
