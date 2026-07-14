begin;

create table if not exists public.live_chat_sessions (
  session_id text primary key,
  visitor_token_hash text not null,
  visitor_name text,
  visitor_email text,
  visitor_whatsapp text,
  company_name text,
  country text,
  page_path text,
  page_title text,
  status text not null default 'pending'
    check (status in ('pending', 'open', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('normal', 'high', 'urgent')),
  unread_admin integer not null default 0 check (unread_admin >= 0),
  unread_visitor integer not null default 0 check (unread_visitor >= 0),
  last_message_at timestamptz not null default now(),
  last_user_message_at timestamptz,
  last_admin_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_chat_sessions_session_id_check
    check (session_id ~ '^[A-Za-z0-9:_-]{8,100}$'),
  constraint live_chat_sessions_token_hash_check
    check (visitor_token_hash ~ '^[a-f0-9]{64}$'),
  constraint live_chat_sessions_name_check
    check (visitor_name is null or char_length(btrim(visitor_name)) between 2 and 120),
  constraint live_chat_sessions_email_check
    check (visitor_email is null or char_length(visitor_email) <= 254),
  constraint live_chat_sessions_whatsapp_check
    check (visitor_whatsapp is null or char_length(visitor_whatsapp) <= 80),
  constraint live_chat_sessions_company_check
    check (company_name is null or char_length(company_name) <= 180),
  constraint live_chat_sessions_country_check
    check (country is null or char_length(country) <= 120),
  constraint live_chat_sessions_page_path_check
    check (page_path is null or char_length(page_path) <= 600),
  constraint live_chat_sessions_page_title_check
    check (page_title is null or char_length(page_title) <= 300)
);

create index if not exists live_chat_sessions_status_last_message_idx
  on public.live_chat_sessions (status, last_message_at desc);

create index if not exists live_chat_sessions_unread_admin_idx
  on public.live_chat_sessions (unread_admin, last_message_at desc)
  where unread_admin > 0;

create unique index if not exists chat_messages_session_client_message_uidx
  on public.chat_messages (session_id, client_message_id)
  where client_message_id is not null;

alter table public.live_chat_sessions enable row level security;

revoke all on public.live_chat_sessions from anon;
grant select, update on public.live_chat_sessions to authenticated;

DROP POLICY IF EXISTS "Admins manage live chat sessions" ON public.live_chat_sessions;
CREATE POLICY "Admins manage live chat sessions"
  ON public.live_chat_sessions
  FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

create or replace function public.live_chat_admin_reply(
  _session_id text,
  _message text,
  _client_message_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _message_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if _session_id is null or char_length(_session_id) < 8 then
    raise exception 'invalid_session';
  end if;

  if _message is null or char_length(btrim(_message)) < 1 or char_length(btrim(_message)) > 2000 then
    raise exception 'invalid_message';
  end if;

  perform 1
  from public.live_chat_sessions
  where session_id = _session_id
  for update;

  if not found then
    raise exception 'session_not_found';
  end if;

  insert into public.chat_messages (session_id, role, message, channel, client_message_id)
  values (
    _session_id,
    'admin',
    left(btrim(_message), 2000),
    'human',
    nullif(left(btrim(coalesce(_client_message_id, '')), 120), '')
  )
  on conflict (session_id, client_message_id)
    where client_message_id is not null
  do update set message = excluded.message
  returning id into _message_id;

  update public.live_chat_sessions
  set status = case when status in ('resolved', 'closed') then 'open' else status end,
      unread_visitor = unread_visitor + 1,
      last_message_at = now(),
      last_admin_message_at = now(),
      updated_at = now()
  where session_id = _session_id;

  update public.crm_notifications
  set status = 'read',
      read_at = coalesce(read_at, now()),
      updated_at = now()
  where dedupe_key = 'live_chat:' || _session_id
    and status = 'unread';

  return _message_id;
end;
$$;

create or replace function public.live_chat_set_status(
  _session_id text,
  _status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if _status not in ('pending', 'open', 'resolved', 'closed') then
    raise exception 'invalid_status';
  end if;

  update public.live_chat_sessions
  set status = _status,
      unread_admin = case when _status in ('resolved', 'closed') then 0 else unread_admin end,
      updated_at = now()
  where session_id = _session_id;

  if not found then
    raise exception 'session_not_found';
  end if;
end;
$$;

revoke all on function public.live_chat_admin_reply(text, text, text) from public, anon;
revoke all on function public.live_chat_set_status(text, text) from public, anon;
grant execute on function public.live_chat_admin_reply(text, text, text) to authenticated;
grant execute on function public.live_chat_set_status(text, text) to authenticated;

commit;
