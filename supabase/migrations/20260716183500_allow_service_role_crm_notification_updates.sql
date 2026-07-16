-- Live-chat visitor messages are written by the service-role Edge Function.
-- When an admin reply is inserted, notify_human_live_chat_admin() marks the
-- corresponding CRM notification read. Preserve the admin browser guard while
-- allowing that trusted service-role update path.

create or replace function public.crm_notification_before_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  service_call boolean := coalesce(auth.role() = 'service_role', false);
begin
  if not service_call
     and (auth.uid() is null or not public.has_role(auth.uid(), 'admin')) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  new.title := btrim(new.title);
  new.updated_at := now();
  if new.status = 'read' and new.read_at is null then new.read_at := now(); end if;
  if new.status = 'archived' and new.archived_at is null then new.archived_at := now(); end if;
  if new.status = 'unread' then
    new.read_at := null;
    new.archived_at := null;
  end if;
  return new;
end;
$function$;

revoke all on function public.crm_notification_before_write() from public, anon, authenticated;
grant execute on function public.crm_notification_before_write() to service_role;
