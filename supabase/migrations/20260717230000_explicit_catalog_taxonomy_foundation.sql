-- Explicit catalogue taxonomy foundation.
-- Additive only: current categories, products, public routes and catalogue release remain unchanged.
-- All seeded nodes are draft and all assignments are proposed until owner review and a separate cutover.

begin;

create table if not exists public.catalog_taxonomy_nodes (
  id uuid primary key,
  parent_id uuid references public.catalog_taxonomy_nodes(id) on delete restrict,
  node_type text not null check (node_type in ('main_category', 'audience', 'buyer_group', 'product_type', 'accessories', 'collection')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  depth smallint not null check (depth between 0 and 2),
  full_slug_path text not null unique check (full_slug_path ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'),
  description text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  image_url text,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  publish_state text not null default 'draft' check (publish_state in ('draft', 'review', 'published', 'archived')),
  redirect_aliases text[] not null default '{}'::text[],
  seo_empty_state_reason text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((depth = 0 and parent_id is null) or (depth > 0 and parent_id is not null))
);

create unique index if not exists catalog_taxonomy_nodes_sibling_slug_uidx
  on public.catalog_taxonomy_nodes (parent_id, slug) nulls not distinct;
create index if not exists catalog_taxonomy_nodes_parent_sort_idx
  on public.catalog_taxonomy_nodes (parent_id, sort_order, name);
create index if not exists catalog_taxonomy_nodes_public_path_idx
  on public.catalog_taxonomy_nodes (publish_state, full_slug_path);
create index if not exists catalog_taxonomy_nodes_media_idx
  on public.catalog_taxonomy_nodes (media_asset_id)
  where media_asset_id is not null;

create table if not exists public.product_taxonomy_assignments (
  product_id uuid primary key references public.products(id) on delete cascade,
  taxonomy_node_id uuid not null references public.catalog_taxonomy_nodes(id) on delete restrict,
  assignment_source text not null default 'manual' check (assignment_source in ('manual', 'migration', 'admin')),
  review_state text not null default 'proposed' check (review_state in ('proposed', 'approved', 'rejected')),
  assigned_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (review_state = 'approved' and approved_at is not null)
    or (review_state <> 'approved' and approved_at is null)
  )
);

create index if not exists product_taxonomy_assignments_node_idx
  on public.product_taxonomy_assignments (taxonomy_node_id, review_state, product_id);

create table if not exists public.catalog_taxonomy_migration_map (
  id uuid primary key,
  source_kind text not null check (source_kind in ('category', 'product', 'route')),
  source_key text not null,
  source_path text not null,
  legacy_category_id uuid references public.categories(id) on delete set null,
  product_id uuid references public.products(id) on delete cascade,
  target_node_id uuid not null references public.catalog_taxonomy_nodes(id) on delete restrict,
  target_full_slug_path text not null,
  target_path text not null,
  redirect_status text not null default 'proposed' check (redirect_status in ('proposed', 'approved', 'applied', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, source_key)
);

create index if not exists catalog_taxonomy_migration_target_idx
  on public.catalog_taxonomy_migration_map (target_node_id, redirect_status);
create index if not exists catalog_taxonomy_migration_product_idx
  on public.catalog_taxonomy_migration_map (product_id)
  where product_id is not null;

create or replace function public.catalog_taxonomy_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.catalog_taxonomy_validate_node()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  parent_row public.catalog_taxonomy_nodes%rowtype;
  expected_path text;
  has_cycle boolean;
begin
  if new.parent_id is null then
    if new.depth <> 0 or new.node_type <> 'main_category' or new.full_slug_path <> new.slug then
      raise exception 'root taxonomy nodes must be depth 0 main_category nodes with full path equal to slug';
    end if;
  else
    if new.parent_id = new.id then
      raise exception 'taxonomy node cannot be its own parent';
    end if;

    select * into parent_row
    from public.catalog_taxonomy_nodes
    where id = new.parent_id;

    if not found then
      raise exception 'taxonomy parent was not found';
    end if;

    if new.depth <> parent_row.depth + 1 then
      raise exception 'taxonomy depth must equal parent depth plus one';
    end if;

    expected_path := parent_row.full_slug_path || '/' || new.slug;
    if new.full_slug_path <> expected_path then
      raise exception 'taxonomy full path must equal parent path plus slug';
    end if;

    if parent_row.node_type = 'main_category'
       and new.node_type not in ('audience', 'buyer_group', 'accessories') then
      raise exception 'main categories may contain only audience, buyer_group or accessories nodes';
    end if;

    if parent_row.node_type in ('audience', 'buyer_group', 'accessories')
       and new.node_type not in ('product_type', 'collection') then
      raise exception 'audience and buyer-group nodes may contain only product_type or collection nodes';
    end if;

    if parent_row.node_type in ('product_type', 'collection') then
      raise exception 'leaf taxonomy nodes cannot contain children';
    end if;

    if exists (
      select 1 from public.product_taxonomy_assignments a
      where a.taxonomy_node_id = new.parent_id
    ) then
      raise exception 'a taxonomy node with assigned products cannot become a parent';
    end if;

    with recursive ancestors as (
      select n.id, n.parent_id
      from public.catalog_taxonomy_nodes n
      where n.id = new.parent_id
      union all
      select n.id, n.parent_id
      from public.catalog_taxonomy_nodes n
      join ancestors a on n.id = a.parent_id
    )
    select exists (select 1 from ancestors where id = new.id)
    into has_cycle;

    if has_cycle then
      raise exception 'circular taxonomy parent relationship is not allowed';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and (
       new.parent_id is distinct from old.parent_id
       or new.node_type is distinct from old.node_type
       or new.slug is distinct from old.slug
       or new.depth is distinct from old.depth
       or new.full_slug_path is distinct from old.full_slug_path
     )
     and (
       exists (select 1 from public.catalog_taxonomy_nodes c where c.parent_id = old.id)
       or exists (select 1 from public.product_taxonomy_assignments a where a.taxonomy_node_id = old.id)
     ) then
    raise exception 'structural taxonomy changes require a controlled migration once children or products exist';
  end if;

  if coalesce(array_length(new.redirect_aliases, 1), 0) > 0
     and exists (
       select 1
       from public.catalog_taxonomy_nodes n
       where n.id <> new.id
         and n.redirect_aliases && new.redirect_aliases
     ) then
    raise exception 'taxonomy redirect aliases must be unique across nodes';
  end if;

  if new.publish_state = 'published'
     and new.node_type in ('product_type', 'collection')
     and not exists (
       select 1 from public.product_taxonomy_assignments a
       where a.taxonomy_node_id = new.id
         and a.review_state = 'approved'
     )
     and nullif(btrim(coalesce(new.seo_empty_state_reason, '')), '') is null then
    raise exception 'an empty published leaf requires an intentional SEO empty-state reason';
  end if;

  return new;
end;
$$;

create or replace function public.catalog_taxonomy_validate_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  node_row public.catalog_taxonomy_nodes%rowtype;
begin
  select * into node_row
  from public.catalog_taxonomy_nodes
  where id = new.taxonomy_node_id;

  if not found then
    raise exception 'taxonomy assignment target was not found';
  end if;

  if node_row.node_type <> 'product_type' or node_row.depth <> 2 then
    raise exception 'products may be assigned only to depth-2 product_type nodes';
  end if;

  if exists (
    select 1 from public.catalog_taxonomy_nodes child
    where child.parent_id = node_row.id
  ) then
    raise exception 'products may be assigned only to leaf taxonomy nodes';
  end if;

  if new.review_state = 'approved' and new.approved_by is null then
    raise exception 'approved taxonomy assignments require an approving user';
  end if;

  return new;
end;
$$;

create or replace function public.catalog_taxonomy_prevent_empty_published_leaf()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  old_node public.catalog_taxonomy_nodes%rowtype;
begin
  if tg_op = 'UPDATE' and new.taxonomy_node_id = old.taxonomy_node_id then
    return new;
  end if;

  select * into old_node
  from public.catalog_taxonomy_nodes
  where id = old.taxonomy_node_id;

  if found
     and old_node.publish_state = 'published'
     and old_node.node_type = 'product_type'
     and nullif(btrim(coalesce(old_node.seo_empty_state_reason, '')), '') is null
     and not exists (
       select 1
       from public.product_taxonomy_assignments a
       where a.taxonomy_node_id = old.taxonomy_node_id
         and a.product_id <> old.product_id
         and a.review_state = 'approved'
     ) then
    raise exception 'cannot empty a published product-type node without an intentional SEO decision';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists catalog_taxonomy_nodes_validate on public.catalog_taxonomy_nodes;
create trigger catalog_taxonomy_nodes_validate
before insert or update on public.catalog_taxonomy_nodes
for each row execute function public.catalog_taxonomy_validate_node();

drop trigger if exists catalog_taxonomy_nodes_touch on public.catalog_taxonomy_nodes;
create trigger catalog_taxonomy_nodes_touch
before update on public.catalog_taxonomy_nodes
for each row execute function public.catalog_taxonomy_set_updated_at();

drop trigger if exists product_taxonomy_assignments_validate on public.product_taxonomy_assignments;
create trigger product_taxonomy_assignments_validate
before insert or update on public.product_taxonomy_assignments
for each row execute function public.catalog_taxonomy_validate_assignment();

drop trigger if exists product_taxonomy_assignments_protect_leaf on public.product_taxonomy_assignments;
create trigger product_taxonomy_assignments_protect_leaf
after delete or update of taxonomy_node_id, review_state on public.product_taxonomy_assignments
for each row execute function public.catalog_taxonomy_prevent_empty_published_leaf();

drop trigger if exists product_taxonomy_assignments_touch on public.product_taxonomy_assignments;
create trigger product_taxonomy_assignments_touch
before update on public.product_taxonomy_assignments
for each row execute function public.catalog_taxonomy_set_updated_at();

drop trigger if exists catalog_taxonomy_migration_map_touch on public.catalog_taxonomy_migration_map;
create trigger catalog_taxonomy_migration_map_touch
before update on public.catalog_taxonomy_migration_map
for each row execute function public.catalog_taxonomy_set_updated_at();

alter table public.catalog_taxonomy_nodes enable row level security;
alter table public.product_taxonomy_assignments enable row level security;
alter table public.catalog_taxonomy_migration_map enable row level security;

drop policy if exists catalog_taxonomy_nodes_public_select on public.catalog_taxonomy_nodes;
create policy catalog_taxonomy_nodes_public_select
  on public.catalog_taxonomy_nodes
  for select
  to anon, authenticated
  using (publish_state = 'published');

drop policy if exists catalog_taxonomy_nodes_admin_all on public.catalog_taxonomy_nodes;
create policy catalog_taxonomy_nodes_admin_all
  on public.catalog_taxonomy_nodes
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists product_taxonomy_assignments_public_select on public.product_taxonomy_assignments;
create policy product_taxonomy_assignments_public_select
  on public.product_taxonomy_assignments
  for select
  to anon, authenticated
  using (
    review_state = 'approved'
    and exists (
      select 1 from public.catalog_taxonomy_nodes n
      where n.id = taxonomy_node_id
        and n.publish_state = 'published'
    )
    and exists (
      select 1 from public.products p
      where p.id = product_id
        and p.is_published
    )
  );

drop policy if exists product_taxonomy_assignments_admin_all on public.product_taxonomy_assignments;
create policy product_taxonomy_assignments_admin_all
  on public.product_taxonomy_assignments
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists catalog_taxonomy_migration_map_admin_all on public.catalog_taxonomy_migration_map;
create policy catalog_taxonomy_migration_map_admin_all
  on public.catalog_taxonomy_migration_map
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

revoke all on table public.catalog_taxonomy_nodes from anon, authenticated;
revoke all on table public.product_taxonomy_assignments from anon, authenticated;
revoke all on table public.catalog_taxonomy_migration_map from anon, authenticated;
grant select on table public.catalog_taxonomy_nodes to anon, authenticated;
grant select on table public.product_taxonomy_assignments to anon, authenticated;
grant insert, update, delete on table public.catalog_taxonomy_nodes to authenticated;
grant insert, update, delete on table public.product_taxonomy_assignments to authenticated;
grant select, insert, update, delete on table public.catalog_taxonomy_migration_map to authenticated;

create or replace function public.catalog_get_public_taxonomy()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'nodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'parent_id', n.parent_id,
          'node_type', n.node_type,
          'slug', n.slug,
          'name', n.name,
          'depth', n.depth,
          'full_slug_path', n.full_slug_path,
          'description', n.description,
          'media_asset_id', n.media_asset_id,
          'image_url', n.image_url,
          'seo_title', n.seo_title,
          'seo_description', n.seo_description,
          'sort_order', n.sort_order,
          'redirect_aliases', to_jsonb(n.redirect_aliases),
          'updated_at', n.updated_at
        ) order by n.depth, n.full_slug_path, n.sort_order, n.name
      )
      from public.catalog_taxonomy_nodes n
      where n.publish_state = 'published'
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_id', a.product_id,
          'product_slug', p.slug,
          'taxonomy_node_id', a.taxonomy_node_id,
          'full_slug_path', n.full_slug_path,
          'canonical_path', '/products/' || n.full_slug_path || '/' || p.slug,
          'approved_at', a.approved_at
        ) order by n.full_slug_path, p.slug
      )
      from public.product_taxonomy_assignments a
      join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
      join public.products p on p.id = a.product_id
      where a.review_state = 'approved'
        and n.publish_state = 'published'
        and p.is_published
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.catalog_get_public_taxonomy() from public;
grant execute on function public.catalog_get_public_taxonomy() to anon, authenticated;

