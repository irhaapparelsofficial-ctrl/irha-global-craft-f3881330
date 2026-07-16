begin;

create or replace function public.notification_begin_dispatch(_minimum_seconds integer default 20)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare _started timestamptz;
begin
  select last_started_at into _started
  from public.notification_dispatch_runtime
  where id = 1
  for update;

  if _started is not null and _started > now() - make_interval(secs => greatest(5, least(coalesce(_minimum_seconds, 20), 300))) then
    return false;
  end if;

  update public.notification_dispatch_runtime
  set last_started_at = now(), updated_at = now()
  where id = 1;
  return true;
end;
$$;

revoke all on function public.notification_begin_dispatch(integer) from public, anon, authenticated;
grant execute on function public.notification_begin_dispatch(integer) to service_role;

commit;
