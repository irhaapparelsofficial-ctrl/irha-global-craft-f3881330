-- PR #5 media workflow backbone

create type public.slot_media_role as enum (
  'hero','three_quarter','side','back','macro','branding_detail','packaging','gallery'
);

create type public.placement_page_type as enum (
  'home','main_category','audience','family','product','static'
);

-- 1) product_slot_media -----------------------------------------------------
create table public.product_slot_media (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  role public.slot_media_role not null,
  sort_order integer not null default 0,
  is_required boolean not null default false,
  approved boolean not null default false,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  provenance_note text,
  mapping_confidence text not null default 'review'
    check (mapping_confidence in ('high','medium','low','review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (reference_code, media_asset_id, role)
);

grant select, insert, update, delete on public.product_slot_media to authenticated;
grant all on public.product_slot_media to service_role;
alter table public.product_slot_media enable row level security;

create policy "admins manage product_slot_media"
  on public.product_slot_media for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create index product_slot_media_ref_idx
  on public.product_slot_media (reference_code, role, sort_order);
create index product_slot_media_approved_idx
  on public.product_slot_media (reference_code) where approved;

-- 2) site_media_placements -------------------------------------------------
create table public.site_media_placements (
  id uuid primary key default gen_random_uuid(),
  page_type public.placement_page_type not null,
  page_slug text not null,
  role text not null,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order integer not null default 0,
  is_lcp boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (page_type, page_slug, role, sort_order)
);

grant select, insert, update, delete on public.site_media_placements to authenticated;
grant all on public.site_media_placements to service_role;
alter table public.site_media_placements enable row level security;

create policy "admins manage site_media_placements"
  on public.site_media_placements for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create index site_media_placements_page_idx
  on public.site_media_placements (page_type, page_slug, active, sort_order);

-- 3) media_placement_events (audit log) ------------------------------------
create table public.media_placement_events (
  id uuid primary key default gen_random_uuid(),
  reference_code text,
  page_type public.placement_page_type,
  page_slug text,
  action text not null check (action in
    ('approve','reject','reassign','reorder','set_hero','unpublish_gate','remove_required','link','unlink')),
  reason text,
  media_asset_id uuid,
  snapshot jsonb not null default '{}'::jsonb,
  acted_by uuid,
  created_at timestamptz not null default now()
);

grant select, insert on public.media_placement_events to authenticated;
grant all on public.media_placement_events to service_role;
alter table public.media_placement_events enable row level security;

create policy "admins read media_placement_events"
  on public.media_placement_events for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "admins insert media_placement_events"
  on public.media_placement_events for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));

create index media_placement_events_ref_idx
  on public.media_placement_events (reference_code, created_at desc);

-- 4) updated_at triggers ---------------------------------------------------
create trigger touch_product_slot_media_updated_at
  before update on public.product_slot_media
  for each row execute function public.touch_updated_at();
create trigger touch_site_media_placements_updated_at
  before update on public.site_media_placements
  for each row execute function public.touch_updated_at();

-- 5) Gate: recompute approved_media_count + block removal of required hero
create or replace function public.enforce_slot_media_gate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ref text := coalesce(new.reference_code, old.reference_code);
  v_count integer;
  v_had_hero boolean;
  v_slot public.catalog_slot_completion;
begin
  -- Count verified + approved media currently linked (post-mutation state)
  select count(*)::int into v_count
  from public.product_slot_media psm
  join public.media_assets ma on ma.id = psm.media_asset_id
  where psm.reference_code = v_ref
    and psm.approved
    and ma.verification_status = 'verified'
    and ma.status = 'active';

  select * into v_slot from public.catalog_slot_completion where reference_code = v_ref;

  if v_slot.reference_code is not null then
    update public.catalog_slot_completion
       set approved_media_count = v_count,
           updated_at = now()
     where reference_code = v_ref;

    -- If a live/published slot lost required hero → auto-unpublish + audit
    if (tg_op in ('DELETE','UPDATE'))
       and old.role = 'hero'
       and old.is_required
       and v_slot.publish_state = 'published' then
      select exists (
        select 1 from public.product_slot_media
        where reference_code = v_ref and role='hero' and is_required and approved
      ) into v_had_hero;

      if not v_had_hero then
        update public.catalog_slot_completion
           set publish_state = 'unpublished',
               unpublished_at = now(),
               unpublished_reason = 'required hero media removed'
         where reference_code = v_ref;

        insert into public.media_placement_events
          (reference_code, action, reason, media_asset_id, snapshot, acted_by)
        values
          (v_ref, 'unpublish_gate', 'required hero removed', old.media_asset_id,
           jsonb_build_object('prev_publish_state','published'), auth.uid());
      end if;
    end if;
  end if;
  return coalesce(new, old);
end
$$;

create trigger product_slot_media_gate
  after insert or update or delete on public.product_slot_media
  for each row execute function public.enforce_slot_media_gate();

-- 6) Admin audit view for the media approval dashboard --------------------
create or replace view public.admin_media_audit_summary
with (security_invoker = on) as
select
  coalesce(verification_status,'unknown') as verification_status,
  count(*)::int as total,
  count(*) filter (where social_approved)::int as social_approved_count
from public.media_assets
group by verification_status;

grant select on public.admin_media_audit_summary to authenticated;