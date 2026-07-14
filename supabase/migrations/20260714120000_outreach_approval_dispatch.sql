begin;

alter table public.outreach_messages
  alter column recipient_email drop not null;

alter table public.outreach_messages
  add column if not exists channel text not null default 'email',
  add column if not exists recipient_whatsapp text,
  add column if not exists whatsapp_message_id uuid references public.whatsapp_messages(id) on delete set null,
  add column if not exists manual_reason text,
  add column if not exists dispatched_by uuid references auth.users(id) on delete set null;

alter table public.outreach_messages
  drop constraint if exists outreach_messages_status_check;
alter table public.outreach_messages
  add constraint outreach_messages_status_check
  check (status in ('draft','approved','sending','sent','failed','manual_required','rejected','suppressed','replied','unsubscribed','duplicate'));

alter table public.outreach_messages
  drop constraint if exists outreach_messages_channel_check;
alter table public.outreach_messages
  add constraint outreach_messages_channel_check
  check (channel in ('email','whatsapp'));

alter table public.outreach_messages
  drop constraint if exists outreach_messages_recipient_route_check;
alter table public.outreach_messages
  add constraint outreach_messages_recipient_route_check
  check (
    (channel = 'email' and recipient_email is not null and char_length(btrim(recipient_email)) > 3)
    or
    (channel = 'whatsapp' and recipient_whatsapp is not null and char_length(regexp_replace(recipient_whatsapp, '\D', '', 'g')) between 7 and 16)
  ) not valid;
alter table public.outreach_messages validate constraint outreach_messages_recipient_route_check;

create index if not exists outreach_messages_channel_status_idx
  on public.outreach_messages (channel, status, created_at desc);
create index if not exists outreach_messages_whatsapp_idx
  on public.outreach_messages (recipient_whatsapp)
  where recipient_whatsapp is not null;

create table if not exists public.outreach_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.outreach_messages(id) on delete cascade,
  crm_file_id uuid not null references public.crm_files(id) on delete restrict,
  channel text not null check (channel in ('email','whatsapp')),
  status text not null default 'selected' check (status in ('selected','sending','sent','failed','manual_required','removed')),
  provider_file_id text,
  error text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, crm_file_id)
);

create index if not exists outreach_message_attachments_message_idx
  on public.outreach_message_attachments (message_id, status, created_at);

alter table public.outreach_message_attachments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'outreach_message_attachments'
      and policyname = 'outreach_message_attachments_admin_all'
  ) then
    create policy outreach_message_attachments_admin_all
      on public.outreach_message_attachments
      for all to authenticated
      using (public.has_role((select auth.uid()), 'admin'))
      with check (public.has_role((select auth.uid()), 'admin'));
  end if;
end $$;

revoke all on table public.outreach_message_attachments from anon;
grant select, insert, update, delete on table public.outreach_message_attachments to authenticated;

create or replace function public.outreach_attachment_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  new.error := nullif(left(btrim(new.error), 4000), '');
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists outreach_attachment_before_write_trigger on public.outreach_message_attachments;
create trigger outreach_attachment_before_write_trigger
  before insert or update on public.outreach_message_attachments
  for each row execute function public.outreach_attachment_before_write();

revoke all on function public.outreach_attachment_before_write() from public;

commit;
