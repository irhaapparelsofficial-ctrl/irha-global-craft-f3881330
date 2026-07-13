-- Private admin Gmail business inbox.
-- Stores only selected business-message metadata, summaries and review drafts.
-- Raw Gmail credentials and access tokens are never stored here.

begin;

create table if not exists public.gmail_inbox_items (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  gmail_thread_id text,
  sender_name text,
  sender_email text,
  recipient_email text,
  subject text not null default '(no subject)',
  snippet text,
  received_at timestamptz not null,
  is_unread boolean not null default true,
  has_attachment boolean not null default false,
  category text not null default 'other' check (category in ('buyer','supplier','production','meeting','website','security','system','other')),
  importance text not null default 'normal' check (importance in ('low','normal','high','urgent')),
  summary_roman_urdu text,
  recommended_action text,
  reply_draft text,
  gmail_url text,
  linked_lead_id uuid references public.b2b_leads(id) on delete set null,
  status text not null default 'new' check (status in ('new','reviewed','replied','archived','ignored')),
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gmail_sync_state (
  id text primary key default 'default',
  last_synced_at timestamptz,
  last_message_at timestamptz,
  last_status text not null default 'never' check (last_status in ('never','running','success','failed')),
  last_error text,
  messages_seen integer not null default 0,
  meaningful_messages_saved integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.gmail_sync_state (id)
values ('default')
on conflict (id) do nothing;

create index if not exists gmail_inbox_received_at_idx on public.gmail_inbox_items (received_at desc);
create index if not exists gmail_inbox_status_received_idx on public.gmail_inbox_items (status, received_at desc);
create index if not exists gmail_inbox_importance_received_idx on public.gmail_inbox_items (importance, received_at desc);
create index if not exists gmail_inbox_linked_lead_idx on public.gmail_inbox_items (linked_lead_id) where linked_lead_id is not null;

alter table public.gmail_inbox_items enable row level security;
alter table public.gmail_sync_state enable row level security;

drop policy if exists gmail_inbox_admin_all on public.gmail_inbox_items;
create policy gmail_inbox_admin_all
on public.gmail_inbox_items
for all
to authenticated
using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

drop policy if exists gmail_sync_state_admin_select on public.gmail_sync_state;
create policy gmail_sync_state_admin_select
on public.gmail_sync_state
for select
to authenticated
using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

drop trigger if exists gmail_inbox_touch_updated_at on public.gmail_inbox_items;
create trigger gmail_inbox_touch_updated_at
before update on public.gmail_inbox_items
for each row execute function public.touch_updated_at();

drop trigger if exists gmail_sync_state_touch_updated_at on public.gmail_sync_state;
create trigger gmail_sync_state_touch_updated_at
before update on public.gmail_sync_state
for each row execute function public.touch_updated_at();

revoke all on table public.gmail_inbox_items from anon;
revoke all on table public.gmail_sync_state from anon;
grant select, insert, update, delete on table public.gmail_inbox_items to authenticated;
grant select on table public.gmail_sync_state to authenticated;
grant all on table public.gmail_inbox_items to service_role;
grant all on table public.gmail_sync_state to service_role;

commit;
