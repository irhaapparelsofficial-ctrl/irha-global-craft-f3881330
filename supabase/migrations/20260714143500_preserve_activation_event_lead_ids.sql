-- Activation events are an audit ledger. Keep the original lead UUID after a safe rollback
-- deletes the transient CRM row, rather than nulling or rejecting the audit insert.

alter table public.lead_activation_events
  drop constraint if exists lead_activation_events_lead_id_fkey;

comment on column public.lead_activation_events.lead_id is
  'Historical Buyer CRM UUID. It may reference a safely rolled-back row that no longer exists.';
