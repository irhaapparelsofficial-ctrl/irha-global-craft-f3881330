begin;

-- The CRM outbox triggers run first (alphabetical trigger order). This final
-- trigger then wakes the existing dispatcher immediately so a visitor opening
-- Human Live Chat does not wait for the next scheduled dispatch tick.
create or replace function public.notification_dispatch_live_chat_presence_now()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
begin
  if tg_op = 'INSERT'
     and new.status = 'unread'
     and new.metadata->>'channel' = 'human_live_chat'
     and new.metadata->>'event' = 'presence' then
    perform public.notification_dispatch_tick();
  end if;

  return new;
end;
$function$;

revoke all on function public.notification_dispatch_live_chat_presence_now() from public, anon, authenticated;
grant execute on function public.notification_dispatch_live_chat_presence_now() to service_role;

drop trigger if exists zz_crm_notifications_live_chat_dispatch on public.crm_notifications;
create trigger zz_crm_notifications_live_chat_dispatch
after insert on public.crm_notifications
for each row
execute function public.notification_dispatch_live_chat_presence_now();

comment on function public.notification_dispatch_live_chat_presence_now() is
  'Wakes the existing owner notification dispatcher immediately after a new human Live Chat presence alert is queued.';

commit;
