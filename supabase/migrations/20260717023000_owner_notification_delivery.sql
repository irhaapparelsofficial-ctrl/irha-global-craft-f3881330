begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

create table if not exists public.owner_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_push_subscriptions_user_enabled_idx
  on public.owner_push_subscriptions(user_id, enabled);

alter table public.owner_push_subscriptions enable row level security;
drop policy if exists owner_push_subscriptions_admin_all on public.owner_push_subscriptions;
create policy owner_push_subscriptions_admin_all
  on public.owner_push_subscriptions
  for all
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')))
  with check ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.owner_push_subscriptions from anon;
grant select, insert, update, delete on table public.owner_push_subscriptions to authenticated;
grant all on table public.owner_push_subscriptions to service_role;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.crm_notifications(id) on delete cascade,
  dedupe_key text not null unique,
  event_key text not null,
  channel text not null check (channel in ('web_push', 'email')),
  recipient text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'retry', 'blocked', 'failed')),
  provider text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  response_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(response_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_outbox_dispatch_idx
  on public.notification_outbox(status, next_attempt_at, created_at);
create index if not exists notification_outbox_notification_idx
  on public.notification_outbox(notification_id, created_at desc);
create index if not exists notification_outbox_channel_idx
  on public.notification_outbox(channel, status, created_at desc);

alter table public.notification_outbox enable row level security;
drop policy if exists notification_outbox_admin_read on public.notification_outbox;
create policy notification_outbox_admin_read
  on public.notification_outbox
  for select
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.notification_outbox from anon;
grant select on table public.notification_outbox to authenticated;
grant all on table public.notification_outbox to service_role;

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.notification_outbox(id) on delete cascade,
  notification_id uuid references public.crm_notifications(id) on delete set null,
  channel text not null check (channel in ('web_push', 'email')),
  provider text,
  recipient text not null,
  status text not null check (status in ('sent', 'blocked', 'retry', 'failed')),
  error text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists notification_delivery_attempts_outbox_idx
  on public.notification_delivery_attempts(outbox_id, created_at desc);
create index if not exists notification_delivery_attempts_status_idx
  on public.notification_delivery_attempts(channel, status, created_at desc);

alter table public.notification_delivery_attempts enable row level security;
drop policy if exists notification_delivery_attempts_admin_read on public.notification_delivery_attempts;
create policy notification_delivery_attempts_admin_read
  on public.notification_delivery_attempts
  for select
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.notification_delivery_attempts from anon;
grant select on table public.notification_delivery_attempts to authenticated;
grant all on table public.notification_delivery_attempts to service_role;

create or replace function public.notification_get_secret(_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = _name
  limit 1
$$;

revoke all on function public.notification_get_secret(text) from public, anon, authenticated;
grant execute on function public.notification_get_secret(text) to service_role;

create or replace function public.notification_owner_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  join public.user_roles r on r.user_id = u.id
  where r.role = 'admin'
    and u.email is not null
  order by u.created_at asc
  limit 1
$$;

revoke all on function public.notification_owner_email() from public, anon, authenticated;
grant execute on function public.notification_owner_email() to service_role;

create or replace function public.notification_enqueue_from_crm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _kind text;
  _event_id text;
  _event_key text;
  _url text;
  _owner_email text;
  _session_id text;
begin
  if new.status <> 'unread' then
    return new;
  end if;

  if new.metadata->>'channel' = 'human_live_chat' then
    _kind := 'live_chat';
    _session_id := nullif(btrim(new.metadata->>'session_id'), '');
    _event_id := coalesce(
      nullif(btrim(new.metadata->>'message_id'), ''),
      nullif(btrim(new.metadata->>'presence_event_id'), ''),
      extract(epoch from new.updated_at)::bigint::text
    );
    _event_key := 'live-chat:' || new.id::text || ':' || _event_id;
    _url := case
      when _session_id is not null
        then '/admin/live-chat?session=' || _session_id
      else '/admin/live-chat'
    end;
  elsif new.notification_type = 'new_lead' and new.source_type in ('inquiry', 'catalogue') then
    _kind := new.source_type;
    _event_id := coalesce(new.source_id::text, new.id::text);
    _event_key := 'new-lead:' || new.source_type || ':' || _event_id;
    _url := '/admin';
  else
    return new;
  end if;

  insert into public.notification_outbox (
    notification_id, dedupe_key, event_key, channel, recipient, payload
  ) values (
    new.id,
    'push:' || _event_key,
    _event_key,
    'web_push',
    'owner-admins',
    jsonb_build_object(
      'title', new.title,
      'body', left(new.body, 500),
      'url', _url,
      'tag', _event_key,
      'kind', _kind,
      'notification_id', new.id,
      'source_type', new.source_type,
      'source_id', new.source_id,
      'created_at', new.created_at
    )
  )
  on conflict (dedupe_key) do nothing;

  _owner_email := public.notification_owner_email();
  if _owner_email is not null then
    insert into public.notification_outbox (
      notification_id, dedupe_key, event_key, channel, recipient, payload
    ) values (
      new.id,
      'email-owner:' || _event_key,
      _event_key,
      'email',
      _owner_email,
      jsonb_build_object(
        'template', 'owner_alert',
        'subject', '[Irha Apparels] ' || new.title,
        'title', new.title,
        'body', left(new.body, 4000),
        'url', 'https://irhaapparels.com' || _url,
        'kind', _kind,
        'notification_id', new.id,
        'source_type', new.source_type,
        'source_id', new.source_id
      )
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.notification_enqueue_from_crm() from public, anon, authenticated;
grant execute on function public.notification_enqueue_from_crm() to service_role;

drop trigger if exists crm_notifications_delivery_outbox on public.crm_notifications;
create trigger crm_notifications_delivery_outbox
after insert or update of status, metadata, title, body, updated_at
on public.crm_notifications
for each row
execute function public.notification_enqueue_from_crm();

create or replace function public.notification_enqueue_buyer_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _email text;
  _name text;
  _reference text;
begin
  if tg_table_name = 'inquiries' then
    _email := lower(nullif(btrim(new.email), ''));
    _name := coalesce(nullif(btrim(new.name), ''), 'Buyer');
    _reference := coalesce(nullif(btrim(new.inquiry_ref), ''), new.id::text);

    if _email is not null then
      insert into public.notification_outbox (
        notification_id, dedupe_key, event_key, channel, recipient, payload
      ) values (
        null,
        'email-buyer:inquiry:' || new.id::text,
        'buyer-confirmation:inquiry:' || new.id::text,
        'email',
        _email,
        jsonb_build_object(
          'template', 'buyer_confirmation',
          'subject', 'We received your Irha Apparels request · ' || _reference,
          'name', _name,
          'reference', _reference,
          'request_type', coalesce(nullif(btrim(new.intent), ''), 'manufacturing inquiry'),
          'category', nullif(btrim(new.category), ''),
          'quantity', nullif(btrim(new.quantity), ''),
          'message', left(coalesce(new.message, ''), 4000),
          'reply_to', 'info@irhaapparels.com'
        )
      )
      on conflict (dedupe_key) do nothing;
    end if;
  elsif tg_table_name = 'catalogue_leads' then
    _email := lower(nullif(btrim(new.email), ''));
    _name := coalesce(nullif(btrim(new.name), ''), 'Buyer');
    _reference := new.id::text;

    if _email is not null then
      insert into public.notification_outbox (
        notification_id, dedupe_key, event_key, channel, recipient, payload
      ) values (
        null,
        'email-buyer:catalogue:' || new.id::text,
        'buyer-confirmation:catalogue:' || new.id::text,
        'email',
        _email,
        jsonb_build_object(
          'template', 'buyer_confirmation',
          'subject', 'We received your Irha Apparels catalogue request',
          'name', _name,
          'reference', _reference,
          'request_type', 'catalogue request',
          'category', nullif(btrim(new.category_interest), ''),
          'message', left(coalesce(new.message, ''), 4000),
          'reply_to', 'info@irhaapparels.com'
        )
      )
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.notification_enqueue_buyer_confirmation() from public, anon, authenticated;
grant execute on function public.notification_enqueue_buyer_confirmation() to service_role;

drop trigger if exists inquiries_buyer_confirmation_outbox on public.inquiries;
create trigger inquiries_buyer_confirmation_outbox
after insert on public.inquiries
for each row execute function public.notification_enqueue_buyer_confirmation();

drop trigger if exists catalogue_buyer_confirmation_outbox on public.catalogue_leads;
create trigger catalogue_buyer_confirmation_outbox
after insert on public.catalogue_leads
for each row execute function public.notification_enqueue_buyer_confirmation();

create or replace function public.notification_claim_outbox(_limit integer default 25)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_outbox
  set status = 'retry',
      locked_at = null,
      next_attempt_at = now(),
      last_error = coalesce(last_error, 'Recovered stale processing lock'),
      updated_at = now()
  where status = 'processing'
    and locked_at < now() - interval '5 minutes';

  return query
  with picked as (
    select id
    from public.notification_outbox
    where status in ('pending', 'retry')
      and next_attempt_at <= now()
    order by created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(_limit, 25), 100))
  )
  update public.notification_outbox o
  set status = 'processing',
      locked_at = now(),
      attempt_count = o.attempt_count + 1,
      updated_at = now()
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

revoke all on function public.notification_claim_outbox(integer) from public, anon, authenticated;
grant execute on function public.notification_claim_outbox(integer) to service_role;

create or replace function public.notification_requeue_blocked(_channel text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _count integer;
begin
  if _channel not in ('web_push', 'email') then
    raise exception 'unsupported channel';
  end if;

  update public.notification_outbox
  set status = 'pending',
      next_attempt_at = now(),
      locked_at = null,
      last_error = null,
      updated_at = now()
  where channel = _channel
    and status = 'blocked'
    and created_at >= now() - interval '7 days';

  get diagnostics _count = row_count;
  return _count;
end;
$$;

revoke all on function public.notification_requeue_blocked(text) from public, anon, authenticated;
grant execute on function public.notification_requeue_blocked(text) to service_role;

create or replace function public.notification_dispatch_tick()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  _token text;
  _request_id bigint;
begin
  select decrypted_secret into _token
  from vault.decrypted_secrets
  where name = 'irha_notification_dispatch_token'
  limit 1;

  if _token is null or length(_token) < 32 then
    raise warning 'notification dispatcher token is not configured';
    return null;
  end if;

  select net.http_post(
    url := 'https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/notification-dispatcher',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-irha-notification-token', _token
    ),
    body := jsonb_build_object('action', 'process', 'source', 'cron')
  ) into _request_id;

  return _request_id;
end;
$$;

revoke all on function public.notification_dispatch_tick() from public, anon, authenticated;
grant execute on function public.notification_dispatch_tick() to service_role;

create or replace function public.notification_delivery_health()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
begin
  if _actor is null or not public.has_role(_actor, 'admin') then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'push_subscriptions', (select count(*) from public.owner_push_subscriptions where enabled),
    'pending_push', (select count(*) from public.notification_outbox where channel = 'web_push' and status in ('pending','retry','processing')),
    'blocked_push', (select count(*) from public.notification_outbox where channel = 'web_push' and status = 'blocked'),
    'pending_email', (select count(*) from public.notification_outbox where channel = 'email' and status in ('pending','retry','processing')),
    'blocked_email', (select count(*) from public.notification_outbox where channel = 'email' and status = 'blocked'),
    'sent_24h', (select count(*) from public.notification_outbox where status = 'sent' and sent_at >= now() - interval '24 hours'),
    'failed_24h', (select count(*) from public.notification_outbox where status = 'failed' and updated_at >= now() - interval '24 hours')
  );
end;
$$;

revoke all on function public.notification_delivery_health() from public, anon;
grant execute on function public.notification_delivery_health() to authenticated, service_role;

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
