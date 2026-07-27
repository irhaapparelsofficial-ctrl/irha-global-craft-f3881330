-- IA-SEC-E001 / SEC-M01
-- Authenticate notification-dispatcher processing with short-lived, single-use
-- database-issued capability tokens. No long-lived scheduler secret is stored.

create table if not exists public.notification_dispatch_tokens (
  id uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '90 seconds'),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_dispatch_tokens_expiry_check
    check (expires_at > created_at)
);

comment on table public.notification_dispatch_tokens is
  'Short-lived single-use capabilities issued by the database cron scheduler for notification-dispatcher processing.';

alter table public.notification_dispatch_tokens enable row level security;

revoke all on table public.notification_dispatch_tokens from public, anon, authenticated;
grant all on table public.notification_dispatch_tokens to service_role;

drop policy if exists "notification_dispatch_tokens_service_role_all"
  on public.notification_dispatch_tokens;
create policy "notification_dispatch_tokens_service_role_all"
  on public.notification_dispatch_tokens
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists notification_dispatch_tokens_expiry_idx
  on public.notification_dispatch_tokens (expires_at)
  where consumed_at is null;

create or replace function public.notification_consume_dispatch_token(_token uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  with consumed as (
    update public.notification_dispatch_tokens
    set consumed_at = clock_timestamp()
    where id = _token
      and consumed_at is null
      and expires_at > clock_timestamp()
    returning 1
  )
  select exists(select 1 from consumed)
$function$;

comment on function public.notification_consume_dispatch_token(uuid) is
  'Atomically consumes one valid notification scheduler capability. False means missing, expired, invalid, or replayed.';

revoke all on function public.notification_consume_dispatch_token(uuid) from public;
grant execute on function public.notification_consume_dispatch_token(uuid)
  to anon, authenticated, service_role;

create or replace function public.notification_dispatch_tick()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, net, pg_temp
as $function$
declare
  _token uuid;
  _request_id bigint;
begin
  delete from public.notification_dispatch_tokens
  where expires_at < now() - interval '1 day'
     or consumed_at < now() - interval '1 day';

  insert into public.notification_dispatch_tokens (expires_at)
  values (now() + interval '90 seconds')
  returning id into _token;

  select net.http_post(
    url := 'https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/notification-dispatcher',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-irha-notification-token', _token::text
    ),
    body := jsonb_build_object('action', 'process', 'source', 'database-cron'),
    timeout_milliseconds := 55000
  ) into _request_id;

  return _request_id;
end;
$function$;

comment on function public.notification_dispatch_tick() is
  'Issues a short-lived one-time capability and invokes notification-dispatcher from pg_cron.';

revoke all on function public.notification_dispatch_tick() from public, anon, authenticated;
grant execute on function public.notification_dispatch_tick() to service_role;
