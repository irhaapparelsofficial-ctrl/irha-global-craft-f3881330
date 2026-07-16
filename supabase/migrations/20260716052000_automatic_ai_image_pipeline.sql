begin;

alter table public.media_assets
  add column if not exists ai_processing_status text not null default 'queued',
  add column if not exists ai_processing_source text not null default 'existing_media',
  add column if not exists ai_processing_attempts integer not null default 0,
  add column if not exists ai_processing_error text,
  add column if not exists ai_processing_locked_at timestamptz,
  add column if not exists ai_processing_lock_token uuid,
  add column if not exists ai_processing_worker text,
  add column if not exists ai_master_bucket text,
  add column if not exists ai_master_object_path text,
  add column if not exists ai_master_url text,
  add column if not exists ai_background_style text not null default 'charcoal_studio_v1',
  add column if not exists ai_background_hex text not null default '#101722',
  add column if not exists ai_background_normalized boolean not null default false,
  add column if not exists ai_enhanced boolean not null default false,
  add column if not exists ai_upscaled boolean not null default false,
  add column if not exists ai_quality_score numeric(5,2),
  add column if not exists ai_review_reason text,
  add column if not exists ai_source_width_px integer,
  add column if not exists ai_source_height_px integer,
  add column if not exists ai_master_width_px integer,
  add column if not exists ai_master_height_px integer,
  add column if not exists ai_processed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'media_assets_ai_processing_status_check'
      and conrelid = 'public.media_assets'::regclass
  ) then
    alter table public.media_assets
      add constraint media_assets_ai_processing_status_check
      check (ai_processing_status in ('queued', 'processing', 'ready', 'review_required', 'failed'));
  end if;
end
$$;

create index if not exists media_assets_ai_processing_queue_idx
  on public.media_assets (ai_processing_status, ai_processing_attempts, created_at)
  where status = 'active'
    and mime_type in ('image/jpeg', 'image/png', 'image/webp');

create index if not exists media_assets_ai_review_idx
  on public.media_assets (ai_processing_status, updated_at desc)
  where ai_processing_status in ('review_required', 'failed');

update public.media_assets
set
  ai_processing_status = case
    when mime_type in ('image/jpeg', 'image/png', 'image/webp') and status = 'active' then 'queued'
    else ai_processing_status
  end,
  ai_processing_source = case
    when mime_type in ('image/jpeg', 'image/png', 'image/webp') and status = 'active' then 'existing_media_backfill'
    else ai_processing_source
  end,
  ai_processing_error = null,
  ai_review_reason = null
where mime_type in ('image/jpeg', 'image/png', 'image/webp')
  and status = 'active'
  and ai_processed_at is null;

create or replace function public.claim_ai_image_processing_jobs(
  _limit integer default 2,
  _worker text default 'github-actions'
)
returns table (
  id uuid,
  bucket text,
  object_path text,
  public_url text,
  file_name text,
  mime_type text,
  lock_token uuid,
  attempt integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select m.id
    from public.media_assets m
    where m.status = 'active'
      and m.mime_type in ('image/jpeg', 'image/png', 'image/webp')
      and m.ai_processing_attempts < 5
      and (
        m.ai_processing_status in ('queued', 'failed')
        or (
          m.ai_processing_status = 'processing'
          and m.ai_processing_locked_at < now() - interval '30 minutes'
        )
      )
    order by
      case when m.ai_processing_source = 'admin_upload' then 0 else 1 end,
      m.created_at asc
    limit least(greatest(coalesce(_limit, 2), 1), 5)
    for update skip locked
  ), claimed as (
    update public.media_assets m
    set
      ai_processing_status = 'processing',
      ai_processing_attempts = m.ai_processing_attempts + 1,
      ai_processing_error = null,
      ai_review_reason = null,
      ai_processing_locked_at = now(),
      ai_processing_lock_token = gen_random_uuid(),
      ai_processing_worker = left(coalesce(nullif(trim(_worker), ''), 'github-actions'), 160),
      updated_at = now()
    from candidates c
    where m.id = c.id
    returning m.*
  )
  select
    c.id,
    c.bucket,
    c.object_path,
    c.public_url,
    c.file_name,
    c.mime_type,
    c.ai_processing_lock_token,
    c.ai_processing_attempts
  from claimed c;
end;
$$;

