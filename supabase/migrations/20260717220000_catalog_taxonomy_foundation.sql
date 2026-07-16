-- Database-owned public catalogue hierarchy:
-- Main category -> audience/buyer group -> product collection -> products.
-- Existing rule-based taxonomy remains a resilient frontend fallback.

create table if not exists public.catalog_audiences (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 120),
  keyword text,
  description text,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table if not exists public.catalog_collections (
  id uuid primary key default gen_random_uuid(),
  audience_id uuid not null references public.catalog_audiences(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 160),
  keyword text,
  description text,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audience_id, slug)
);

create table if not exists public.catalog_product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.catalog_collections(id) on delete cascade,
  is_primary boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, collection_id)
);

create unique index if not exists catalog_product_collections_one_primary_per_product
  on public.catalog_product_collections(product_id)
  where is_primary;
create index if not exists catalog_audiences_category_sort_idx
  on public.catalog_audiences(category_id, is_published, sort_order, slug);
create index if not exists catalog_collections_audience_sort_idx
  on public.catalog_collections(audience_id, is_published, sort_order, slug);
create index if not exists catalog_product_collections_collection_sort_idx
  on public.catalog_product_collections(collection_id, sort_order, product_id);

create or replace function public.catalog_validate_product_collection_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  product_top_category_id uuid;
  collection_top_category_id uuid;
begin
  select coalesce(c.parent_id, c.id)
    into product_top_category_id
  from public.products p
  join public.categories c on c.id = p.category_id
  where p.id = new.product_id;

  select a.category_id
    into collection_top_category_id
  from public.catalog_collections cc
  join public.catalog_audiences a on a.id = cc.audience_id
  where cc.id = new.collection_id;

  if product_top_category_id is null or collection_top_category_id is null then
    raise exception 'Product or catalogue collection does not exist';
  end if;

  if product_top_category_id is distinct from collection_top_category_id then
    raise exception 'Product and collection must belong to the same top-level category';
  end if;

  return new;
end
$function$;

revoke all on function public.catalog_validate_product_collection_assignment() from public, anon, authenticated;

drop trigger if exists catalog_product_collection_validate on public.catalog_product_collections;
create trigger catalog_product_collection_validate
before insert or update on public.catalog_product_collections
for each row execute function public.catalog_validate_product_collection_assignment();

drop trigger if exists catalog_audiences_touch_updated_at on public.catalog_audiences;
create trigger catalog_audiences_touch_updated_at
before update on public.catalog_audiences
for each row execute function public.catalog_touch_updated_at();

drop trigger if exists catalog_collections_touch_updated_at on public.catalog_collections;
create trigger catalog_collections_touch_updated_at
before update on public.catalog_collections
for each row execute function public.catalog_touch_updated_at();

drop trigger if exists catalog_product_collections_touch_updated_at on public.catalog_product_collections;
create trigger catalog_product_collections_touch_updated_at
before update on public.catalog_product_collections
for each row execute function public.catalog_touch_updated_at();

alter table public.catalog_audiences enable row level security;
alter table public.catalog_collections enable row level security;
alter table public.catalog_product_collections enable row level security;

revoke all on table public.catalog_audiences from public, anon, authenticated;
revoke all on table public.catalog_collections from public, anon, authenticated;
revoke all on table public.catalog_product_collections from public, anon, authenticated;
grant select, insert, update, delete on table public.catalog_audiences to authenticated;
grant select, insert, update, delete on table public.catalog_collections to authenticated;
grant select, insert, update, delete on table public.catalog_product_collections to authenticated;

