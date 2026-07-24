begin;

-- Reconcile the 13 stale legacy aliases against the current published
-- 254-product catalogue and published taxonomy. Product-specific aliases
-- resolve to the closest current product replacement. Retired sport-category
-- aliases resolve to the current Team Uniforms product-type leaf. The retired
-- Athletic Onesie alias resolves to the current Performance & Activewear leaf.

do $$
declare
  invalid_targets text;
begin
  with expected(from_path, to_path, reason) as (
    values
      ('/products/bavarian-trachten-wear/alpine-trachten-hat', '/products/bavarian-trachten-wear/accessories/accessories/alpine-wool-hat', 'Legacy Alpine Trachten Hat was merged into the current published Alpine Wool Hat product.'),
      ('/products/bavarian-trachten-wear/bavarian-checkered-shirt', '/products/bavarian-trachten-wear/men/trachten-shirts/checked-trachten-shirt', 'Legacy Bavarian Checkered Shirt was reconciled to the current published Checked Trachten Shirt product.'),
      ('/products/bavarian-trachten-wear/bavarian-embroidered-vest', '/products/bavarian-trachten-wear/men/vests-waistcoats/wool-trachten-vest', 'Legacy Bavarian Embroidered Vest was merged into the current published Wool Trachten Vest product.'),
      ('/products/sportswear-baseball', '/products/sportswear/team-club/team-uniforms', 'Retired baseball category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
      ('/products/sportswear-basketball', '/products/sportswear/team-club/team-uniforms', 'Retired basketball category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
      ('/products/sportswear-cricket', '/products/sportswear/team-club/team-uniforms', 'Retired cricket category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
      ('/products/sportswear-rugby', '/products/sportswear/team-club/team-uniforms', 'Retired rugby category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
      ('/products/sportswear-soccer', '/products/sportswear/team-club/team-uniforms', 'Retired soccer category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
      ('/products/sportswear/athletic-onesie', '/products/sportswear/fitness-activewear/performance-activewear', 'No current Athletic Onesie product exists; the alias resolves to the closest current published Performance & Activewear product-type taxonomy.'),
      ('/products/sportswear/baseball-jersey', '/products/sportswear/team-club/team-uniforms/baseball-uniform', 'Legacy Baseball Jersey was merged into the current published Baseball Uniform product.'),
      ('/products/sportswear/baseball-uniform-kit', '/products/sportswear/team-club/team-uniforms/baseball-uniform', 'Legacy Baseball Uniform Kit was reconciled to the current published Baseball Uniform product.'),
      ('/products/sportswear/basketball-mesh-jersey', '/products/sportswear/team-club/team-uniforms/basketball-uniform', 'Legacy Basketball Mesh Jersey was merged into the current published Basketball Uniform product.'),
      ('/products/sportswear/basketball-uniform-kit', '/products/sportswear/team-club/team-uniforms/basketball-uniform', 'Legacy Basketball Uniform Kit was reconciled to the current published Basketball Uniform product.')
  ),
  valid_targets(path) as (
    select canonical_path
    from public.products
    where is_published and publish_state = 'published'
    union
    select '/products/' || full_slug_path
    from public.catalog_taxonomy_nodes
    where publish_state = 'published'
  )
  select string_agg(e.from_path || ' -> ' || e.to_path, ', ' order by e.from_path)
  into invalid_targets
  from expected e
  left join valid_targets v on v.path = e.to_path
  where v.path is null or e.from_path = e.to_path;

  if invalid_targets is not null then
    raise exception 'Redirect contract contains non-canonical targets: %', invalid_targets;
  end if;
end
$$;

with expected(from_path, to_path, reason) as (
  values
    ('/products/bavarian-trachten-wear/alpine-trachten-hat', '/products/bavarian-trachten-wear/accessories/accessories/alpine-wool-hat', 'Legacy Alpine Trachten Hat was merged into the current published Alpine Wool Hat product.'),
    ('/products/bavarian-trachten-wear/bavarian-checkered-shirt', '/products/bavarian-trachten-wear/men/trachten-shirts/checked-trachten-shirt', 'Legacy Bavarian Checkered Shirt was reconciled to the current published Checked Trachten Shirt product.'),
    ('/products/bavarian-trachten-wear/bavarian-embroidered-vest', '/products/bavarian-trachten-wear/men/vests-waistcoats/wool-trachten-vest', 'Legacy Bavarian Embroidered Vest was merged into the current published Wool Trachten Vest product.'),
    ('/products/sportswear-baseball', '/products/sportswear/team-club/team-uniforms', 'Retired baseball category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
    ('/products/sportswear-basketball', '/products/sportswear/team-club/team-uniforms', 'Retired basketball category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
    ('/products/sportswear-cricket', '/products/sportswear/team-club/team-uniforms', 'Retired cricket category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
    ('/products/sportswear-rugby', '/products/sportswear/team-club/team-uniforms', 'Retired rugby category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
    ('/products/sportswear-soccer', '/products/sportswear/team-club/team-uniforms', 'Retired soccer category alias now resolves to the current published Team Uniforms product-type taxonomy.'),
    ('/products/sportswear/athletic-onesie', '/products/sportswear/fitness-activewear/performance-activewear', 'No current Athletic Onesie product exists; the alias resolves to the closest current published Performance & Activewear product-type taxonomy.'),
    ('/products/sportswear/baseball-jersey', '/products/sportswear/team-club/team-uniforms/baseball-uniform', 'Legacy Baseball Jersey was merged into the current published Baseball Uniform product.'),
    ('/products/sportswear/baseball-uniform-kit', '/products/sportswear/team-club/team-uniforms/baseball-uniform', 'Legacy Baseball Uniform Kit was reconciled to the current published Baseball Uniform product.'),
    ('/products/sportswear/basketball-mesh-jersey', '/products/sportswear/team-club/team-uniforms/basketball-uniform', 'Legacy Basketball Mesh Jersey was merged into the current published Basketball Uniform product.'),
    ('/products/sportswear/basketball-uniform-kit', '/products/sportswear/team-club/team-uniforms/basketball-uniform', 'Legacy Basketball Uniform Kit was reconciled to the current published Basketball Uniform product.')
)
insert into public.legacy_route_redirects (
  from_path,
  to_path,
  confidence,
  reason,
  approved_at,
  updated_at
)
select
  from_path,
  to_path,
  'review',
  reason,
  now(),
  now()
from expected
on conflict (from_path) do update
set
  to_path = excluded.to_path,
  confidence = excluded.confidence,
  reason = excluded.reason,
  approved_at = excluded.approved_at,
  updated_at = now();

do $$
declare
  reconciled_count integer;
begin
  with expected(from_path, to_path) as (
    values
      ('/products/bavarian-trachten-wear/alpine-trachten-hat', '/products/bavarian-trachten-wear/accessories/accessories/alpine-wool-hat'),
      ('/products/bavarian-trachten-wear/bavarian-checkered-shirt', '/products/bavarian-trachten-wear/men/trachten-shirts/checked-trachten-shirt'),
      ('/products/bavarian-trachten-wear/bavarian-embroidered-vest', '/products/bavarian-trachten-wear/men/vests-waistcoats/wool-trachten-vest'),
      ('/products/sportswear-baseball', '/products/sportswear/team-club/team-uniforms'),
      ('/products/sportswear-basketball', '/products/sportswear/team-club/team-uniforms'),
      ('/products/sportswear-cricket', '/products/sportswear/team-club/team-uniforms'),
      ('/products/sportswear-rugby', '/products/sportswear/team-club/team-uniforms'),
      ('/products/sportswear-soccer', '/products/sportswear/team-club/team-uniforms'),
      ('/products/sportswear/athletic-onesie', '/products/sportswear/fitness-activewear/performance-activewear'),
      ('/products/sportswear/baseball-jersey', '/products/sportswear/team-club/team-uniforms/baseball-uniform'),
      ('/products/sportswear/baseball-uniform-kit', '/products/sportswear/team-club/team-uniforms/baseball-uniform'),
      ('/products/sportswear/basketball-mesh-jersey', '/products/sportswear/team-club/team-uniforms/basketball-uniform'),
      ('/products/sportswear/basketball-uniform-kit', '/products/sportswear/team-club/team-uniforms/basketball-uniform')
  )
  select count(*)
  into reconciled_count
  from expected e
  join public.legacy_route_redirects r
    on r.from_path = e.from_path
   and r.to_path = e.to_path
   and r.approved_at is not null;

  if reconciled_count <> 13 then
    raise exception 'Expected 13 reconciled redirect rows, found %', reconciled_count;
  end if;
end
$$;

commit;