comment on table public.catalog_taxonomy_nodes is
  'Explicit owner-reviewed Main Category → Audience/Buyer Group → Product Type hierarchy. Draft by default; no runtime keyword guessing.';
comment on table public.product_taxonomy_assignments is
  'One explicit leaf product-type assignment per product. Proposed assignments are invisible to the public projection.';
comment on table public.catalog_taxonomy_migration_map is
  'Reviewed old-to-new category, product and route migration evidence used before redirect cutover.';
comment on function public.catalog_get_public_taxonomy() is
  'Security-invoker published taxonomy projection. RLS exposes approved assignments and published nodes only.';

-- Seed the five current commercial roots as draft nodes.
insert into public.catalog_taxonomy_nodes (
  id, parent_id, node_type, slug, name, depth, full_slug_path,
  description, image_url, seo_title, seo_description, sort_order, publish_state
)
select
  md5('irha-taxonomy:' || c.slug)::uuid,
  null,
  'main_category',
  c.slug,
  c.name,
  0,
  c.slug,
  c.description,
  c.image_url,
  c.seo_title,
  c.seo_description,
  c.sort_order,
  'draft'
from public.categories c
where c.parent_id is null
  and c.slug in (
    'bavarian-trachten-wear',
    'premium-leather-apparel',
    'sportswear',
    'streetwear-activewear',
    'leisure-nightwear'
  )
