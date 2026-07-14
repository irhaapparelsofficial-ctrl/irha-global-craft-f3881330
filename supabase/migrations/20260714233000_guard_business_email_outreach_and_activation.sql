-- Large Batch 3: align candidate activation and owner-approved outreach with the
-- strict business-contact policy. This migration sends no message and imports no lead.

begin;

create or replace function public.is_irha_business_email(p_email text)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_email is null or btrim(p_email) = '' then false
    when lower(btrim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then false
    when lower(split_part(btrim(p_email), '@', 2)) = any (array[
      'gmail.com','googlemail.com','yahoo.com','yahoo.co.uk','outlook.com','hotmail.com',
      'live.com','icloud.com','me.com','aol.com','gmx.com','gmx.de','web.de',
      'proton.me','protonmail.com','mailinator.com','guerrillamail.com',
      '10minutemail.com','tempmail.com','yopmail.com','trashmail.com'
    ]) then false
    when lower(split_part(btrim(p_email), '@', 2)) ~ '(mailinator|guerrillamail|10minutemail|tempmail|yopmail|trashmail)' then false
    else true
  end;
$$;

revoke all on function public.is_irha_business_email(text) from public, anon;
grant execute on function public.is_irha_business_email(text) to authenticated, service_role;

create or replace function public.guard_personal_email_outreach_dispatch()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if coalesce(new.channel, 'email') = 'email'
     and new.status in ('approved', 'sending')
     and not public.is_irha_business_email(new.recipient_email) then
    raise exception using
      errcode = '23514',
      message = 'Personal, free, disposable, or invalid email domains cannot enter automatic outreach dispatch. Verify a business email first.';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_personal_email_outreach_dispatch() from public, anon, authenticated;
grant execute on function public.guard_personal_email_outreach_dispatch() to service_role;

drop trigger if exists outreach_messages_business_email_dispatch_guard on public.outreach_messages;
create trigger outreach_messages_business_email_dispatch_guard
before insert or update of status, channel, recipient_email
on public.outreach_messages
for each row
execute function public.guard_personal_email_outreach_dispatch();

create or replace function public.guard_candidate_import_contact_route()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_whatsapp_digits text;
begin
  if new.verification_status = 'imported'
     and (
       old.verification_status is distinct from new.verification_status
       or old.imported_lead_id is distinct from new.imported_lead_id
     ) then
    v_whatsapp_digits := regexp_replace(coalesce(new.whatsapp, ''), '[^0-9]', '', 'g');
    if not public.is_irha_business_email(new.email)
       and length(v_whatsapp_digits) not between 7 and 16 then
      raise exception using
        errcode = '23514',
        message = 'Candidate import requires a verified business email or an explicit WhatsApp number. A general phone number or personal email alone is not sufficient.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_candidate_import_contact_route() from public, anon, authenticated;
grant execute on function public.guard_candidate_import_contact_route() to service_role;

drop trigger if exists lead_candidates_import_contact_guard on public.lead_candidates;
create trigger lead_candidates_import_contact_guard
before update of verification_status, imported_lead_id, email, phone, whatsapp
on public.lead_candidates
for each row
execute function public.guard_candidate_import_contact_route();

-- Quarantine existing editable email drafts that use personal/free/disposable
-- domains. This is an internal status change only; nothing is approved or sent.
with quarantined as (
  update public.outreach_messages
     set status = 'manual_required',
         manual_reason = 'Personal/free email domain requires a verified business contact before owner approval.',
         approved_by = null,
         approved_at = null,
         dispatched_by = null,
         error = null,
         updated_at = now()
   where coalesce(channel, 'email') = 'email'
     and status in ('draft', 'approved', 'failed', 'manual_required', 'rejected')
     and not public.is_irha_business_email(recipient_email)
     and (
       status is distinct from 'manual_required'
       or manual_reason is distinct from 'Personal/free email domain requires a verified business contact before owner approval.'
     )
  returning id, campaign_id, lead_id, recipient_email
)
insert into public.outreach_events (campaign_id, message_id, lead_id, event_type, detail, actor)
select campaign_id,
       id,
       lead_id,
       'status_sync',
       jsonb_build_object(
         'reason', 'personal_or_free_email_domain',
         'new_status', 'manual_required',
         'recipient_email', recipient_email,
         'migration', '20260714233000_guard_business_email_outreach_and_activation',
         'external_message_sent', false
       ),
       null
from quarantined;

-- Recalculate campaign counters after quarantine so the approval workspace and
-- reports remain internally consistent.
update public.outreach_campaigns c
set draft_count = counts.draft_count,
    approved_count = counts.approved_count,
    sent_count = counts.sent_count,
    replied_count = counts.replied_count,
    failed_count = counts.failed_count,
    status = counts.campaign_status,
    updated_at = now()
from (
  select campaign_id,
         count(*) filter (where status = 'draft')::integer as draft_count,
         count(*) filter (where status = 'approved')::integer as approved_count,
         count(*) filter (where status in ('sent', 'replied'))::integer as sent_count,
         count(*) filter (where status = 'replied')::integer as replied_count,
         count(*) filter (where status in ('failed', 'manual_required'))::integer as failed_count,
         case
           when bool_or(status = 'sending') then 'sending'
           when bool_and(status in ('sent','replied','suppressed','rejected','unsubscribed','manual_required')) then 'completed'
           when bool_or(status in ('sent','replied')) then 'active'
           else 'ready'
         end as campaign_status
  from public.outreach_messages
  group by campaign_id
) counts
where c.id = counts.campaign_id;

commit;
