begin;

-- Owner-controlled, reversible publication controls for the explicit B2B catalogue taxonomy.
-- Applying this migration does not publish taxonomy nodes and does not change legacy URLs.

create table if not exists public.catalog_taxonomy_review_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('review_approved', 'publish', 'unpublish')),
  confirmation text not null,
  node_count integer not null,
  assignment_count integer not null,
  snapshot_hash text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists catalog_taxonomy_review_events_created_idx
  on public.catalog_taxonomy_review_events(created_at desc);
create index if not exists catalog_taxonomy_review_events_actor_idx
  on public.catalog_taxonomy_review_events(actor_id)
  where actor_id is not null;

alter table public.catalog_taxonomy_review_events enable row level security;
drop policy if exists catalog_taxonomy_review_events_admin_select on public.catalog_taxonomy_review_events;
create policy catalog_taxonomy_review_events_admin_select
  on public.catalog_taxonomy_review_events
  for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.catalog_taxonomy_review_events from public, anon, authenticated;
grant select on table public.catalog_taxonomy_review_events to authenticated;
grant all on table public.catalog_taxonomy_review_events to service_role;

create or replace function public.catalog_taxonomy_review_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  result jsonb;
begin
  if actor is null or not public.has_role(actor, 'admin') then
    raise exception 'admin access is required' using errcode = '42501';
  end if;

  with metrics as (
    select
      (select count(*) from public.catalog_taxonomy_nodes)::integer as node_count,
      (select count(*) from public.catalog_taxonomy_nodes where depth = 0 and node_type = 'main_category')::integer as root_count,
      (select count(*) from public.catalog_taxonomy_nodes where depth = 1 and node_type in ('audience','buyer_group','accessories'))::integer as audience_count,
      (select count(*) from public.catalog_taxonomy_nodes where depth = 2 and node_type = 'product_type')::integer as leaf_count,
      (select count(*) from public.catalog_taxonomy_nodes where publish_state in ('review','published'))::integer as ready_node_count,
      (select count(*) from public.catalog_taxonomy_nodes where publish_state = 'published')::integer as published_node_count,
      (select count(*) from public.products where is_published)::integer as published_product_count,
      (select count(*) from public.product_taxonomy_assignments)::integer as assignment_count,
      (select count(*) from public.product_taxonomy_assignments where review_state = 'proposed')::integer as proposed_count,
      (select count(*) from public.product_taxonomy_assignments where review_state = 'approved')::integer as approved_count,
      (select count(*) from public.product_taxonomy_assignments where review_state = 'rejected')::integer as rejected_count,
      (
        select count(*)::integer
        from public.products p
        where p.is_published
          and not exists (
            select 1 from public.product_taxonomy_assignments a where a.product_id = p.id
          )
      ) as unassigned_product_count,
      (
        select count(*)::integer
        from public.catalog_taxonomy_nodes n
        where n.depth = 2
          and n.node_type = 'product_type'
          and not exists (
            select 1
            from public.product_taxonomy_assignments a
            join public.products p on p.id = a.product_id
            where a.taxonomy_node_id = n.id
              and a.review_state = 'approved'
              and p.is_published
          )
      ) as empty_leaf_count,
      (
        select count(*)::integer
        from public.product_taxonomy_assignments a
        join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
        join public.products p on p.id = a.product_id
        where n.depth <> 2
           or n.node_type <> 'product_type'
           or not p.is_published
      ) as invalid_assignment_count,
      coalesce((
        select md5(jsonb_agg(
          jsonb_build_object(
            'product_id', a.product_id,
            'product_slug', p.slug,
            'product_name', p.name,
            'taxonomy_node_id', a.taxonomy_node_id,
            'target_path', n.full_slug_path,
            'review_state', a.review_state,
            'approved_by', a.approved_by,
            'approved_at', a.approved_at
          ) order by n.full_slug_path, p.slug
        )::text)
        from public.product_taxonomy_assignments a
        join public.products p on p.id = a.product_id
        join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
        where p.is_published
      ), md5('[]')) as snapshot_hash
  )
  select jsonb_build_object(
    'node_count', m.node_count,
    'root_count', m.root_count,
    'audience_count', m.audience_count,
    'leaf_count', m.leaf_count,
    'ready_node_count', m.ready_node_count,
    'published_node_count', m.published_node_count,
    'published_product_count', m.published_product_count,
    'assignment_count', m.assignment_count,
    'proposed_count', m.proposed_count,
    'approved_count', m.approved_count,
    'rejected_count', m.rejected_count,
    'unassigned_product_count', m.unassigned_product_count,
    'empty_leaf_count', m.empty_leaf_count,
    'invalid_assignment_count', m.invalid_assignment_count,
    'snapshot_hash', m.snapshot_hash,
    'confirmation_phrase', 'PUBLISH ' || m.assignment_count || ' PRODUCTS',
    'is_published',
      m.node_count > 0
      and m.published_node_count = m.node_count
      and m.approved_count = m.assignment_count,
    'can_publish',
      m.node_count = 69
      and m.root_count = 5
      and m.audience_count = 13
      and m.leaf_count = 51
      and m.ready_node_count = m.node_count
      and m.published_product_count = 86
      and m.assignment_count = 86
      and m.approved_count = m.assignment_count
      and m.proposed_count = 0
      and m.rejected_count = 0
      and m.unassigned_product_count = 0
      and m.empty_leaf_count = 0
      and m.invalid_assignment_count = 0
  ) into result
  from metrics m;

  return result;
