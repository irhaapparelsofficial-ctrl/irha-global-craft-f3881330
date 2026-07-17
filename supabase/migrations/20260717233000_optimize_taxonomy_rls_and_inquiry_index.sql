-- Remove redundant taxonomy RLS policies and one duplicate inquiry-reference index.
-- The optimized per-role/per-action policies remain unchanged and preserve the
-- existing public published-only reads plus authenticated admin management.

begin;

-- These broad foundation policies are superseded by the later optimized,
-- action-specific policies created by the taxonomy hardening migration.
drop policy if exists catalog_taxonomy_nodes_admin_all
  on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_public_select
  on public.catalog_taxonomy_nodes;

drop policy if exists product_taxonomy_assignments_admin_all
  on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_public_select
  on public.product_taxonomy_assignments;

drop policy if exists catalog_taxonomy_migration_map_admin_all
  on public.catalog_taxonomy_migration_map;

-- The relational RFQ migration added a second identical partial unique index.
-- Preserve the original inquiries_inquiry_ref_key index and remove only the
-- redundant newer copy.
drop index if exists public.inquiries_inquiry_ref_unique_idx;

-- Fail closed if any required replacement policy or surviving unique index is
-- absent after cleanup.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_taxonomy_nodes'
      and policyname = 'catalog_taxonomy_nodes_anon_select'
      and cmd = 'SELECT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_taxonomy_nodes'
      and policyname = 'catalog_taxonomy_nodes_authenticated_select'
      and cmd = 'SELECT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_taxonomy_nodes'
      and policyname in (
        'catalog_taxonomy_nodes_admin_insert',
        'catalog_taxonomy_nodes_admin_update',
        'catalog_taxonomy_nodes_admin_delete'
      )
    group by tablename
    having count(*) = 3
  ) then
    raise exception 'catalog taxonomy node replacement policies are incomplete';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_taxonomy_assignments'
      and policyname = 'product_taxonomy_assignments_anon_select'
      and cmd = 'SELECT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_taxonomy_assignments'
      and policyname = 'product_taxonomy_assignments_authenticated_select'
      and cmd = 'SELECT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_taxonomy_assignments'
      and policyname in (
        'product_taxonomy_assignments_admin_insert',
        'product_taxonomy_assignments_admin_update',
        'product_taxonomy_assignments_admin_delete'
      )
    group by tablename
    having count(*) = 3
  ) then
    raise exception 'product taxonomy assignment replacement policies are incomplete';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_taxonomy_migration_map'
      and policyname in (
        'catalog_taxonomy_migration_map_admin_select',
        'catalog_taxonomy_migration_map_admin_insert',
        'catalog_taxonomy_migration_map_admin_update',
        'catalog_taxonomy_migration_map_admin_delete'
      )
    group by tablename
    having count(*) = 4
  ) then
    raise exception 'taxonomy migration-map replacement policies are incomplete';
  end if;

  if to_regclass('public.inquiries_inquiry_ref_key') is null then
    raise exception 'surviving inquiry-reference unique index is missing';
  end if;
end
$$;

commit;
