-- Human live-chat: optional visitor WhatsApp/phone, product requirement, and
-- admin-seen tracking. Owner Supabase (pvzjiozismyxqrzmtfbi) already has these
-- columns, checks and index applied out-of-band; this repository migration is
-- fully idempotent so `main` reconciles cleanly against the owner project and
-- any future restore/replay stays consistent.
--
-- Contract:
--   * visitor_whatsapp     text        nullable, <= 50 chars
--   * visitor_requirement  text        nullable, <= 500 chars
--   * admin_seen_at        timestamptz nullable
--   * chat_sessions_admin_seen_at_idx on (admin_seen_at)

alter table public.chat_sessions add column if not exists admin_seen_at timestamptz;
alter table public.chat_sessions add column if not exists visitor_whatsapp text;
alter table public.chat_sessions add column if not exists visitor_requirement text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_sessions'::regclass
      and conname = 'chat_sessions_visitor_whatsapp_len'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_visitor_whatsapp_len
      check (visitor_whatsapp is null or char_length(visitor_whatsapp) <= 50);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_sessions'::regclass
      and conname = 'chat_sessions_visitor_requirement_len'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_visitor_requirement_len
      check (visitor_requirement is null or char_length(visitor_requirement) <= 500);
  end if;
end$$;

create index if not exists chat_sessions_admin_seen_at_idx
  on public.chat_sessions (admin_seen_at);

comment on column public.chat_sessions.visitor_whatsapp is
  'Optional visitor WhatsApp/phone from the human live-chat welcome form. Sanitized to allowed phone characters and <=50 chars in the edge function.';
comment on column public.chat_sessions.visitor_requirement is
  'Optional short product/requirement note from the human live-chat welcome form. Sanitized to <=500 chars in the edge function.';
comment on column public.chat_sessions.admin_seen_at is
  'Timestamp when an admin last opened this conversation. Used to compute unread state (last_user_message_at > admin_seen_at).';