on conflict (full_slug_path) do update
set name = excluded.name,
    description = excluded.description,
    image_url = excluded.image_url,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Seed only commercially relevant groups. Empty Men/Women/Kids groups are not forced into categories.
with groups(parent_path, slug, node_type, name, sort_order) as (
  values
    ('bavarian-trachten-wear', 'men', 'audience', 'Men', 10),
    ('bavarian-trachten-wear', 'women', 'audience', 'Women', 20),
    ('bavarian-trachten-wear', 'kids', 'audience', 'Kids', 30),
    ('bavarian-trachten-wear', 'accessories', 'accessories', 'Accessories', 40),
    ('premium-leather-apparel', 'men', 'audience', 'Men', 10),
    ('premium-leather-apparel', 'accessories', 'accessories', 'Accessories', 20),
    ('sportswear', 'team-club', 'buyer_group', 'Team & Club', 10),
    ('sportswear', 'women', 'audience', 'Women', 20),
    ('sportswear', 'unisex', 'audience', 'Unisex', 30),
    ('streetwear-activewear', 'unisex', 'audience', 'Unisex', 10),
    ('leisure-nightwear', 'men', 'audience', 'Men', 10),
    ('leisure-nightwear', 'women', 'audience', 'Women', 20),
    ('leisure-nightwear', 'unisex', 'audience', 'Unisex', 30)
)
insert into public.catalog_taxonomy_nodes (
  id, parent_id, node_type, slug, name, depth, full_slug_path,
  description, seo_title, seo_description, sort_order, publish_state
)
select
  md5('irha-taxonomy:' || g.parent_path || '/' || g.slug)::uuid,
  parent.id,
  g.node_type,
  g.slug,
  g.name,
  1,
  g.parent_path || '/' || g.slug,
  g.name || ' B2B manufacturing programs developed against buyer-approved specifications.',
  g.name || ' Apparel Manufacturer | Irha Apparels',
  'Wholesale, OEM, ODM and private-label ' || lower(g.name) || ' programs. Specifications are confirmed after buyer and factory review.',
  g.sort_order,
  'draft'
