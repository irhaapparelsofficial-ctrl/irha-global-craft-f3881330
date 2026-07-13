# Lead, Outreach and WhatsApp RLS optimization — 2026-07-13

## Scope

Optimize private Lead Acquisition, Outreach, Email transport and WhatsApp policies so authenticated identity and service-role identity are initialized once per query.

## Live activation

Applied to owner Supabase project `pvzjiozismyxqrzmtfbi` as migration:

`20260713205559_optimize_lead_outreach_whatsapp_rls_auth_initplan`

## Verification

- owner admin access remained available;
- owner could see the existing four lead campaigns;
- non-admin authenticated access remained blocked;
- service-role transport state remained readable;
- no outreach message, email send log or WhatsApp message was created;
- focused direct per-row Auth calls remaining: 0.

## Safety

Suppression, unsubscribe, approval and transport boundaries remain unchanged. No lead was imported and no email or WhatsApp message was sent.
