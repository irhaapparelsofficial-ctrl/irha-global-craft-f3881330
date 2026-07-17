begin;

-- Controlled catalogue hierarchy publication.
-- Existing category rows, product rows and legacy URLs are preserved.
-- Redirects remain approved but are not applied by this migration.

do $$
declare
  owner_admin uuid;
  published_product_count bigint;
  assignment_count bigint;
  node_count bigint;
  leaf_count bigint;
  empty_leaf_count bigint;
  public_release jsonb;
begin
  select u.id into owner_admin
  from auth.users u
  join public.user_roles ur on ur.user_id = u.id
  where lower(u.email) = 'irhaapparelsofficial@gmail.com'
    and ur.role::text = 'admin';

  if owner_admin is null then
    raise exception 'Irha owner admin account was not found; taxonomy publication blocked';
  end if;

  select count(*) into published_product_count
  from public.products
  where is_published;

  select count(*) into assignment_count
  from public.products p
  join public.product_taxonomy_assignments a on a.product_id = p.id
  join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
  where p.is_published
    and n.node_type = 'product_type'
    and n.depth = 2;

  select count(*) into node_count from public.catalog_taxonomy_nodes;
  select count(*) into leaf_count
  from public.catalog_taxonomy_nodes
  where depth = 2 and node_type = 'product_type';

  select count(*) into empty_leaf_count
  from public.catalog_taxonomy_nodes n
  where n.depth = 2
    and n.node_type = 'product_type'
    and not exists (
      select 1
      from public.product_taxonomy_assignments a
      join public.products p on p.id = a.product_id
      where a.taxonomy_node_id = n.id
        and p.is_published
    );

  if published_product_count <> 86 then
    raise exception 'expected 86 published products at controlled cutover, found %', published_product_count;
  end if;
  if assignment_count <> published_product_count then
    raise exception 'every published product must have exactly one explicit product-type assignment';
  end if;
  if node_count <> 69 or leaf_count <> 51 then
    raise exception 'reviewed taxonomy shape changed: nodes %, leaves %', node_count, leaf_count;
  end if;
  if empty_leaf_count <> 0 then
    raise exception 'empty product-type nodes cannot be published';
  end if;
  if exists (
    select 1
    from public.product_taxonomy_assignments a
    join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
    where n.depth <> 2 or n.node_type <> 'product_type'
  ) then
    raise exception 'non-leaf taxonomy assignment detected';
  end if;

  update public.product_taxonomy_assignments
  set review_state = 'approved',
      approved_by = owner_admin,
      approved_at = coalesce(approved_at, now()),
      updated_at = now()
  where review_state <> 'approved'
     or approved_by is distinct from owner_admin
     or approved_at is null;

  update public.catalog_taxonomy_nodes
  set publish_state = 'published',
      updated_by = owner_admin,
      updated_at = now()
  where publish_state <> 'published';

  update public.catalog_taxonomy_migration_map
  set redirect_status = 'approved',
      notes = case
        when source_kind = 'product'
          then 'Explicit hierarchy mapping approved. Existing product URL remains available until a separately verified redirect release.'
        else 'Legacy category mapping approved. Existing category URL remains available until a separately verified redirect release.'
      end,
      updated_at = now()
  where redirect_status = 'proposed';

  select public.catalog_get_public_taxonomy() into public_release;

  if jsonb_array_length(public_release->'nodes') <> 69 then
    raise exception 'public taxonomy projection must expose 69 reviewed nodes';
  end if;
  if jsonb_array_length(public_release->'assignments') <> 86 then
    raise exception 'public taxonomy projection must expose all 86 reviewed assignments';
  end if;
  if exists (select 1 from public.catalog_taxonomy_nodes where publish_state <> 'published') then
    raise exception 'taxonomy publication was incomplete';
  end if;
  if exists (select 1 from public.product_taxonomy_assignments where review_state <> 'approved') then
    raise exception 'taxonomy assignment approval was incomplete';
  end if;
  if exists (select 1 from public.catalog_taxonomy_migration_map where redirect_status = 'applied') then
    raise exception 'this release must not silently activate legacy redirects';
  end if;
end
$$;

comment on function public.catalog_get_public_taxonomy() is
  'Public owner-reviewed Main Category -> Audience/Buyer Group -> Product Type hierarchy and approved product assignments.';

commit;