from groups g
join public.catalog_taxonomy_nodes parent on parent.full_slug_path = g.parent_path
on conflict (full_slug_path) do update
set name = excluded.name,
    node_type = excluded.node_type,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    sort_order = excluded.sort_order,
    updated_at = now();

with product_types(parent_path, slug, name, sort_order) as (
  values
    ('bavarian-trachten-wear/accessories', 'alpine-hats', 'Alpine Hats', 10),
    ('bavarian-trachten-wear/accessories', 'haferl-shoes', 'Haferl Shoes', 20),
    ('bavarian-trachten-wear/accessories', 'neckerchiefs-scarves', 'Neckerchiefs & Scarves', 30),
    ('bavarian-trachten-wear/accessories', 'trachten-belts', 'Trachten Belts', 40),
    ('bavarian-trachten-wear/accessories', 'trachten-socks', 'Trachten Socks', 50),
    ('bavarian-trachten-wear/accessories', 'trachten-suspenders', 'Trachten Suspenders', 60),
    ('bavarian-trachten-wear/kids', 'boys-lederhosen', 'Boys'' Lederhosen', 10),
    ('bavarian-trachten-wear/kids', 'girls-dirndl', 'Girls'' Dirndl Dresses', 20),
    ('bavarian-trachten-wear/men', 'short-lederhosen', 'Short Lederhosen', 10),
    ('bavarian-trachten-wear/men', 'trachten-shirts', 'Trachten Shirts', 20),
    ('bavarian-trachten-wear/men', 'trachten-vests', 'Trachten Vests', 30),
    ('bavarian-trachten-wear/women', 'dirndl-aprons', 'Dirndl Aprons', 10),
    ('bavarian-trachten-wear/women', 'dirndl-blouses', 'Dirndl Blouses', 20),
    ('bavarian-trachten-wear/women', 'dirndl-dresses', 'Dirndl Dresses', 30),
    ('leisure-nightwear/men', 'nightshirts', 'Nightshirts', 10),
    ('leisure-nightwear/men', 'pajama-pants', 'Pajama Pants', 20),
    ('leisure-nightwear/men', 'pajama-sets', 'Pajama Sets', 30),
    ('leisure-nightwear/men', 'sleep-t-shirts', 'Sleep T-Shirts', 40),
    ('leisure-nightwear/unisex', 'casual-shirts', 'Casual Shirts', 10),
    ('leisure-nightwear/unisex', 'casual-shorts', 'Casual Shorts', 20),
    ('leisure-nightwear/unisex', 'henley-shirts', 'Henley Shirts', 30),
    ('leisure-nightwear/unisex', 'polo-shirts', 'Polo Shirts', 40),
    ('leisure-nightwear/unisex', 't-shirts-tops', 'T-Shirts & Tops', 50),
    ('leisure-nightwear/women', 'bathrobes', 'Bathrobes', 10),
    ('leisure-nightwear/women', 'nightgowns-slips', 'Nightgowns & Slips', 20),
    ('premium-leather-apparel/accessories', 'leather-bags', 'Leather Bags', 10),
    ('premium-leather-apparel/accessories', 'leather-belts', 'Leather Belts', 20),
    ('premium-leather-apparel/accessories', 'leather-gloves', 'Leather Gloves', 30),
    ('premium-leather-apparel/accessories', 'leather-wallets', 'Leather Wallets', 40),
    ('premium-leather-apparel/men', 'biker-jackets', 'Biker Jackets', 10),
    ('premium-leather-apparel/men', 'bomber-jackets', 'Bomber Jackets', 20),
    ('premium-leather-apparel/men', 'leather-trousers', 'Leather Trousers', 30),
    ('premium-leather-apparel/men', 'leather-vests', 'Leather Vests', 40),
    ('sportswear/team-club', 'baseball-uniforms', 'Baseball Uniforms', 10),
    ('sportswear/team-club', 'basketball-uniforms', 'Basketball Uniforms', 20),
    ('sportswear/team-club', 'cricket-uniforms', 'Cricket Uniforms', 30),
    ('sportswear/team-club', 'football-kits', 'Football & Soccer Kits', 40),
    ('sportswear/team-club', 'rugby-kits', 'Rugby Kits', 50),
    ('sportswear/unisex', 'athletic-bodysuits', 'Athletic Bodysuits', 10),
    ('sportswear/unisex', 'performance-tops', 'Performance Tops', 20),
    ('sportswear/unisex', 'running-shorts', 'Running Shorts', 30),
    ('sportswear/unisex', 'tracksuits-track-pants', 'Tracksuits & Track Pants', 40),
    ('sportswear/unisex', 'training-outerwear', 'Training Outerwear', 50),
    ('sportswear/women', 'leggings-performance-bottoms', 'Leggings & Performance Bottoms', 10),
    ('sportswear/women', 'sports-bras', 'Sports Bras', 20),
    ('streetwear-activewear/unisex', 'cargo-pants', 'Cargo Pants', 10),
    ('streetwear-activewear/unisex', 'hoodies-sweatshirts', 'Hoodies & Sweatshirts', 20),
    ('streetwear-activewear/unisex', 'jackets-bombers', 'Jackets & Bombers', 30),
    ('streetwear-activewear/unisex', 'joggers-sweatpants', 'Joggers & Sweatpants', 40),
    ('streetwear-activewear/unisex', 'streetwear-shorts', 'Streetwear Shorts', 50),
    ('streetwear-activewear/unisex', 't-shirts-tops', 'T-Shirts & Tops', 60)
)
insert into public.catalog_taxonomy_nodes (
  id, parent_id, node_type, slug, name, depth, full_slug_path,
  description, seo_title, seo_description, sort_order, publish_state
)
select
  md5('irha-taxonomy:' || pt.parent_path || '/' || pt.slug)::uuid,
  parent.id,
  'product_type',
  pt.slug,
  pt.name,
  2,
  pt.parent_path || '/' || pt.slug,
  pt.name || ' programs for wholesale, OEM, ODM and private-label buyers. Exact materials, construction, branding, packaging, quantity and timing are confirmed after review.',
  pt.name || ' Manufacturer | Irha Apparels',
  'Custom ' || lower(pt.name) || ' manufacturing for wholesale, OEM, ODM and private-label buyer programs.',
  pt.sort_order,
  'draft'
