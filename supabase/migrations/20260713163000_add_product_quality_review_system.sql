-- Admin-only product quality review workflow.
-- Backend verification prevents a product from being marked verified while required fields remain missing.

begin;

create table if not exists public.product_quality_reviews (
  product_id uuid primary key references public.products(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','needs_information','ready','verified')),
  reviewer_notes text,
  not_applicable_fields text[] not null default '{}'::text[],
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_quality_reviews enable row level security;

drop policy if exists product_quality_reviews_admin_all on public.product_quality_reviews;
create policy product_quality_reviews_admin_all
on public.product_quality_reviews
for all
to authenticated
using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

revoke all on table public.product_quality_reviews from anon;
grant select, insert, update, delete on table public.product_quality_reviews to authenticated;
grant all on table public.product_quality_reviews to service_role;

drop trigger if exists product_quality_reviews_touch_updated_at on public.product_quality_reviews;
create trigger product_quality_reviews_touch_updated_at
before update on public.product_quality_reviews
for each row execute function public.touch_updated_at();

create or replace function public.validate_product_quality_review()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  p public.products%rowtype;
  missing text[] := '{}'::text[];
  na text[] := coalesce(new.not_applicable_fields, '{}'::text[]);
begin
  if new.status <> 'verified' then
    new.verified_by := null;
    new.verified_at := null;
    return new;
  end if;

  select * into p from public.products where id = new.product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if coalesce(nullif(trim(p.short_description), ''), null) is null and not ('short_description' = any(na)) then missing := array_append(missing, 'short_description'); end if;
  if coalesce(nullif(trim(p.fabric_composition), ''), null) is null and not ('fabric_composition' = any(na)) then missing := array_append(missing, 'fabric_composition'); end if;
  if coalesce(nullif(trim(p.gsm), ''), null) is null and not ('gsm' = any(na)) then missing := array_append(missing, 'gsm'); end if;
  if coalesce(array_length(p.available_sizes, 1), 0) = 0 and not ('available_sizes' = any(na)) then missing := array_append(missing, 'available_sizes'); end if;
  if coalesce(array_length(p.available_colors, 1), 0) = 0 and not ('available_colors' = any(na)) then missing := array_append(missing, 'available_colors'); end if;
  if coalesce(nullif(trim(p.sample_timeline), ''), null) is null and not ('sample_timeline' = any(na)) then missing := array_append(missing, 'sample_timeline'); end if;
  if coalesce(array_length(p.gallery, 1), 0) < 4 and not ('gallery_4_views' = any(na)) then missing := array_append(missing, 'gallery_4_views'); end if;

  if cardinality(missing) > 0 then
    raise exception 'Product quality review cannot be verified. Missing fields: %', array_to_string(missing, ', ');
  end if;

  new.verified_by := auth.uid();
  new.verified_at := now();
  return new;
end;
$$;

revoke all on function public.validate_product_quality_review() from public, anon, authenticated;
grant execute on function public.validate_product_quality_review() to service_role;

drop trigger if exists validate_product_quality_review_before_write on public.product_quality_reviews;
create trigger validate_product_quality_review_before_write
before insert or update on public.product_quality_reviews
for each row execute function public.validate_product_quality_review();

create or replace view public.product_quality_audit
with (security_invoker = on)
as
select
  q.product_id,
  q.name,
  q.slug,
  q.category_id,
  q.is_published,
  q.image_url,
  q.review_status,
  q.reviewer_notes,
  q.not_applicable_fields,
  q.missing_fields,
  cardinality(q.missing_fields)::int as missing_count,
  round(((7 - cardinality(q.missing_fields))::numeric / 7::numeric) * 100)::int as completeness_percent,
  q.verified_at,
  q.updated_at
from (
  select
    p.id as product_id,
    p.name,
    p.slug,
    p.category_id,
    p.is_published,
    p.image_url,
    coalesce(r.status, 'pending') as review_status,
    r.reviewer_notes,
    coalesce(r.not_applicable_fields, '{}'::text[]) as not_applicable_fields,
    array(
      select field_name
      from unnest(array_remove(array[
        case when coalesce(nullif(trim(p.short_description), ''), null) is null then 'short_description' end,
        case when coalesce(nullif(trim(p.fabric_composition), ''), null) is null then 'fabric_composition' end,
        case when coalesce(nullif(trim(p.gsm), ''), null) is null then 'gsm' end,
        case when coalesce(array_length(p.available_sizes, 1), 0) = 0 then 'available_sizes' end,
        case when coalesce(array_length(p.available_colors, 1), 0) = 0 then 'available_colors' end,
        case when coalesce(nullif(trim(p.sample_timeline), ''), null) is null then 'sample_timeline' end,
        case when coalesce(array_length(p.gallery, 1), 0) < 4 then 'gallery_4_views' end
      ], null)) as field_name
      where not (field_name = any(coalesce(r.not_applicable_fields, '{}'::text[])))
    )::text[] as missing_fields,
    r.verified_at,
    coalesce(r.updated_at, p.updated_at) as updated_at
  from public.products p
  left join public.product_quality_reviews r on r.product_id = p.id
) q;

revoke all on table public.product_quality_audit from anon;
grant select on table public.product_quality_audit to authenticated;
grant select on table public.product_quality_audit to service_role;

commit;
