create or replace function public.claim_ai_image_processing_jobs(
  _limit integer default 2,
  _worker text default 'github-actions'::text
)
returns table(
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
      and (
        coalesce(_worker, '') not like '%catalog-worker-%'
        or exists (
          select 1
          from public.catalog_drive_files cdf
          where cdf.media_asset_id = m.id
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

comment on function public.claim_ai_image_processing_jobs(integer, text) is
  'Claims protected image jobs. Catalogue workers are restricted to media linked through catalog_drive_files; normal AI workers retain existing queue behavior.';