from product_types pt
join public.catalog_taxonomy_nodes parent on parent.full_slug_path = pt.parent_path
on conflict (full_slug_path) do update
set name = excluded.name,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Freeze the current 86-product inventory into one explicit leaf assignment per product.
with mapping(product_slug, target_path) as (
  values
    ('alpine-trachten-hat', 'bavarian-trachten-wear/accessories/alpine-hats'),
    ('athletic-onesie', 'sportswear/unisex/athletic-bodysuits'),
    ('baseball-jersey', 'sportswear/team-club/baseball-uniforms'),
    ('baseball-uniform-kit', 'sportswear/team-club/baseball-uniforms'),
    ('basketball-mesh-jersey', 'sportswear/team-club/basketball-uniforms'),
    ('basketball-uniform-kit', 'sportswear/team-club/basketball-uniforms'),
    ('bavarian-checkered-shirt', 'bavarian-trachten-wear/men/trachten-shirts'),
    ('bavarian-embroidered-vest', 'bavarian-trachten-wear/men/trachten-vests'),
    ('bavarian-embroidered-vest-reference-style-02', 'bavarian-trachten-wear/men/trachten-vests'),
    ('bavarian-embroidered-vest-reference-style-03', 'bavarian-trachten-wear/men/trachten-vests'),
    ('bavarian-leather-belt', 'bavarian-trachten-wear/accessories/trachten-belts'),
    ('bavarian-leather-belt-reference-style-02', 'bavarian-trachten-wear/accessories/trachten-belts'),
    ('bavarian-men-s-checkered-shirt', 'bavarian-trachten-wear/men/trachten-shirts'),
    ('bavarian-men-s-checkered-shirt-reference-style-02', 'bavarian-trachten-wear/men/trachten-shirts'),
    ('bavarian-men-s-checkered-shirt-reference-style-03', 'bavarian-trachten-wear/men/trachten-shirts'),
    ('bavarian-neckerchief', 'bavarian-trachten-wear/accessories/neckerchiefs-scarves'),
    ('bavarian-suspenders', 'bavarian-trachten-wear/accessories/trachten-suspenders'),
    ('bomber-jacket', 'streetwear-activewear/unisex/jackets-bombers'),
    ('bomber-leather-jacket', 'premium-leather-apparel/men/bomber-jackets'),
    ('casual-button-up-shirt', 'leisure-nightwear/unisex/casual-shirts'),
    ('casual-sweatpants', 'streetwear-activewear/unisex/joggers-sweatpants'),
    ('children-s-dirndl', 'bavarian-trachten-wear/kids/girls-dirndl'),
    ('children-s-lederhosen', 'bavarian-trachten-wear/kids/boys-lederhosen'),
    ('children-s-lederhosen-reference-style-02', 'bavarian-trachten-wear/kids/boys-lederhosen'),
    ('classic-biker-leather-jacket', 'premium-leather-apparel/men/biker-jackets'),
    ('compression-performance-top', 'sportswear/unisex/performance-tops'),
    ('cotton-nightshirt', 'leisure-nightwear/men/nightshirts'),
    ('cotton-sleep-pants', 'leisure-nightwear/men/pajama-pants'),
    ('cricket-jersey', 'sportswear/team-club/cricket-uniforms'),
    ('cricket-uniform-kit', 'sportswear/team-club/cricket-uniforms'),
    ('dirndl-apron', 'bavarian-trachten-wear/women/dirndl-aprons'),
    ('dirndl-blouse', 'bavarian-trachten-wear/women/dirndl-blouses'),
    ('dirndl-blouse-reference-style-02', 'bavarian-trachten-wear/women/dirndl-blouses'),
    ('dirndl-blouse-reference-style-03', 'bavarian-trachten-wear/women/dirndl-blouses'),
    ('essential-v-neck-t-shirt', 'leisure-nightwear/unisex/t-shirts-tops'),
    ('full-grain-leather-belt', 'premium-leather-apparel/accessories/leather-belts'),
    ('gym-leggings', 'sportswear/women/leggings-performance-bottoms'),
    ('gym-tank-top', 'sportswear/unisex/performance-tops'),
    ('haferl-leather-shoes', 'bavarian-trachten-wear/accessories/haferl-shoes'),
    ('haferl-leather-shoes-reference-style-02', 'bavarian-trachten-wear/accessories/haferl-shoes'),
    ('haferl-leather-shoes-reference-style-03', 'bavarian-trachten-wear/accessories/haferl-shoes'),
    ('henley-long-sleeve-shirt', 'leisure-nightwear/unisex/henley-shirts'),
    ('knee-high-bavarian-socks', 'bavarian-trachten-wear/accessories/trachten-socks'),
    ('knee-high-bavarian-socks-reference-style-02', 'bavarian-trachten-wear/accessories/trachten-socks'),
    ('knee-high-bavarian-socks-reference-style-03', 'bavarian-trachten-wear/accessories/trachten-socks'),
    ('leather-gloves', 'premium-leather-apparel/accessories/leather-gloves'),
    ('leather-gloves-reference-style-02', 'premium-leather-apparel/accessories/leather-gloves'),
    ('leather-gloves-reference-style-03', 'premium-leather-apparel/accessories/leather-gloves'),
    ('leather-trousers', 'premium-leather-apparel/men/leather-trousers'),
    ('leather-trousers-reference-style-02', 'premium-leather-apparel/men/leather-trousers'),
    ('leather-trousers-reference-style-03', 'premium-leather-apparel/men/leather-trousers'),
    ('leather-vest-waistcoat', 'premium-leather-apparel/men/leather-vests'),
    ('leather-wallet', 'premium-leather-apparel/accessories/leather-wallets'),
    ('long-sleeve-streetwear-tee', 'streetwear-activewear/unisex/t-shirts-tops'),
    ('lounge-shorts', 'leisure-nightwear/unisex/casual-shorts'),
    ('oversized-graphic-t-shirt', 'streetwear-activewear/unisex/t-shirts-tops'),
    ('oversized-streetwear-hoodie', 'streetwear-activewear/unisex/hoodies-sweatshirts'),
    ('performance-gym-hoodie', 'sportswear/unisex/training-outerwear'),
    ('performance-sports-bra', 'sportswear/women/sports-bras'),
    ('performance-tracksuit-set', 'sportswear/unisex/tracksuits-track-pants'),
    ('pique-polo-shirt', 'leisure-nightwear/unisex/polo-shirts'),
    ('plush-bathrobe-sleep-robe', 'leisure-nightwear/women/bathrobes'),
    ('premium-basic-crewneck-tee', 'leisure-nightwear/unisex/t-shirts-tops'),
    ('premium-chino-shorts', 'leisure-nightwear/unisex/casual-shorts'),
    ('premium-leather-bag', 'premium-leather-apparel/accessories/leather-bags'),
    ('premium-leather-bag-reference-style-02', 'premium-leather-apparel/accessories/leather-bags'),
    ('premium-leather-bag-reference-style-03', 'premium-leather-apparel/accessories/leather-bags'),
    ('quarter-zip-pullover', 'sportswear/unisex/training-outerwear'),
    ('rugby-jersey', 'sportswear/team-club/rugby-kits'),
    ('rugby-uniform-kit', 'sportswear/team-club/rugby-kits'),
    ('running-shorts', 'sportswear/unisex/running-shorts'),
    ('silk-nightgown-slip', 'leisure-nightwear/women/nightgowns-slips'),
    ('sleep-shorts-set', 'leisure-nightwear/men/pajama-sets'),
    ('sleep-t-shirt', 'leisure-nightwear/men/sleep-t-shirts'),
    ('streetwear-shorts', 'streetwear-activewear/unisex/streetwear-shorts'),
    ('sublimated-soccer-uniform-kit', 'sportswear/team-club/football-kits'),
    ('tactical-cargo-pants', 'streetwear-activewear/unisex/cargo-pants'),
    ('track-pants', 'sportswear/unisex/tracksuits-track-pants'),
    ('traditional-dirndl-dress', 'bavarian-trachten-wear/women/dirndl-dresses'),
    ('traditional-dirndl-dress-reference-style-02', 'bavarian-trachten-wear/women/dirndl-dresses'),
    ('traditional-dirndl-dress-reference-style-03', 'bavarian-trachten-wear/women/dirndl-dresses'),
    ('traditional-lederhosen', 'bavarian-trachten-wear/men/short-lederhosen'),
    ('traditional-lederhosen-reference-style-02', 'bavarian-trachten-wear/men/short-lederhosen'),
    ('traditional-lederhosen-reference-style-03', 'bavarian-trachten-wear/men/short-lederhosen'),
    ('training-shirt', 'sportswear/unisex/performance-tops'),
    ('zip-up-fleece-jacket', 'sportswear/unisex/training-outerwear')
), resolved as (
  select p.id as product_id, p.category_id, p.slug as product_slug, n.id as node_id, n.full_slug_path
  from mapping m
  join public.products p on p.slug = m.product_slug
  join public.catalog_taxonomy_nodes n on n.full_slug_path = m.target_path
)
insert into public.product_taxonomy_assignments (
  product_id, taxonomy_node_id, assignment_source, review_state
)
select product_id, node_id, 'migration', 'proposed'
from resolved
on conflict (product_id) do update
set taxonomy_node_id = excluded.taxonomy_node_id,
    assignment_source = excluded.assignment_source,
    review_state = 'proposed',
    approved_by = null,
    approved_at = null,
    updated_at = now();

