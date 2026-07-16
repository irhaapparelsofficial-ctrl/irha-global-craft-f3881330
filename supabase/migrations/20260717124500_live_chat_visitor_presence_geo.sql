-- Capture privacy-preserving visitor presence for human live chat.
-- Only coarse country/region/city context is stored. Raw visitor IP addresses are
-- deliberately not persisted.

alter table public.chat_sessions
  add column if not exists visitor_country_code text,
  add column if not exists visitor_country text,
  add column if not exists visitor_region text,
  add column if not exists visitor_city text,
  add column if not exists visitor_timezone text,
  add column if not exists visitor_language text,
  add column if not exists entry_path text,
  add column if not exists referrer_host text,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists presence_alerted_at timestamptz;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_sessions'::regclass
      and conname = 'chat_sessions_country_code_format'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_country_code_format
      check (visitor_country_code is null or visitor_country_code ~ '^[A-Z]{2}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_sessions'::regclass
      and conname = 'chat_sessions_geo_field_lengths'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_geo_field_lengths
      check (
        char_length(coalesce(visitor_country, '')) <= 120
        and char_length(coalesce(visitor_region, '')) <= 160
        and char_length(coalesce(visitor_city, '')) <= 160
        and char_length(coalesce(visitor_timezone, '')) <= 100
        and char_length(coalesce(visitor_language, '')) <= 40
        and char_length(coalesce(entry_path, '')) <= 500
        and char_length(coalesce(referrer_host, '')) <= 255
      );
  end if;
end
$constraints$;

create index if not exists chat_sessions_last_seen_at_idx
  on public.chat_sessions (last_seen_at desc);

comment on column public.chat_sessions.visitor_country_code is
  'Approximate ISO country code derived from edge network context; no raw IP is stored.';
comment on column public.chat_sessions.visitor_country is
  'Approximate visitor country derived from edge network context.';
comment on column public.chat_sessions.visitor_city is
  'Approximate visitor city when supplied by the edge network.';
comment on column public.chat_sessions.visitor_region is
  'Approximate visitor region when supplied by the edge network.';
comment on column public.chat_sessions.presence_alerted_at is
  'Timestamp when the owner was first alerted that this chat session opened.';

-- Preserve coarse location in subsequent message alerts as the visitor starts
-- typing, while retaining the existing one-notification-per-session dedupe key.
create or replace function public.notify_human_live_chat_admin()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  _visitor_name text;
  _visitor_company text;
  _visitor_country text;
  _visitor_country_code text;
  _visitor_region text;
  _visitor_city text;
  _location text;
  _notification_body text;
begin
  if new.channel is distinct from 'human' then
    return new;
  end if;

  if new.role = 'user' then
    select
      visitor_name,
      visitor_company,
      visitor_country,
      visitor_country_code,
      visitor_region,
      visitor_city
    into
      _visitor_name,
      _visitor_company,
      _visitor_country,
      _visitor_country_code,
      _visitor_region,
      _visitor_city
    from public.chat_sessions
    where session_id = new.session_id;

    _location := concat_ws(
      ', ',
      nullif(btrim(_visitor_city), ''),
      nullif(btrim(_visitor_region), ''),
      coalesce(nullif(btrim(_visitor_country), ''), nullif(btrim(_visitor_country_code), ''))
    );

    _notification_body := concat_ws(
      ' · ',
      coalesce(nullif(btrim(_visitor_name), ''), 'Website visitor'),
      nullif(btrim(_visitor_company), ''),
      nullif(btrim(_location), ''),
      left(new.message, 220)
    );

    insert into public.crm_notifications (
      notification_type,
      source_type,
      source_id,
      title,
      body,
      severity,
      status,
      dedupe_key,
      metadata,
      read_at,
      archived_at,
      created_at,
      updated_at
    )
    values (
      'system',
      'system',
      null,
      'Live chat waiting',
      _notification_body,
      'attention',
      'unread',
      'live_chat:' || new.session_id,
      jsonb_build_object(
        'session_id', new.session_id,
        'channel', 'human_live_chat',
        'event', 'message',
        'message_id', new.id,
        'country_code', _visitor_country_code,
        'country', _visitor_country,
        'region', _visitor_region,
        'city', _visitor_city
      ),
      null,
      null,
      now(),
      now()
    )
    on conflict (dedupe_key) do update
    set title = excluded.title,
        body = excluded.body,
        severity = 'attention',
        status = 'unread',
        metadata = excluded.metadata,
        read_at = null,
        archived_at = null,
        updated_at = now();

  elsif new.role = 'admin' then
    update public.crm_notifications
    set status = 'read',
        read_at = coalesce(read_at, now()),
        updated_at = now()
    where dedupe_key = 'live_chat:' || new.session_id
      and status = 'unread';
  end if;

  return new;
end;
$function$;