drop policy if exists catalog_audiences_admin_all on public.catalog_audiences;
create policy catalog_audiences_admin_all
on public.catalog_audiences
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists catalog_collections_admin_all on public.catalog_collections;
create policy catalog_collections_admin_all
on public.catalog_collections
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists catalog_product_collections_admin_all on public.catalog_product_collections;
create policy catalog_product_collections_admin_all
on public.catalog_product_collections
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Seed audience groups only where the current catalogue contains relevant products.
with audience_seed(top_slug, slug, name, keyword, description, sort_order) as (
  values
    ('bavarian-trachten-wear','men','Men','men''s Trachten manufacturer','Lederhosen, Trachten shirts and vests for wholesale and private-label programs.',10),
    ('bavarian-trachten-wear','women','Women','women''s Dirndl manufacturer','Dirndl dresses, blouses and aprons developed to buyer specification.',20),
    ('bavarian-trachten-wear','kids','Kids','kids Bavarian clothing manufacturer','Boys'' Lederhosen and girls'' Dirndl programs.',30),
    ('bavarian-trachten-wear','accessories','Accessories','Bavarian accessories manufacturer','Hats, belts, suspenders, socks, footwear and supporting Trachten accessories.',40),
    ('premium-leather-apparel','unisex','Unisex','custom leather apparel manufacturer','Leather jackets, vests and trousers for private-label programs.',10),
    ('premium-leather-apparel','accessories','Accessories','private-label leather accessories manufacturer','Belts, gloves, wallets and bags developed from buyer briefs.',20),
    ('sportswear','team-club','Teams & Clubs','custom teamwear manufacturer','Club, academy and team uniform programs.',10),
    ('sportswear','women','Women','women''s performance sportswear manufacturer','Women''s gym and performance apparel programs.',20),
    ('sportswear','unisex','Unisex','custom training wear manufacturer','Training, gym, tracksuit and performance apparel programs.',30),
    ('streetwear-activewear','unisex','Unisex','private-label streetwear manufacturer','Oversized, relaxed-fit and gender-neutral streetwear programs.',10),
    ('leisure-nightwear','unisex','Unisex','private-label leisurewear manufacturer','Casual tops and leisure bottoms for wholesale programs.',10),
    ('leisure-nightwear','men','Men','men''s nightwear manufacturer','Men''s sleepwear, lounge and pajama programs.',20),
    ('leisure-nightwear','women','Women','women''s nightwear manufacturer','Women''s robes and nightgown programs.',30)
)
insert into public.catalog_audiences(category_id, slug, name, keyword, description, sort_order, is_published)
select top.id, s.slug, s.name, s.keyword, s.description, s.sort_order, true
from audience_seed s
join public.categories top on top.slug = s.top_slug and top.parent_id is null
on conflict (category_id, slug) do update
set name = excluded.name,
    keyword = excluded.keyword,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_published = true;