-- Product-level old-to-new canonical map. Status remains proposed until owner review.
insert into public.catalog_taxonomy_migration_map (
  id, source_kind, source_key, source_path, legacy_category_id, product_id,
  target_node_id, target_full_slug_path, target_path, redirect_status, notes
)
select
  md5('irha-taxonomy-map:product:' || p.slug)::uuid,
  'product',
  p.slug,
  '/products/' || split_part(n.full_slug_path, '/', 1) || '/' || p.slug,
  p.category_id,
  p.id,
  n.id,
  n.full_slug_path,
  '/products/' || n.full_slug_path || '/' || p.slug,
  'proposed',
  'Explicit 2026-07-17 inventory mapping; no redirect is active until a separate owner-approved cutover.'
from public.product_taxonomy_assignments a
join public.products p on p.id = a.product_id
join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
on conflict (source_kind, source_key) do update
set legacy_category_id = excluded.legacy_category_id,
    product_id = excluded.product_id,
    target_node_id = excluded.target_node_id,
    target_full_slug_path = excluded.target_full_slug_path,
    target_path = excluded.target_path,
    redirect_status = 'proposed',
    notes = excluded.notes,
    updated_at = now();

with category_routes(source_slug, target_full_path) as (
  values
    ('bavarian-men', 'bavarian-trachten-wear/men'),
    ('bavarian-women', 'bavarian-trachten-wear/women'),
    ('bavarian-kids', 'bavarian-trachten-wear/kids'),
    ('bavarian-accessories', 'bavarian-trachten-wear/accessories'),
    ('leather-jackets', 'premium-leather-apparel/men'),
    ('leather-vests', 'premium-leather-apparel/men/leather-vests'),
    ('leather-bottoms', 'premium-leather-apparel/men/leather-trousers'),
    ('leather-accessories', 'premium-leather-apparel/accessories'),
    ('sportswear-soccer', 'sportswear/team-club/football-kits'),
    ('sportswear-cricket', 'sportswear/team-club/cricket-uniforms'),
    ('sportswear-baseball', 'sportswear/team-club/baseball-uniforms'),
    ('sportswear-basketball', 'sportswear/team-club/basketball-uniforms'),
    ('sportswear-rugby', 'sportswear/team-club/rugby-kits'),
    ('sportswear-gym', 'sportswear'),
    ('streetwear-tops', 'streetwear-activewear/unisex'),
    ('streetwear-bottoms', 'streetwear-activewear/unisex'),
    ('leisurewear-tops', 'leisure-nightwear/unisex'),
    ('leisurewear-bottoms', 'leisure-nightwear/unisex'),
    ('leisure-nightwear-men', 'leisure-nightwear/men'),
    ('leisure-nightwear-women', 'leisure-nightwear/women'),
    ('nightwear-archived', 'leisure-nightwear')
)
insert into public.catalog_taxonomy_migration_map (
  id, source_kind, source_key, source_path, legacy_category_id,
  target_node_id, target_full_slug_path, target_path, redirect_status, notes
)
select
  md5('irha-taxonomy-map:category:' || cr.source_slug)::uuid,
  'category',
  cr.source_slug,
  '/products/' || cr.source_slug,
  c.id,
  n.id,
  n.full_slug_path,
  '/products/' || n.full_slug_path,
  'proposed',
  'Legacy category route proposal; mixed old categories resolve to the nearest truthful parent rather than an incorrect audience.'
