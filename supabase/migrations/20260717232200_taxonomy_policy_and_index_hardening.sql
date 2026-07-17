begin;

create index if not exists catalog_taxonomy_migration_legacy_category_idx
  on public.catalog_taxonomy_migration_map(legacy_category_id)
  where legacy_category_id is not null;
create index if not exists catalog_taxonomy_nodes_created_by_idx
  on public.catalog_taxonomy_nodes(created_by)
  where created_by is not null;
create index if not exists catalog_taxonomy_nodes_updated_by_idx
  on public.catalog_taxonomy_nodes(updated_by)
  where updated_by is not null;
create index if not exists product_taxonomy_assignments_assigned_by_idx
  on public.product_taxonomy_assignments(assigned_by)
  where assigned_by is not null;
create index if not exists product_taxonomy_assignments_approved_by_idx
  on public.product_taxonomy_assignments(approved_by)
  where approved_by is not null;

drop policy if exists catalog_taxonomy_nodes_public_select on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_admin_all on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_anon_select on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_authenticated_select on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_admin_insert on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_admin_update on public.catalog_taxonomy_nodes;
drop policy if exists catalog_taxonomy_nodes_admin_delete on public.catalog_taxonomy_nodes;

create policy catalog_taxonomy_nodes_anon_select
  on public.catalog_taxonomy_nodes for select to anon
  using (publish_state = 'published');
create policy catalog_taxonomy_nodes_authenticated_select
  on public.catalog_taxonomy_nodes for select to authenticated
  using (publish_state = 'published' or public.has_role((select auth.uid()), 'admin'));
create policy catalog_taxonomy_nodes_admin_insert
  on public.catalog_taxonomy_nodes for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'));
create policy catalog_taxonomy_nodes_admin_update
  on public.catalog_taxonomy_nodes for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
create policy catalog_taxonomy_nodes_admin_delete
  on public.catalog_taxonomy_nodes for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists product_taxonomy_assignments_public_select on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_admin_all on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_anon_select on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_authenticated_select on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_admin_insert on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_admin_update on public.product_taxonomy_assignments;
drop policy if exists product_taxonomy_assignments_admin_delete on public.product_taxonomy_assignments;

create policy product_taxonomy_assignments_anon_select
  on public.product_taxonomy_assignments for select to anon
  using (
    review_state = 'approved'
    and exists (
      select 1 from public.catalog_taxonomy_nodes n
      where n.id = taxonomy_node_id and n.publish_state = 'published'
    )
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published
    )
  );
create policy product_taxonomy_assignments_authenticated_select
  on public.product_taxonomy_assignments for select to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or (
      review_state = 'approved'
      and exists (
        select 1 from public.catalog_taxonomy_nodes n
        where n.id = taxonomy_node_id and n.publish_state = 'published'
      )
      and exists (
        select 1 from public.products p
        where p.id = product_id and p.is_published
      )
    )
  );
create policy product_taxonomy_assignments_admin_insert
  on public.product_taxonomy_assignments for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'));
create policy product_taxonomy_assignments_admin_update
  on public.product_taxonomy_assignments for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
create policy product_taxonomy_assignments_admin_delete
  on public.product_taxonomy_assignments for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists catalog_taxonomy_migration_map_admin_all on public.catalog_taxonomy_migration_map;
drop policy if exists catalog_taxonomy_migration_map_admin_select on public.catalog_taxonomy_migration_map;
drop policy if exists catalog_taxonomy_migration_map_admin_insert on public.catalog_taxonomy_migration_map;
drop policy if exists catalog_taxonomy_migration_map_admin_update on public.catalog_taxonomy_migration_map;
drop policy if exists catalog_taxonomy_migration_map_admin_delete on public.catalog_taxonomy_migration_map;

create policy catalog_taxonomy_migration_map_admin_select
  on public.catalog_taxonomy_migration_map for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));
create policy catalog_taxonomy_migration_map_admin_insert
  on public.catalog_taxonomy_migration_map for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'));
create policy catalog_taxonomy_migration_map_admin_update
  on public.catalog_taxonomy_migration_map for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
create policy catalog_taxonomy_migration_map_admin_delete
  on public.catalog_taxonomy_migration_map for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

comment on table public.catalog_taxonomy_nodes is
  'Explicit owner-reviewed public catalogue hierarchy. Public rows are visible only after controlled publication.';
comment on table public.product_taxonomy_assignments is
  'One reviewed leaf taxonomy assignment per product.';

commit;
