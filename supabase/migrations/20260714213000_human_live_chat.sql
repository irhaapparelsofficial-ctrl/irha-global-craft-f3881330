-- Real two-way website live chat with admin-controlled replies.
-- Public visitors never receive direct table access; the live-chat Edge Function
-- authenticates each browser session with a high-entropy visitor token.

create table if not exists public.chat_sessions (
  session_id text primary key,
  visitor_token_hash text not null,
  status text not null default 'waiting',
  visitor_name text,
  visitor_company text,
  visitor_email text,
  assigned_to uuid references auth.users(id) on delete set null,
  human_requested_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_user_message_at timestamptz,
  last_admin_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_sessions_status_check check (status in ('waiting', 'active', 'closed'))
);

alter table public.chat_sessions enable row level security;

create index if not exists chat_sessions_status_last_message_idx
  on public.chat_sessions (status, last_message_at desc);
create index if not exists chat_sessions_assigned_last_message_idx
  on public.chat_sessions (assigned_to, last_message_at desc);

alter table public.chat_messages
  add column if not exists channel text not null default 'ai';
alter table public.chat_messages
  add column if not exists client_message_id text;

update public.chat_messages
set channel = 'ai'
where channel is null or channel not in ('ai', 'human');

alter table public.chat_messages alter column channel set default 'ai';
alter table public.chat_messages alter column channel set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and conname = 'chat_messages_channel_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_channel_check
      check (channel in ('ai', 'human'));
  end if;
end
$$;

create unique index if not exists chat_messages_session_client_message_uidx
  on public.chat_messages (session_id, client_message_id)
  where client_message_id is not null;
create index if not exists chat_messages_human_session_created_idx
  on public.chat_messages (session_id, created_at)
  where channel = 'human';

revoke all on table public.chat_sessions from anon;
revoke insert, update, delete on table public.chat_messages from anon;
grant select, update, delete on table public.chat_sessions to authenticated;
grant select, insert, delete on table public.chat_messages to authenticated;

-- Admin-only session access. Public reads/writes are performed through the
-- service-role Edge Function after visitor-token verification.
drop policy if exists "Admins read live chat sessions" on public.chat_sessions;
create policy "Admins read live chat sessions"
on public.chat_sessions
for select
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins update live chat sessions" on public.chat_sessions;
create policy "Admins update live chat sessions"
on public.chat_sessions
for update
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins delete live chat sessions" on public.chat_sessions;
create policy "Admins delete live chat sessions"
on public.chat_sessions
for delete
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- The existing SELECT/DELETE policies already protect transcripts. This policy
-- adds the one capability required for a signed-in admin to reply.
drop policy if exists "Admins reply to human live chat" on public.chat_messages;
create policy "Admins reply to human live chat"
on public.chat_messages
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  and role = 'admin'
  and channel = 'human'
);

comment on table public.chat_sessions is
  'Human live-chat sessions. Visitor tokens are stored only as SHA-256 hashes.';
comment on column public.chat_messages.channel is
  'Separates the existing AI guide transcript from human admin live chat.';