from category_routes cr
join public.categories c on c.slug = cr.source_slug
join public.catalog_taxonomy_nodes n on n.full_slug_path = cr.target_full_path
on conflict (source_kind, source_key) do update
set legacy_category_id = excluded.legacy_category_id,
    target_node_id = excluded.target_node_id,
    target_full_slug_path = excluded.target_full_slug_path,
    target_path = excluded.target_path,
    redirect_status = 'proposed',
    notes = excluded.notes,
    updated_at = now();

insert into public.catalog_taxonomy_migration_map (
  id, source_kind, source_key, source_path,
  target_node_id, target_full_slug_path, target_path, redirect_status, notes
)
select
  md5('irha-taxonomy-map:route:/products/nightwear')::uuid,
  'route',
  '/products/nightwear',
  '/products/nightwear',
  n.id,
  n.full_slug_path,
  '/products/leisure-nightwear',
  'proposed',
  'Archived Nightwear route proposal; no redirect is active until the owner-approved cutover.'
from public.catalog_taxonomy_nodes n
where n.full_slug_path = 'leisure-nightwear'
on conflict (source_kind, source_key) do update
set target_node_id = excluded.target_node_id,
    target_full_slug_path = excluded.target_full_slug_path,
    target_path = excluded.target_path,
    redirect_status = 'proposed',
    notes = excluded.notes,
    updated_at = now();