with collection_seed(top_slug, audience_slug, slug, name, keyword, description, sort_order) as (
  values
    ('bavarian-trachten-wear','men','lederhosen','Lederhosen','Lederhosen manufacturer','Traditional and reference Lederhosen styles for wholesale and private-label programs.',10),
    ('bavarian-trachten-wear','men','trachten-shirts','Trachten Shirts','Trachten shirt manufacturer','Checkered and traditional-inspired shirts developed to buyer specification.',20),
    ('bavarian-trachten-wear','men','trachten-vests','Trachten Vests','Trachten vest manufacturer','Embroidered vests and waistcoats for coordinated Bavarian programs.',30),
    ('bavarian-trachten-wear','women','dirndl-dresses','Dirndl Dresses','Dirndl dress manufacturer','Traditional and reference Dirndl dress programs.',10),
    ('bavarian-trachten-wear','women','dirndl-blouses','Dirndl Blouses','Dirndl blouse manufacturer','Buyer-specified Dirndl blouses and coordinated tops.',20),
    ('bavarian-trachten-wear','women','dirndl-aprons','Dirndl Aprons','Dirndl apron manufacturer','Custom aprons for coordinated Dirndl collections.',30),
    ('bavarian-trachten-wear','kids','boys-lederhosen','Boys'' Lederhosen','boys Lederhosen manufacturer','Children''s Lederhosen programs for retailers and private labels.',10),
    ('bavarian-trachten-wear','kids','girls-dirndl','Girls'' Dirndl Dresses','girls Dirndl manufacturer','Children''s Dirndl programs with custom sizing and decoration.',20),
    ('bavarian-trachten-wear','accessories','hats-headwear','Bavarian Hats & Headwear','Bavarian hat manufacturer','Traditional-inspired Alpine hats and headwear.',10),
    ('bavarian-trachten-wear','accessories','suspenders-belts','Suspenders & Belts','Bavarian suspenders and belt manufacturer','Leather suspenders and belts for complete Trachten programs.',20),
    ('bavarian-trachten-wear','accessories','scarves-neckerchiefs','Scarves & Neckerchiefs','Bavarian neckerchief manufacturer','Neckerchiefs and scarves for coordinated Bavarian ranges.',30),
    ('bavarian-trachten-wear','accessories','socks-footwear','Trachten Socks & Footwear','Trachten socks and footwear supplier','Knee-high socks and Haferl footwear programs.',40),
    ('premium-leather-apparel','unisex','biker-jackets','Biker Leather Jackets','biker leather jacket manufacturer','Motorcycle-inspired leather jacket programs.',10),
    ('premium-leather-apparel','unisex','bomber-jackets','Leather Bomber Jackets','leather bomber jacket manufacturer','Private-label leather bomber jacket programs.',20),
    ('premium-leather-apparel','unisex','leather-vests','Leather Vests & Waistcoats','leather vest manufacturer','Leather vest and waistcoat programs.',30),
    ('premium-leather-apparel','unisex','leather-trousers','Leather Trousers','leather trousers manufacturer','Leather trouser programs developed to buyer specification.',40),
    ('premium-leather-apparel','accessories','leather-belts','Leather Belts','private-label leather belt manufacturer','Custom-branded leather belt programs.',10),
    ('premium-leather-apparel','accessories','leather-gloves','Leather Gloves','leather glove manufacturer','Leather glove programs for retail and private labels.',20),
    ('premium-leather-apparel','accessories','leather-wallets','Leather Wallets','private-label leather wallet manufacturer','Custom leather wallet programs.',30),
    ('premium-leather-apparel','accessories','leather-bags','Leather Bags','private-label leather bag manufacturer','Leather bag programs developed from buyer briefs.',40),
    ('sportswear','team-club','football-kits','Football & Soccer Kits','custom football kit manufacturer','Custom football and soccer kits for clubs and academies.',10),
    ('sportswear','team-club','cricket-kits','Cricket Uniforms','cricket uniform manufacturer','Cricket jerseys and complete uniform kits.',20),
    ('sportswear','team-club','baseball-kits','Baseball Uniforms','baseball uniform manufacturer','Baseball jerseys and complete uniform programs.',30),
    ('sportswear','team-club','basketball-kits','Basketball Uniforms','basketball uniform manufacturer','Basketball jerseys and complete uniform programs.',40),
    ('sportswear','team-club','rugby-kits','Rugby Kits','rugby kit manufacturer','Rugby jerseys and complete team programs.',50),
    ('sportswear','women','sports-bras','Performance Sports Bras','sports bra manufacturer','Women''s performance sports bra programs.',10),
    ('sportswear','women','gym-leggings','Gym Leggings','gym leggings manufacturer','Women''s gym and performance legging programs.',20),
    ('sportswear','unisex','training-tops','Training & Performance Tops','custom training top manufacturer','Compression, training, quarter-zip and gym top programs.',10),
    ('sportswear','unisex','tracksuits-outerwear','Tracksuits & Training Outerwear','custom tracksuit manufacturer','Tracksuits, performance hoodies and fleece jackets.',20),
    ('sportswear','unisex','training-bottoms','Training Bottoms','custom training bottoms manufacturer','Track pants and running short programs.',30),
    ('streetwear-activewear','unisex','hoodies-sweatshirts','Hoodies & Sweatshirts','private-label hoodie manufacturer','Oversized hoodie and sweatshirt programs.',10),
    ('streetwear-activewear','unisex','t-shirts-tops','T-Shirts & Tops','private-label T-shirt manufacturer','Graphic, oversized and long-sleeve top programs.',20),
    ('streetwear-activewear','unisex','jackets-bombers','Jackets & Bombers','streetwear jacket manufacturer','Bomber and lightweight streetwear jacket programs.',30),
    ('streetwear-activewear','unisex','joggers-sweatpants','Joggers & Sweatpants','jogger manufacturer','Custom sweatpant and jogger programs.',40),
    ('streetwear-activewear','unisex','shorts','Streetwear Shorts','streetwear shorts manufacturer','Custom streetwear short programs.',50),
    ('streetwear-activewear','unisex','cargo-pants','Cargo Pants','cargo pants manufacturer','Custom cargo pant programs.',60),
    ('leisure-nightwear','unisex','t-shirts-polos','T-Shirts & Polos','private-label T-shirt and polo manufacturer','Casual T-shirt and polo programs.',10),
    ('leisure-nightwear','unisex','shirts-henleys','Shirts & Henleys','casual shirt manufacturer','Button-up and Henley shirt programs.',20),
    ('leisure-nightwear','unisex','leisure-shorts','Leisure Shorts','private-label leisure shorts manufacturer','Lounge and chino short programs.',30),
    ('leisure-nightwear','men','mens-sleepwear','Men''s Pajamas & Sleepwear','men''s sleepwear manufacturer','Nightshirts, sleep pants, sleep T-shirts and coordinated sets.',10),
    ('leisure-nightwear','women','robes','Women''s Robes','private-label robe manufacturer','Plush bathrobe and sleep robe programs.',10),
    ('leisure-nightwear','women','nightgowns','Nightgowns & Slips','nightgown manufacturer','Silk nightgown and slip programs.',20)
)
insert into public.catalog_collections(audience_id, slug, name, keyword, description, sort_order, is_published)
select a.id, s.slug, s.name, s.keyword, s.description, s.sort_order, true
from collection_seed s
join public.categories top on top.slug = s.top_slug and top.parent_id is null
join public.catalog_audiences a on a.category_id = top.id and a.slug = s.audience_slug
on conflict (audience_id, slug) do update
set name = excluded.name,
    keyword = excluded.keyword,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_published = true;

