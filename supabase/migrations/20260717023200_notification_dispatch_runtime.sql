begin;

create table if not exists public.notification_dispatch_runtime (
  id integer primary key default 1 check (id = 1),
  last_started_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.notification_dispatch_runtime(id) values (1) on conflict (id) do nothing;
alter table public.notification_dispatch_runtime enable row level security;
revoke all on table public.notification_dispatch_runtime from public, anon, authenticated;
grant all on table public.notification_dispatch_runtime to service_role;

create or replace function public.notification_begin_dispatch(_minimum_seconds integer default 20)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  _started timestamptz;
begin
  if _role <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select last_started_at into _started
  from public.notification_dispatch_runtime
  where id = 1
  for update;

  if _started is not null
     and _started > now() - make_interval(secs => greatest(5, least(coalesce(_minimum_seconds, 20), 300))) then
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

create or replace function public.notification_dispatch_tick()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  _request_id bigint;
begin
  select net.http_post(
    url := 'https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/notification-dispatcher',
    headers := jsonb_build_object('content-type', 'application/json'),
    body := jsonb_build_object('action', 'process', 'source', 'database-cron')
  ) into _request_id;
  return _request_id;
end;
$$;
revoke all on function public.notification_dispatch_tick() from public, anon, authenticated;
grant execute on function public.notification_dispatch_tick() to service_role;

do $$
declare
  _job_id bigint;
begin
  for _job_id in select jobid from cron.job where jobname = 'irha-notification-dispatcher'
  loop
    perform cron.unschedule(_job_id);
  end loop;
  perform cron.schedule(
    'irha-notification-dispatcher',
    '* * * * *',
    'select public.notification_dispatch_tick();'
  );
end;
$$;

commit;
