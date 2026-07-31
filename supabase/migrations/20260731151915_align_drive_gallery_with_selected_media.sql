begin;

-- The existing duplicate-source migration introduced published_in_gallery as the
-- authoritative public-selection flag. Gallery refresh must honor that flag so
-- retained checksum-identical evidence cannot be reintroduced by media triggers.
create or replace function public.refresh_drive_product_gallery(_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  _folder_id text;
  _reference_code text;
  _hero_url text;
  _gallery text[];
  _mapped_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(_product_id::text,0));

  select p.source_drive_folder_id,p.reference_code
    into _folder_id,_reference_code
  from public.products p
  where p.id=_product_id;

  if _folder_id is null then
    return jsonb_build_object('updated',false,'reason','product_has_no_drive_source');
  end if;

  select
    max(d.public_url) filter(where d.role='hero'),
    coalesce(array_agg(d.public_url order by
      case d.role
        when 'hero' then 0
        when 'three_quarter' then 1
        when 'side' then 2
        when 'rear_three_quarter' then 3
        when 'back' then 4
        when 'macro' then 5
        when 'branding_detail' then 6
        when 'packaging' then 7
        else 8
      end,
      d.role_index,
      d.drive_file_id
    ) filter(where d.public_url is not null),'{}'::text[]),
    count(*) filter(where d.public_url is not null)
  into _hero_url,_gallery,_mapped_count
  from public.catalog_drive_files d
  where d.product_drive_folder_id=_folder_id
    and d.published_in_gallery
    and d.import_status='mapped'
    and d.web_object_path ~ '^catalog/products/.+\.webp$'
    and d.public_url ~ '^https://pvzjiozismyxqrzmtfbi\.supabase\.co/storage/v1/object/public/site-media/catalog/products/.+\.webp$';

  update public.products
  set image_url=coalesce(_hero_url,image_url),
      gallery=_gallery,
      updated_at=now()
  where id=_product_id;

  return jsonb_build_object(
    'updated',true,
    'reference_code',_reference_code,
    'front_url',_hero_url,
    'gallery_count',coalesce(cardinality(_gallery),0),
    'mapped_count',_mapped_count
  );
end;
$$;

revoke all on function public.refresh_drive_product_gallery(uuid) from public,anon,authenticated;
grant execute on function public.refresh_drive_product_gallery(uuid) to service_role;

-- Hero identity is already established by the selected role plus canonical
-- Storage path, verified media row, MIME, dimensions and checksum. Requiring a
-- legacy '-front.webp' filename conflicts with deterministic versioned paths.
create or replace function public.enforce_drive_product_front_first()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  _front_url text;
  _front_count integer;
  _source_count integer;
  _canonical_count integer;
  _verified_count integer;
  _taxonomy_count integer;