-- Classify every currently published product into one primary collection.
with product_context as (
  select
    p.id as product_id,
    p.slug as product_slug,
    c.slug as child_slug,
    top.id as top_category_id,
    top.slug as top_slug
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.categories top on top.id = coalesce(c.parent_id, c.id)
  where p.is_published = true
), classified as (
  select
    product_id,
    top_category_id,
    case
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-men' then 'men'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-women' then 'women'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-kids' then 'kids'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-accessories' then 'accessories'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-accessories' then 'accessories'
      when top_slug = 'premium-leather-apparel' then 'unisex'
      when top_slug = 'sportswear' and child_slug <> 'sportswear-gym' then 'team-club'
      when top_slug = 'sportswear' and product_slug in ('performance-sports-bra','gym-leggings') then 'women'
      when top_slug = 'sportswear' then 'unisex'
      when top_slug = 'streetwear-activewear' then 'unisex'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisure-nightwear-men' then 'men'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisure-nightwear-women' then 'women'
      when top_slug = 'leisure-nightwear' then 'unisex'
    end as audience_slug,
    case
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-men' and product_slug like '%lederhosen%' then 'lederhosen'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-men' and product_slug like '%checkered-shirt%' then 'trachten-shirts'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-men' and product_slug like '%embroidered-vest%' then 'trachten-vests'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-women' and product_slug like '%apron%' then 'dirndl-aprons'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-women' and product_slug like '%blouse%' then 'dirndl-blouses'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-women' then 'dirndl-dresses'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-kids' and product_slug like '%lederhosen%' then 'boys-lederhosen'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-kids' then 'girls-dirndl'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-accessories' and product_slug like '%hat%' then 'hats-headwear'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-accessories' and (product_slug like '%belt%' or product_slug like '%suspender%') then 'suspenders-belts'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-accessories' and product_slug like '%neckerchief%' then 'scarves-neckerchiefs'
      when top_slug = 'bavarian-trachten-wear' and child_slug = 'bavarian-accessories' then 'socks-footwear'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-jackets' and product_slug like '%bomber%' then 'bomber-jackets'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-jackets' then 'biker-jackets'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-vests' then 'leather-vests'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-bottoms' then 'leather-trousers'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-accessories' and product_slug like '%belt%' then 'leather-belts'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-accessories' and product_slug like '%glove%' then 'leather-gloves'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-accessories' and product_slug like '%wallet%' then 'leather-wallets'
      when top_slug = 'premium-leather-apparel' and child_slug = 'leather-accessories' then 'leather-bags'
      when top_slug = 'sportswear' and child_slug = 'sportswear-soccer' then 'football-kits'
      when top_slug = 'sportswear' and child_slug = 'sportswear-cricket' then 'cricket-kits'
      when top_slug = 'sportswear' and child_slug = 'sportswear-baseball' then 'baseball-kits'
      when top_slug = 'sportswear' and child_slug = 'sportswear-basketball' then 'basketball-kits'
      when top_slug = 'sportswear' and child_slug = 'sportswear-rugby' then 'rugby-kits'
      when top_slug = 'sportswear' and product_slug = 'performance-sports-bra' then 'sports-bras'
      when top_slug = 'sportswear' and product_slug = 'gym-leggings' then 'gym-leggings'
      when top_slug = 'sportswear' and product_slug in ('performance-tracksuit-set','performance-gym-hoodie','zip-up-fleece-jacket') then 'tracksuits-outerwear'
      when top_slug = 'sportswear' and product_slug in ('track-pants','running-shorts') then 'training-bottoms'
      when top_slug = 'sportswear' then 'training-tops'
      when top_slug = 'streetwear-activewear' and product_slug like '%hoodie%' then 'hoodies-sweatshirts'
      when top_slug = 'streetwear-activewear' and product_slug like '%bomber%' then 'jackets-bombers'
      when top_slug = 'streetwear-activewear' and child_slug = 'streetwear-tops' then 't-shirts-tops'
      when top_slug = 'streetwear-activewear' and product_slug like '%cargo%' then 'cargo-pants'
      when top_slug = 'streetwear-activewear' and product_slug like '%shorts%' then 'shorts'
      when top_slug = 'streetwear-activewear' then 'joggers-sweatpants'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisurewear-tops' and (product_slug like '%button-up%' or product_slug like '%henley%') then 'shirts-henleys'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisurewear-tops' then 't-shirts-polos'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisurewear-bottoms' then 'leisure-shorts'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisure-nightwear-men' then 'mens-sleepwear'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisure-nightwear-women' and product_slug like '%robe%' then 'robes'
      when top_slug = 'leisure-nightwear' and child_slug = 'leisure-nightwear-women' then 'nightgowns'
    end as collection_slug
  from product_context
)
insert into public.catalog_product_collections(product_id, collection_id, is_primary, sort_order)
select c.product_id, cc.id, true, p.sort_order
from classified c
join public.catalog_audiences a
  on a.category_id = c.top_category_id and a.slug = c.audience_slug
