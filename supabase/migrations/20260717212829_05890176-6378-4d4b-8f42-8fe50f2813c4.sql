-- PR #4 — Admin catalogue completion workflow.
-- Non-destructive. Idempotent.

begin;

-- 1. Per-slot completion checklist ------------------------------------------
create table if not exists public.catalog_slot_completion (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique
    check (reference_code ~ '^IRHA-[A-Z]{2,4}-[A-Z]{2,3}-[A-Z0-9]{2,4}-[0-9]{3}$'),
  main_slug text not null,
  audience_slug text not null,
  family_slug text not null,
  slot_slug text not null,
  working_title text not null,
  owner_approved_title text,
  factual_description text,
  taxonomy_assigned boolean not null default false,
  approved_media_count integer not null default 0 check (approved_media_count >= 0),
  spec_sheet_ready boolean not null default false,
  owner_signed_off boolean not null default false,
  publish_state text not null default 'draft'
    check (publish_state in ('draft','review','ready','published','unpublished')),
  publishable boolean generated always as (
    owner_approved_title is not null
    and char_length(coalesce(owner_approved_title, '')) between 3 and 160
    and factual_description is not null
    and char_length(coalesce(factual_description, '')) between 40 and 6000
    and taxonomy_assigned
    and approved_media_count >= 1
    and spec_sheet_ready
    and owner_signed_off
  ) stored,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  unpublished_at timestamptz,
  unpublished_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

grant select, insert, update on public.catalog_slot_completion to authenticated;
grant all on public.catalog_slot_completion to service_role;

alter table public.catalog_slot_completion enable row level security;

drop policy if exists "admins read slot completion" on public.catalog_slot_completion;
create policy "admins read slot completion"
  on public.catalog_slot_completion for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins write slot completion" on public.catalog_slot_completion;
create policy "admins write slot completion"
  on public.catalog_slot_completion for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists catalog_slot_completion_touch on public.catalog_slot_completion;
create trigger catalog_slot_completion_touch
  before update on public.catalog_slot_completion
  for each row execute function public.touch_updated_at();

create index if not exists catalog_slot_completion_state_idx
  on public.catalog_slot_completion (publish_state, publishable);

-- 2. Publication audit log ---------------------------------------------------
create table if not exists public.catalog_publication_events (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null,
  event text not null check (event in ('publish','unpublish','block','reopen')),
  reason text,
  gate_snapshot jsonb not null,
  acted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert on public.catalog_publication_events to authenticated;
grant all on public.catalog_publication_events to service_role;

alter table public.catalog_publication_events enable row level security;

drop policy if exists "admins read pub events" on public.catalog_publication_events;
create policy "admins read pub events"
  on public.catalog_publication_events for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins insert pub events" on public.catalog_publication_events;
create policy "admins insert pub events"
  on public.catalog_publication_events for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin') and acted_by = auth.uid());

create index if not exists catalog_publication_events_ref_idx
  on public.catalog_publication_events (reference_code, created_at desc);

-- 3. Media generation brief queue -------------------------------------------
create table if not exists public.media_generation_briefs (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null
    check (reference_code ~ '^IRHA-[A-Z]{2,4}-[A-Z]{2,3}-[A-Z0-9]{2,4}-[0-9]{3}$'),
  subject text not null check (char_length(subject) between 3 and 300),
  style text,
  aspect_ratio text check (aspect_ratio in ('1:1','4:5','3:4','16:9','9:16') or aspect_ratio is null),
  notes text,
  status text not null default 'draft'
    check (status in ('draft','approved','generated','rejected')),
  owner_approved_at timestamptz,
  owner_approved_by uuid references auth.users(id) on delete set null,
  generated_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

grant select, insert, update on public.media_generation_briefs to authenticated;
grant all on public.media_generation_briefs to service_role;

alter table public.media_generation_briefs enable row level security;

drop policy if exists "admins read media briefs" on public.media_generation_briefs;
create policy "admins read media briefs"
  on public.media_generation_briefs for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins write media briefs" on public.media_generation_briefs;
create policy "admins write media briefs"
  on public.media_generation_briefs for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists media_generation_briefs_touch on public.media_generation_briefs;
create trigger media_generation_briefs_touch
  before update on public.media_generation_briefs
  for each row execute function public.touch_updated_at();

create index if not exists media_generation_briefs_status_idx
  on public.media_generation_briefs (status, reference_code);

-- 4. Admin dashboard views --------------------------------------------------
create or replace view public.admin_slot_completion_dashboard as
select
  reference_code,
  main_slug, audience_slug, family_slug, slot_slug,
  working_title, owner_approved_title,
  publish_state, publishable,
  taxonomy_assigned, approved_media_count,
  spec_sheet_ready, owner_signed_off,
  case
    when owner_approved_title is null then 'missing_title'
    when factual_description is null then 'missing_description'
    when not taxonomy_assigned then 'missing_taxonomy'
    when approved_media_count = 0 then 'missing_media'
    when not spec_sheet_ready then 'missing_spec_sheet'
    when not owner_signed_off then 'awaiting_owner_signoff'
    when publish_state <> 'published' then 'ready_to_publish'
    else 'live'
  end as blocking_gate,
  published_at, updated_at
from public.catalog_slot_completion;

alter view public.admin_slot_completion_dashboard set (security_invoker = on);
grant select on public.admin_slot_completion_dashboard to authenticated;
grant select on public.admin_slot_completion_dashboard to service_role;

create or replace view public.admin_media_brief_queue as
select id, reference_code, subject, style, aspect_ratio, notes,
       status, owner_approved_at, generated_asset_id,
       created_at, updated_at
from public.media_generation_briefs
where status in ('draft','approved');

alter view public.admin_media_brief_queue set (security_invoker = on);
grant select on public.admin_media_brief_queue to authenticated;
grant select on public.admin_media_brief_queue to service_role;

-- 5. Publish/unpublish server functions -------------------------------------
create or replace function public.publish_slot_ref(_reference_code text)
returns public.catalog_slot_completion
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r public.catalog_slot_completion;
  snap jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select * into r from public.catalog_slot_completion
    where reference_code = _reference_code for update;
  if not found then
    raise exception 'slot % not found', _reference_code using errcode = 'P0002';
  end if;

  snap := jsonb_build_object(
    'owner_approved_title', r.owner_approved_title,
    'factual_description_len', char_length(coalesce(r.factual_description,'')),
    'taxonomy_assigned', r.taxonomy_assigned,
    'approved_media_count', r.approved_media_count,
    'spec_sheet_ready', r.spec_sheet_ready,
    'owner_signed_off', r.owner_signed_off,
    'publishable', r.publishable
  );

  if not r.publishable then
    insert into public.catalog_publication_events (reference_code, event, reason, gate_snapshot, acted_by)
      values (_reference_code, 'block', 'gate_failed', snap, auth.uid());
    raise exception 'slot % not publishable: gates not green', _reference_code
      using errcode = '42501', detail = snap::text;
  end if;

  update public.catalog_slot_completion
     set publish_state = 'published',
         published_at = now(),
         published_by = auth.uid(),
         unpublished_at = null,
         unpublished_reason = null,
         updated_by = auth.uid()
   where reference_code = _reference_code
   returning * into r;

  insert into public.catalog_publication_events (reference_code, event, gate_snapshot, acted_by)
    values (_reference_code, 'publish', snap, auth.uid());

  return r;
end;
$$;

revoke all on function public.publish_slot_ref(text) from public;
grant execute on function public.publish_slot_ref(text) to authenticated;

create or replace function public.unpublish_slot_ref(_reference_code text, _reason text)
returns public.catalog_slot_completion
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r public.catalog_slot_completion;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if _reason is null or char_length(btrim(_reason)) < 4 then
    raise exception 'unpublish reason required (min 4 chars)';
  end if;

  update public.catalog_slot_completion
     set publish_state = 'unpublished',
         unpublished_at = now(),
         unpublished_reason = btrim(_reason),
         updated_by = auth.uid()
   where reference_code = _reference_code
   returning * into r;

  if not found then
    raise exception 'slot % not found', _reference_code using errcode = 'P0002';
  end if;

  insert into public.catalog_publication_events (reference_code, event, reason, gate_snapshot, acted_by)
    values (_reference_code, 'unpublish', _reason,
      jsonb_build_object('prev_publish_state','published','publishable',r.publishable),
      auth.uid());

  return r;
end;
$$;

revoke all on function public.unpublish_slot_ref(text, text) from public;
grant execute on function public.unpublish_slot_ref(text, text) to authenticated;

comment on table public.catalog_slot_completion is
  'PR #4 per-slot completion gates. `publishable` is a stored generated column of every check.';
comment on table public.catalog_publication_events is
  'PR #4 append-only audit trail for slot publish/unpublish/block events.';
comment on table public.media_generation_briefs is
  'PR #4 owner-approval-gated queue of media generation briefs. No auto-generation.';

commit;