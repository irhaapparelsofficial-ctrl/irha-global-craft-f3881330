begin;

create table if not exists public.site_visitors (
  visitor_session_id text primary key,
  country_code text,
  country text,
  region text,
  city text,
  timezone text,
  language text,
  entry_path text not null default '/',
  current_path text not null default '/',
  referrer_host text,
  device_type text not null default 'unknown'
    check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  viewport_width integer check (viewport_width is null or viewport_width between 1 and 20000),
  user_agent text,
  page_view_count integer not null default 1 check (page_view_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  chat_opened_at timestamptz,
  alerted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint site_visitors_session_format
    check (visitor_session_id ~ '^site-[0-9a-fA-F-]{36}$'),
  constraint site_visitors_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint site_visitors_field_lengths
    check (
      char_length(coalesce(country, '')) <= 120
      and char_length(coalesce(region, '')) <= 160
      and char_length(coalesce(city, '')) <= 160
      and char_length(coalesce(timezone, '')) <= 100
      and char_length(coalesce(language, '')) <= 40
      and char_length(coalesce(entry_path, '')) <= 500
      and char_length(coalesce(current_path, '')) <= 500
      and char_length(coalesce(referrer_host, '')) <= 255
      and char_length(coalesce(user_agent, '')) <= 1000
    )
);

create index if not exists site_visitors_last_seen_idx
  on public.site_visitors(last_seen_at desc);
create index if not exists site_visitors_country_last_seen_idx
  on public.site_visitors(country_code, last_seen_at desc);
create index if not exists site_visitors_first_seen_idx
  on public.site_visitors(first_seen_at desc);
create index if not exists site_visitors_chat_opened_idx
  on public.site_visitors(chat_opened_at desc)
  where chat_opened_at is not null;

comment on table public.site_visitors is
  'Privacy-safe session presence for the owner dashboard. Country and optional city/region are coarse edge-network estimates; raw IP addresses are never persisted.';
comment on column public.site_visitors.country_code is
  'Approximate ISO country code resolved at the request edge. VPN or proxy usage can affect this value.';
comment on column public.site_visitors.user_agent is
  'Limited browser user-agent string used for device display and bot suppression; no fingerprint is generated.';

alter table public.site_visitors enable row level security;

drop policy if exists site_visitors_admin_read on public.site_visitors;
create policy site_visitors_admin_read
  on public.site_visitors
  for select
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.site_visitors from public, anon, authenticated;
grant select on table public.site_visitors to authenticated;
grant all on table public.site_visitors to service_role;

do $realtime$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_visitors'
  ) then
    alter publication supabase_realtime add table public.site_visitors;
  end if;
end
$realtime$;

create or replace function public.notification_enqueue_site_visitor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  _visitor_session_id text;
  _event_key text;
  _url text;
begin
  if new.status <> 'unread'
     or new.metadata->>'channel' is distinct from 'site_visitor'
     or new.metadata->>'event' is distinct from 'arrival' then
    return new;
  end if;

  _visitor_session_id := nullif(btrim(new.metadata->>'visitor_session_id'), '');
  if _visitor_session_id is null then
    return new;
  end if;

  _event_key := 'site-visitor:' || _visitor_session_id;
  _url := '/admin/visitors?visitor=' || _visitor_session_id;

  insert into public.notification_outbox (
    notification_id,
    dedupe_key,
    event_key,
    channel,
    recipient,
    payload
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
      'kind', 'site_visitor',
      'notification_id', new.id,
      'visitor_session_id', _visitor_session_id,
      'country_code', new.metadata->>'country_code',
      'country', new.metadata->>'country',
      'entry_path', new.metadata->>'entry_path',
      'created_at', new.created_at
    )
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$function$;

revoke all on function public.notification_enqueue_site_visitor() from public, anon, authenticated;
grant execute on function public.notification_enqueue_site_visitor() to service_role;

drop trigger if exists crm_notifications_site_visitor_outbox on public.crm_notifications;
create trigger crm_notifications_site_visitor_outbox
after insert or update of status, metadata, title, body, updated_at
on public.crm_notifications
for each row
execute function public.notification_enqueue_site_visitor();

create or replace function public.cleanup_stale_site_visitors()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  _deleted bigint;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  delete from public.site_visitors
  where last_seen_at < now() - interval '90 days';
  get diagnostics _deleted = row_count;
  return _deleted;
end;
$function$;

revoke all on function public.cleanup_stale_site_visitors() from public, anon, authenticated;
grant execute on function public.cleanup_stale_site_visitors() to service_role;

commit;