create or replace function public.complete_ai_image_processing_job(
  _id uuid,
  _lock_token uuid,
  _published boolean,
  _master_bucket text,
  _master_object_path text,
  _master_url text,
  _responsive_widths integer[],
  _responsive_total_size_bytes bigint,
  _thumbnail_object_path text,
  _thumbnail_url text,
  _thumbnail_width_px integer,
  _thumbnail_height_px integer,
  _thumbnail_size_bytes bigint,
  _background_style text,
  _background_hex text,
  _enhanced boolean,
  _upscaled boolean,
  _quality_score numeric,
  _review_reason text,
  _source_width_px integer,
  _source_height_px integer,
  _master_width_px integer,
  _master_height_px integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _updated integer;
begin
  update public.media_assets
  set
    ai_processing_status = case when _published then 'ready' else 'review_required' end,
    ai_processing_error = null,
    ai_processing_locked_at = null,
    ai_processing_lock_token = null,
    ai_master_bucket = _master_bucket,
    ai_master_object_path = _master_object_path,
    ai_master_url = _master_url,
    ai_background_style = left(coalesce(nullif(trim(_background_style), ''), 'charcoal_studio_v1'), 80),
    ai_background_hex = left(coalesce(nullif(trim(_background_hex), ''), '#101722'), 16),
    ai_background_normalized = _published,
    ai_enhanced = coalesce(_enhanced, false),
    ai_upscaled = coalesce(_upscaled, false),
    ai_quality_score = greatest(0, least(100, _quality_score)),
    ai_review_reason = case when _published then null else left(coalesce(_review_reason, 'Manual review required'), 1200) end,
    ai_source_width_px = _source_width_px,
    ai_source_height_px = _source_height_px,
    ai_master_width_px = _master_width_px,
    ai_master_height_px = _master_height_px,
    ai_processed_at = now(),
    responsive_widths = case when _published then _responsive_widths else responsive_widths end,
    responsive_format = case when _published then 'image/webp' else responsive_format end,
    responsive_total_size_bytes = case when _published then _responsive_total_size_bytes else responsive_total_size_bytes end,
    responsive_generated_at = case when _published then now() else responsive_generated_at end,
    thumbnail_bucket = case when _published then _master_bucket else thumbnail_bucket end,
    thumbnail_object_path = case when _published then _thumbnail_object_path else thumbnail_object_path end,
    thumbnail_url = case when _published then _thumbnail_url else thumbnail_url end,
    thumbnail_width_px = case when _published then _thumbnail_width_px else thumbnail_width_px end,
    thumbnail_height_px = case when _published then _thumbnail_height_px else thumbnail_height_px end,
    thumbnail_size_bytes = case when _published then _thumbnail_size_bytes else thumbnail_size_bytes end,
    thumbnail_generated_at = case when _published then now() else thumbnail_generated_at end,
    updated_at = now()
  where id = _id
    and ai_processing_status = 'processing'
    and ai_processing_lock_token = _lock_token;

  get diagnostics _updated = row_count;
  return _updated = 1;
end;
$$;

create or replace function public.fail_ai_image_processing_job(
  _id uuid,
  _lock_token uuid,
  _message text,
  _review_required boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _updated integer;
begin
  update public.media_assets
  set
    ai_processing_status = case when _review_required then 'review_required' else 'failed' end,
    ai_processing_error = left(coalesce(_message, 'Image processing failed'), 2000),
    ai_review_reason = case when _review_required then left(coalesce(_message, 'Manual review required'), 1200) else ai_review_reason end,
    ai_processing_locked_at = null,
    ai_processing_lock_token = null,
    updated_at = now()
  where id = _id
    and ai_processing_status = 'processing'
    and ai_processing_lock_token = _lock_token;

  get diagnostics _updated = row_count;
  return _updated = 1;
end;
$$;

revoke all on function public.claim_ai_image_processing_jobs(integer, text) from public, anon, authenticated;
revoke all on function public.complete_ai_image_processing_job(uuid, uuid, boolean, text, text, text, integer[], bigint, text, text, integer, integer, bigint, text, text, boolean, boolean, numeric, text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.fail_ai_image_processing_job(uuid, uuid, text, boolean) from public, anon, authenticated;

grant execute on function public.claim_ai_image_processing_jobs(integer, text) to service_role;
grant execute on function public.complete_ai_image_processing_job(uuid, uuid, boolean, text, text, text, integer[], bigint, text, text, integer, integer, bigint, text, text, boolean, boolean, numeric, text, integer, integer, integer, integer) to service_role;
grant execute on function public.fail_ai_image_processing_job(uuid, uuid, text, boolean) to service_role;

commit;
