-- Link the verified four-view web renditions to the existing Bavarian
-- Checkered Shirt product. Preserve an immutable private before/after audit.

create schema if not exists private;

create table if not exists private.catalog_media_change_audit (
  id bigint generated always as identity primary key,
  change_key text not null unique,
  product_id uuid not null,
  before_record jsonb not null,
  after_record jsonb not null,
  changed_at timestamptz not null default now()
);

revoke all on table private.catalog_media_change_audit from public, anon, authenticated;
grant select, insert on table private.catalog_media_change_audit to service_role;

do $migration$
declare
  target_id uuid;
  before_json jsonb;
  after_json jsonb;
  front_url constant text := 'https://irhaapparels.com/product-media/classic-bavarian-checkered-shirt/web/classic-bavarian-checkered-shirt-design-01-front-web-1600.webp';
  three_quarter_url constant text := 'https://irhaapparels.com/product-media/classic-bavarian-checkered-shirt/web/classic-bavarian-checkered-shirt-design-01-three-quarter-web-1600.webp';
  side_url constant text := 'https://irhaapparels.com/product-media/classic-bavarian-checkered-shirt/web/classic-bavarian-checkered-shirt-design-01-side-web-1600.webp';
  back_url constant text := 'https://irhaapparels.com/product-media/classic-bavarian-checkered-shirt/web/classic-bavarian-checkered-shirt-design-01-back-web-1600.webp';
begin
  select id, to_jsonb(p)
  into target_id, before_json
  from public.products p
  where slug = 'bavarian-checkered-shirt'
  limit 1;

  if target_id is null then
    raise exception 'Bavarian Checkered Shirt product was not found';
  end if;

  after_json := before_json || jsonb_build_object(
    'image_url', front_url,
    'gallery', jsonb_build_array(front_url, three_quarter_url, side_url, back_url)
  );

  insert into private.catalog_media_change_audit(
    change_key,
    product_id,
    before_record,
    after_record
  ) values (
    'classic-bavarian-checkered-shirt-four-view-20260716',
    target_id,
    before_json,
    after_json
  )
  on conflict (change_key) do nothing;

  update public.products
  set image_url = front_url,
      gallery = array[front_url, three_quarter_url, side_url, back_url],
      updated_at = now()
  where id = target_id
    and (
      image_url is distinct from front_url
      or gallery is distinct from array[front_url, three_quarter_url, side_url, back_url]
    );
end
$migration$;