join public.catalog_collections cc
  on cc.audience_id = a.id and cc.slug = c.collection_slug
join public.products p on p.id = c.product_id
where c.audience_slug is not null and c.collection_slug is not null
on conflict (product_id, collection_id) do update
set is_primary = true,
    sort_order = excluded.sort_order;

create or replace function public.catalog_get_public_taxonomy()
returns table (
  category_slug text,
  audience_slug text,
  audience_name text,
  audience_keyword text,
  audience_description text,
  audience_sort_order integer,
  collection_slug text,
  collection_name text,
  collection_keyword text,
  collection_description text,
  collection_sort_order integer,
  product_slugs text[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    top.slug as category_slug,
    a.slug as audience_slug,
    a.name as audience_name,
    coalesce(a.keyword, '') as audience_keyword,
    coalesce(a.description, '') as audience_description,
    a.sort_order as audience_sort_order,
    cc.slug as collection_slug,
    cc.name as collection_name,
    coalesce(cc.keyword, '') as collection_keyword,
    coalesce(cc.description, '') as collection_description,
    cc.sort_order as collection_sort_order,
    array_agg(p.slug order by pc.sort_order, p.sort_order, p.slug)::text[] as product_slugs
  from public.catalog_audiences a
  join public.categories top
    on top.id = a.category_id
   and top.parent_id is null
   and top.is_published = true
  join public.catalog_collections cc
    on cc.audience_id = a.id
   and cc.is_published = true
  join public.catalog_product_collections pc on pc.collection_id = cc.id
  join public.products p on p.id = pc.product_id and p.is_published = true
  where a.is_published = true
  group by
    top.sort_order, top.slug,
    a.sort_order, a.slug, a.name, a.keyword, a.description,
    cc.sort_order, cc.slug, cc.name, cc.keyword, cc.description
  having count(p.id) > 0
  order by top.sort_order, top.slug, a.sort_order, a.slug, cc.sort_order, cc.slug;
$function$;

revoke all on function public.catalog_get_public_taxonomy() from public;
grant execute on function public.catalog_get_public_taxonomy() to anon, authenticated;

comment on table public.catalog_audiences is 'Buyer/audience groups below a top-level public catalogue category.';
comment on table public.catalog_collections is 'SEO-oriented product-type collections below a catalogue audience.';
comment on table public.catalog_product_collections is 'Validated product-to-collection assignments; one primary collection per product.';
comment on function public.catalog_get_public_taxonomy() is 'Published non-empty category/audience/collection hierarchy for public routes.';