begin
  if new.source_drive_folder_id is null then
    return new;
  end if;

  if new.is_published or new.publish_state='published' then
    if nullif(trim(new.reference_code),'') is null
       or nullif(trim(new.sku),'') is null
       or nullif(trim(new.name),'') is null
       or nullif(trim(new.slug),'') is null
       or nullif(trim(new.short_description),'') is null
       or nullif(trim(new.description),'') is null
       or nullif(trim(new.primary_material),'') is null
       or nullif(trim(new.fabric_composition),'') is null
       or nullif(trim(new.gsm),'') is null
       or cardinality(new.available_sizes)=0
       or cardinality(new.available_colors)=0
       or new.custom_colors is null
       or new.customization='{}'::jsonb
       or nullif(trim(new.moq_display),'') is null
       or new.sample_available is null
       or nullif(trim(new.sample_timeline),'') is null
       or nullif(trim(new.production_timeline),'') is null
       or nullif(trim(new.packaging_standard),'') is null
       or new.packaging_custom is null
       or nullif(trim(new.country_of_origin),'') is null
       or nullif(trim(new.seo_title),'') is null
       or nullif(trim(new.seo_description),'') is null
       or nullif(trim(new.canonical_path),'') is null
    then
      raise exception 'Drive product % cannot publish with incomplete structured B2B or SEO data',coalesce(new.reference_code,new.id::text);
    end if;

    select count(*) into _taxonomy_count
    from public.product_taxonomy_assignments a
    where a.product_id=new.id and a.review_state='approved';

    if _taxonomy_count<>1 then
      raise exception 'Drive product % requires exactly one approved taxonomy assignment',coalesce(new.reference_code,new.id::text);
    end if;

    select
      count(*),
      count(*) filter (
        where d.import_status='mapped'
          and d.web_object_path ~ '^catalog/products/.+\.webp$'
          and nullif(trim(d.public_url),'') is not null
      ),
      count(*) filter (
        where d.import_status='mapped'
          and d.web_object_path ~ '^catalog/products/.+\.webp$'
          and m.verification_status='verified'
          and m.mime_type='image/webp'
          and m.width_px>=100
          and m.height_px>=100
          and m.checksum_sha256 ~ '^[A-Fa-f0-9]{64}$'
      ),
      count(*) filter (
        where d.role='hero'
          and d.import_status='mapped'
          and d.web_object_path ~ '^catalog/products/.+\.webp$'
          and nullif(trim(d.public_url),'') is not null
          and m.verification_status='verified'
          and m.mime_type='image/webp'
          and m.width_px>=100
          and m.height_px>=100
          and m.checksum_sha256 ~ '^[A-Fa-f0-9]{64}$'
      ),
      max(d.public_url) filter (
        where d.role='hero'
          and d.import_status='mapped'
          and d.web_object_path ~ '^catalog/products/.+\.webp$'
          and nullif(trim(d.public_url),'') is not null
          and m.verification_status='verified'
          and m.mime_type='image/webp'
      )
    into _source_count,_canonical_count,_verified_count,_front_count,_front_url
    from public.catalog_drive_files d
    left join public.media_assets m on m.id=d.media_asset_id
    where d.product_drive_folder_id=new.source_drive_folder_id
      and d.published_in_gallery;

    if _source_count=0 then
      raise exception 'Drive product % cannot publish without source media',coalesce(new.reference_code,new.id::text);
    end if;

    if _canonical_count<>_source_count or _verified_count<>_source_count then
      raise exception 'Drive product % cannot publish until every selected source image is a verified canonical WebP (%/% complete)',coalesce(new.reference_code,new.id::text),_verified_count,_source_count;
    end if;

    if _front_count<>1 or _front_url is null then
      raise exception 'Drive product % cannot publish without exactly one verified canonical front WebP',coalesce(new.reference_code,new.id::text);
    end if;

    if new.image_url is distinct from _front_url then
      raise exception 'Drive product % card image must be the verified front WebP',coalesce(new.reference_code,new.id::text);
    end if;

    if coalesce(cardinality(new.gallery),0)<>_source_count or new.gallery[1] is distinct from _front_url then
      raise exception 'Drive product % gallery must contain every selected source view once and start with front',coalesce(new.reference_code,new.id::text);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_drive_product_front_first() from public,anon,authenticated;

do $$
declare
  _refresh_definition text;
  _guard_definition text;
begin
  select pg_get_functiondef('public.refresh_drive_product_gallery(uuid)'::regprocedure)
    into _refresh_definition;
  select pg_get_functiondef('public.enforce_drive_product_front_first()'::regprocedure)
    into _guard_definition;

  if position('and d.published_in_gallery' in lower(_refresh_definition))=0 then
    raise exception 'Drive gallery refresh did not retain selected-media filtering';
  end if;
  if position('-front' in _guard_definition)>0 then
    raise exception 'Legacy filename-only front invariant remains active';
  end if;
  if (
    select count(*)
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and t.tgenabled='O'
      and not t.tgisinternal
      and (
        (c.relname='media_assets' and t.tgname in ('media_assets_before_write_trigger','trg_sync_drive_product_gallery_from_media'))
        or (c.relname='products' and t.tgname='a_enforce_drive_product_front_first')
      )
  )<>3 then
    raise exception 'Required media and product guard triggers must remain enabled';
  end if;
end;
$$;

commit;
