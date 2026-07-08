# Irha Apparels Buyer CRM

## Unified sources

The Buyer Inbox normalizes three existing sources without moving or deleting their records:

- `inquiries` — RFQ, sample, catalogue, reference and meeting requests from the inquiry wizard.
- `catalogue_leads` — catalogue-specific requests.
- `b2b_leads` — imported prospects.

## CRM fields

All three sources support:

- status
- priority
- assignee
- follow-up date/time
- sample status
- quotation link
- pro forma invoice link
- private working notes
- append-only CRM history stored on the source record

Imported prospects retain their legacy `lead_status`; `crm_status` is the Buyer Inbox source of truth and is mapped back to the legacy status so older admin modules keep working.

## Private inquiry files

Inquiry files stay in the private `inquiry-uploads` bucket. The Buyer Inbox creates a five-minute signed URL only when an authenticated admin opens a file.

## Future database migration

The schema is expressed as versioned SQL in `supabase/migrations`, so the CRM fields can be applied to the future user-owned Supabase project after the core website work is complete.
