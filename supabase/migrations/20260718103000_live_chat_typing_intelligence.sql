-- Professional two-way typing intelligence for human live chat.
-- Visitor draft previews are limited to the live-chat composer, expire in the UI,
-- and are cleared on pause, blur, send, close, or conversation shutdown.

alter table public.chat_sessions
  add column if not exists visitor_typing_preview text,
  add column if not exists visitor_typing_at timestamptz,
  add column if not exists admin_typing_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_sessions'::regclass
      and conname = 'chat_sessions_typing_preview_length_check'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_typing_preview_length_check
      check (char_length(coalesce(visitor_typing_preview, '')) <= 1000);
  end if;
end
$$;

create index if not exists chat_sessions_visitor_typing_idx
  on public.chat_sessions (visitor_typing_at desc)
  where visitor_typing_at is not null;

-- The table is already admin-RLS protected. Ensure typing changes are also
-- available through the same protected realtime stream used by the inbox.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_sessions'
  ) then
    alter publication supabase_realtime add table public.chat_sessions;
  end if;
end
$$;

update public.chat_sessions
set visitor_typing_preview = null,
    visitor_typing_at = null,
    admin_typing_at = null
where visitor_typing_preview is not null
   or visitor_typing_at is not null
   or admin_typing_at is not null;

comment on column public.chat_sessions.visitor_typing_preview is
  'Temporary live-chat composer preview, max 1000 characters; visible only to authenticated admins.';
comment on column public.chat_sessions.visitor_typing_at is
  'Last visitor typing heartbeat; clients treat heartbeats older than 8 seconds as expired.';
comment on column public.chat_sessions.admin_typing_at is
  'Last admin typing heartbeat shown to the authenticated visitor as a typing indicator.';
