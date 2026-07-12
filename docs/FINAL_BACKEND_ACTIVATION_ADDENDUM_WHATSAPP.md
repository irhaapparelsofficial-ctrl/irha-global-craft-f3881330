# Final Backend Activation Addendum — WhatsApp Business

Include this module in the single final Lovable/Supabase activation batch. Do not publish or send a real buyer message during activation without separate owner approval.

## Migration

Apply:

`supabase/migrations/20260712230000_whatsapp_business_inbox.sql`

## Deploy exact repository functions

- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-admin/index.ts`

Function configuration is already declared in `supabase/config.toml`:

- `whatsapp-webhook`: `verify_jwt = false` because Meta must call it publicly; GET verification requires the verify token and every POST requires a valid `x-hub-signature-256` HMAC signature.
- `whatsapp-admin`: `verify_jwt = true` plus the source performs an admin-role check.

## Required secrets and runtime configuration

Configure through Lovable/Supabase secrets. Never store values in GitHub or frontend code.

- `WHATSAPP_VERIFY_TOKEN`
- `META_WHATSAPP_APP_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `META_GRAPH_API_VERSION`
- `WHATSAPP_CUSTOMER_SERVICE_WINDOW_HOURS`

`META_GRAPH_API_VERSION` is intentionally runtime-configured rather than hardcoded. Confirm the supported Meta Graph API version during activation.

## Required database evidence

Verify:

- `public.whatsapp_contacts`
- `public.whatsapp_conversations`
- `public.whatsapp_messages`
- `public.whatsapp_webhook_events`
- RLS is enabled on every table
- authenticated admin-only policies exist
- service role has backend access
- webhook event key and WhatsApp message ID uniqueness constraints exist
- only one active conversation per contact is permitted
- updated-at triggers and attention/status indexes exist

## Webhook verification test

1. Configure the callback URL for the deployed `whatsapp-webhook` function.
2. Complete Meta GET verification with `WHATSAPP_VERIFY_TOKEN`.
3. Send one provider test webhook or one owner-controlled inbound WhatsApp message.
4. Confirm the POST signature is accepted.
5. Confirm one webhook event, contact, active conversation, inbound message and unverified CRM lead link are recorded.
6. Replay the exact same payload and confirm it is treated as duplicate rather than creating a second message.
7. Confirm no automatic reply is sent.

## Admin health test

Call `whatsapp-admin` with `{ "action": "health" }` as an authenticated admin. Confirm:

- secret presence is reported only as booleans
- secret values are never returned
- all four tables are readable
- runtime state is `ready` only when every required secret/config/table is available
- the health call sends no message

## Draft and send boundary test

1. Create a clearly labelled internal QA draft from the admin inbox.
2. Confirm the record status is `draft` and the response says `sent: false`.
3. Confirm an opted-out/blocked contact is rejected.
4. Confirm a text message outside the configured customer-service window requires an approved template.
5. Confirm a payload containing final price, discount, payment terms or delivery commitment is rejected.
6. Do not execute a public buyer send during activation unless the owner separately approves the exact recipient and exact text.

## Owner-approved controlled send

Only after all earlier tests pass, the owner may approve one non-commercial test message to an owner-controlled WhatsApp number.

Required evidence:

- authenticated admin identity
- approved Business Rules reference/version
- exact reviewed message body or approved template name/language
- provider HTTP success
- returned WhatsApp message ID
- message status recorded as `sent`
- later webhook status updates recorded as delivered/read when received

## Runtime boundaries

- Inbound signed webhooks may create/update contacts, conversations, messages and an explicitly unverified CRM lead.
- No inbound event triggers an automatic reply.
- Outbound messages require an existing draft plus explicit owner-approved send action.
- Opted-out and blocked contacts cannot be messaged.
- Text messages require an active configured customer-service window; otherwise an approved template is required.
- Final prices, quotations, discounts, payment terms, production/delivery commitments, complaint settlements and shipment claims are blocked from automated WhatsApp execution.
- WhatsApp communication must identify the business as Irha Apparels, not use an unapproved personal sender identity.
