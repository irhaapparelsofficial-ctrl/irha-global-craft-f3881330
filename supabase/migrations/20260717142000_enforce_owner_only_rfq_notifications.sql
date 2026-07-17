begin;

-- External buyer messages require a separate, message-specific owner approval.
-- Keep immediate internal owner/CRM alerts active, but remove the automatic
-- buyer-confirmation outbox trigger introduced by the RFQ schema migration.
drop trigger if exists inquiries_buyer_confirmation_outbox on public.inquiries;
drop function if exists public.notification_enqueue_buyer_confirmation();

-- Fail closed: no automatic buyer-confirmation trigger/function may remain.
do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'inquiries_buyer_confirmation_outbox'
      and tgrelid = 'public.inquiries'::regclass
      and not tgisinternal
  ) then
    raise exception 'automatic inquiry buyer confirmation trigger must remain disabled';
  end if;

  if to_regprocedure('public.notification_enqueue_buyer_confirmation()') is not null then
    raise exception 'automatic buyer confirmation function must remain disabled';
  end if;
end
$$;

commit;