end;
$$;

create or replace function public.catalog_publish_reviewed_taxonomy(
  p_confirmation text,
  p_expected_assignments integer,
  p_expected_snapshot_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  before_summary jsonb;
  after_summary jsonb;
  snapshot jsonb;
begin
  if actor is null or not public.has_role(actor, 'admin') then
    raise exception 'admin access is required' using errcode = '42501';
  end if;

  before_summary := public.catalog_taxonomy_review_summary();

  if p_confirmation is distinct from before_summary->>'confirmation_phrase' then
    raise exception 'confirmation phrase does not match the current catalogue review';
  end if;
  if p_expected_assignments is distinct from (before_summary->>'assignment_count')::integer then
    raise exception 'catalogue assignment count changed; refresh and review again';
  end if;
  if p_expected_snapshot_hash is distinct from before_summary->>'snapshot_hash' then
    raise exception 'catalogue mapping changed; refresh and review again';
  end if;
  if not coalesce((before_summary->>'can_publish')::boolean, false) then
    raise exception 'catalogue taxonomy is not ready for publication';
  end if;

  update public.catalog_taxonomy_nodes
  set publish_state = 'published',
      updated_by = actor,
      updated_at = now()
  where publish_state <> 'published';

  update public.catalog_taxonomy_migration_map
  set redirect_status = case when redirect_status = 'proposed' then 'approved' else redirect_status end,
      notes = case
        when source_kind = 'product'
          then 'Explicit hierarchy mapping owner-approved. Existing product URL remains available; redirects are not applied by this release.'
        else 'Legacy category mapping owner-approved. Existing category URL remains available; redirects are not applied by this release.'
      end,
      updated_at = now()
  where redirect_status in ('proposed', 'approved');

  after_summary := public.catalog_taxonomy_review_summary();
  if not coalesce((after_summary->>'is_published')::boolean, false) then
    raise exception 'catalogue taxonomy publication verification failed';
  end if;

  snapshot := jsonb_build_object(
    'before', before_summary,
    'after', after_summary,
    'legacy_redirects_applied', false,
    'existing_product_urls_preserved', true
  );

  insert into public.catalog_taxonomy_review_events(
    actor_id, action, confirmation, node_count, assignment_count, snapshot_hash, snapshot
  ) values (
    actor,
    'publish',
    p_confirmation,
    (after_summary->>'node_count')::integer,
    (after_summary->>'assignment_count')::integer,
    after_summary->>'snapshot_hash',
    snapshot
  );

  return after_summary;
end;
$$;

create or replace function public.catalog_unpublish_taxonomy(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  before_summary jsonb;
  after_summary jsonb;
begin
  if actor is null or not public.has_role(actor, 'admin') then
    raise exception 'admin access is required' using errcode = '42501';
  end if;
  if p_confirmation is distinct from 'UNPUBLISH TAXONOMY' then
    raise exception 'exact unpublish confirmation is required';
  end if;

  before_summary := public.catalog_taxonomy_review_summary();

  update public.catalog_taxonomy_nodes
  set publish_state = 'review',
      updated_by = actor,
      updated_at = now()
  where publish_state = 'published';

  update public.catalog_taxonomy_migration_map
  set redirect_status = case when redirect_status = 'approved' then 'proposed' else redirect_status end,
      updated_at = now()
  where redirect_status in ('proposed', 'approved');

  after_summary := public.catalog_taxonomy_review_summary();

  insert into public.catalog_taxonomy_review_events(
    actor_id, action, confirmation, node_count, assignment_count, snapshot_hash, snapshot
  ) values (
    actor,
    'unpublish',
    p_confirmation,
    (after_summary->>'node_count')::integer,
    (after_summary->>'assignment_count')::integer,
    after_summary->>'snapshot_hash',
    jsonb_build_object(
      'before', before_summary,
      'after', after_summary,
      'product_approvals_preserved', true,
      'legacy_urls_preserved', true
    )
  );

  return after_summary;
end;
$$;

revoke all on function public.catalog_taxonomy_review_summary() from public, anon;
revoke all on function public.catalog_publish_reviewed_taxonomy(text, integer, text) from public, anon;
revoke all on function public.catalog_unpublish_taxonomy(text) from public, anon;
grant execute on function public.catalog_taxonomy_review_summary() to authenticated;
grant execute on function public.catalog_publish_reviewed_taxonomy(text, integer, text) to authenticated;
grant execute on function public.catalog_unpublish_taxonomy(text) to authenticated;
grant execute on function public.catalog_taxonomy_review_summary() to service_role;
grant execute on function public.catalog_publish_reviewed_taxonomy(text, integer, text) to service_role;
grant execute on function public.catalog_unpublish_taxonomy(text) to service_role;

comment on function public.catalog_publish_reviewed_taxonomy(text, integer, text) is
  'Authenticated admin action. Publishes only a fully reviewed and approved 69-node/86-product taxonomy snapshot; records audit evidence and preserves existing URLs.';
comment on function public.catalog_unpublish_taxonomy(text) is
  'Authenticated reversible safety action. Returns taxonomy nodes to review state while preserving product approvals and all legacy records.';

commit;
