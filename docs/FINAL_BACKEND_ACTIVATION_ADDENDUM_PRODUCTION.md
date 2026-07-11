# Final Backend Activation Addendum — Samples & Production

Include this module in the single final Lovable/Supabase activation batch.

## Migration

Apply:

`supabase/migrations/20260712223000_sample_production_workflow.sql`

## Required evidence

Verify:

- `public.production_jobs` exists
- `public.production_job_events` exists
- RLS is enabled on both tables
- only authenticated admins and service role can read/write
- job type, stage, priority, sample, buyer approval, QC, shipping and notification constraints exist
- `trg_production_jobs_updated` exists
- stage/priority, target date, source and event-history indexes exist

## Controlled test

1. Create one clearly labelled internal QA sample job.
2. Confirm its first stage is `briefing`.
3. Add one internal stage event without sending any buyer notification.
4. Confirm unauthorized/non-admin access is denied.
5. Delete the QA job; cascading events should be removed.

## Runtime boundaries

- Internal factory status changes may be recorded by an authenticated admin.
- Buyer-facing notifications remain draft/approval controlled.
- Moving into `spec_locked`, `ready_to_ship`, `shipped`, `buyer_approved`, `completed`, `on_hold` or `cancelled` must retain owner approval evidence.
- Internal target dates must not be represented as buyer delivery promises.
- AI may summarize workflow risk and prepare internal tasks; it may not approve samples, QC exceptions, production commitments, shipment claims or buyer notifications.