-- Fail closed if the live product inventory changed or any mapping is incomplete.
do $$
declare
  published_products bigint;
  assigned_published_products bigint;
  product_map_rows bigint;
begin
  select count(*) into published_products
  from public.products
  where is_published;

  select count(*) into assigned_published_products
  from public.products p
  join public.product_taxonomy_assignments a on a.product_id = p.id
  join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
  where p.is_published
    and n.node_type = 'product_type'
    and n.depth = 2;

  select count(*) into product_map_rows
  from public.catalog_taxonomy_migration_map
  where source_kind = 'product';

  if published_products <> 86 then
    raise exception 'published product inventory changed: expected reviewed snapshot 86, found %', published_products;
  end if;

  if assigned_published_products <> published_products then
    raise exception 'every published product must have exactly one explicit depth-2 product-type assignment';
  end if;

  if product_map_rows <> published_products then
    raise exception 'every published product must have one old-to-new migration-map row';
  end if;

  if exists (
    select 1
    from public.product_taxonomy_assignments a
    join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
    where n.node_type <> 'product_type'
       or n.depth <> 2
       or exists (
         select 1 from public.catalog_taxonomy_nodes child
         where child.parent_id = n.id
       )
  ) then
    raise exception 'product assignments must target leaf product-type nodes only';
  end if;

  if not exists (
    select 1
    from public.product_taxonomy_assignments a
    join public.products p on p.id = a.product_id
    join public.catalog_taxonomy_nodes n on n.id = a.taxonomy_node_id
    where p.slug = 'traditional-lederhosen'
      and n.full_slug_path = 'bavarian-trachten-wear/men/short-lederhosen'
  ) then
    raise exception 'semantic guard failed: Short Lederhosen must remain under Men, never Accessories';
  end if;

  if exists (
    select 1
    from public.catalog_taxonomy_nodes n
    where n.publish_state <> 'draft'
  ) then
    raise exception 'foundation migration must not publish taxonomy nodes';
  end if;

  if exists (
    select 1
    from public.product_taxonomy_assignments a
    where a.review_state <> 'proposed'
  ) then
    raise exception 'foundation migration must not approve product assignments';
  end if;
end
$$;

commit;
