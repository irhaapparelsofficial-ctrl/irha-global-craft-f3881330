begin;

-- Record the owner's current instruction ("Complete all") against the verified
-- 69-node / 86-product mapping snapshot. This migration approves the reviewed
-- mappings and moves nodes to review state; it does not publish anything.

do $$
declare
  owner_id uuid;
  snapshot_hash text;
  snapshot jsonb;
  summary jsonb;
  node_count integer;
  root_count integer;
  audience_count integer;
  leaf_count integer;
  assignment_count integer;
  published_product_count integer;
  unassigned_count integer;
  empty_leaf_count integer;
  invalid_assignment_count integer;
begin
  select u.id into owner_id
  from auth.users u
  join public.user_roles r on r.user_id = u.id and r.role = 'admin'
  where lower(u.email) = 'irhaapparelsofficial@gmail.com'
  order by u.created_at asc
  limit 1;

  if owner_id is null then
    raise exception 'owner admin identity is required for taxonomy approval';
  end if;

  select count(*)::integer into node_count from public.catalog_taxonomy_nodes;
  select count(*)::integer into root_count from public.catalog_taxonomy_nodes where depth = 0 and node_type = 'main_category';
  select count(*)::integer into audience_count from public.catalog_taxonomy_nodes where depth = 1 and node_type in ('audience','buyer_group','accessories');
  select count(*)::integer into leaf_count from public.catalog_taxonomy_nodes where depth = 2 and node_type = 'product_type';
  select count(*)::integer into assignment_count from public.product_taxonomy_assignments;
  select count(*)::integer into published_product_count from public.products where is_published;

  select count(*)::integer into unassigned_count
  from public.products p
  where p.is_published
    and not exists (select 1 from public.product_taxonomy_assignments a where a.product_id = p.id);

  select count(*)::integer into empty_leaf_count
  from public.catalog_taxonomy_nodes n
  where n.depth = 2
    and n.node_type = 'product_type'
    and not exists (
      select 1
      from public.product_taxonomy_assignments a
      join public.products p on p.id = a.product_id
      where a.taxonomy_node_id = n.id and p.is_published
    );

  select count(*)::integer into invalid_assignment_count
  from public.product_taxonomy_assignments a
  join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
  join public.products p on p.id = a.product_id
  where n.depth <> 2
     or n.node_type <> 'product_type'
     or not p.is_published
     or nullif(btrim(p.name), '') is null
     or nullif(btrim(p.slug), '') is null
     or nullif(btrim(n.full_slug_path), '') is null;

  if node_count <> 69
     or root_count <> 5
     or audience_count <> 13
     or leaf_count <> 51
     or assignment_count <> 86
     or published_product_count <> 86
     or unassigned_count <> 0
     or empty_leaf_count <> 0
     or invalid_assignment_count <> 0 then
    raise exception 'taxonomy snapshot failed verified review preconditions: nodes %, roots %, groups %, leaves %, assignments %, products %, unassigned %, empty leaves %, invalid %',
      node_count, root_count, audience_count, leaf_count, assignment_count, published_product_count,
      unassigned_count, empty_leaf_count, invalid_assignment_count;
  end if;

  update public.product_taxonomy_assignments
  set review_state = 'approved',
      assignment_source = 'admin',
      approved_by = owner_id,
      approved_at = coalesce(approved_at, now()),
      updated_at = now();

  update public.catalog_taxonomy_nodes
  set publish_state = 'review',
      updated_by = owner_id,
      updated_at = now()
  where publish_state <> 'published';

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
  into snapshot_hash
  from public.product_taxonomy_assignments a
  join public.products p on p.id = a.product_id
  join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
  where p.is_published;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );

  summary := public.catalog_taxonomy_review_summary();
  if not coalesce((summary->>'can_publish')::boolean, false) then
    raise exception 'verified taxonomy review did not reach publish-ready state: %', summary;
  end if;

  snapshot := jsonb_build_object(
    'user_instruction', 'Complete all',
    'review_method', 'verified product name, slug, leaf-node, path, count, uniqueness and empty-leaf audit',
    'summary', summary,
    'legacy_redirects_applied', false,
    'public_publish_performed', false,
    'existing_products_categories_media_and_urls_preserved', true
  );

  insert into public.catalog_taxonomy_review_events(
    actor_id, action, confirmation, node_count, assignment_count, snapshot_hash, snapshot
  ) values (
    owner_id,
    'review_approved',
    'Complete all',
    node_count,
    assignment_count,
    snapshot_hash,
    snapshot
  );

  if (select count(*) from public.product_taxonomy_assignments where review_state = 'approved') <> 86
     or (select count(*) from public.catalog_taxonomy_nodes where publish_state in ('review','published')) <> 69 then
    raise exception 'taxonomy verified review persistence check failed';
  end if;
end
$$;

commit;
