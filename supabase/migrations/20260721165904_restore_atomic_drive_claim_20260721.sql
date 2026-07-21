-- Restore an atomic, service-only claim function for the one-time Drive media import.
-- The function is intentionally idempotent and skips files already represented by
-- a media_assets.source_drive_file_id row.

create or replace function public.claim_catalog_drive_files(_limit integer default 30)
returns setof public.catalog_drive_files
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select d.drive_file_id
    from public.catalog_drive_files d
    join public.catalog_drive_folders f
      on f.drive_folder_id = d.product_drive_folder_id
    where f.folder_kind = 'product'
      and f.product_id is not null
      and not exists (
        select 1
        from public.media_assets m
        where m.source_drive_file_id = d.drive_file_id
      )
      and (
        d.import_status <> 'downloading'
        or d.updated_at < now() - interval '10 minutes'
      )
    order by
      f.reference_code,
      case d.role::text
        when 'hero' then 1
        when 'three_quarter' then 2
        when 'side' then 3
        when 'rear_three_quarter' then 4
        when 'back' then 5
        when 'macro' then 6
        else 9
      end,
      d.role_index,
      d.drive_file_id
    limit least(greatest(coalesce(_limit, 30), 1), 50)
    for update of d skip locked
  )
  update public.catalog_drive_files d
  set import_status = 'downloading',
      import_attempts = d.import_attempts + 1,
      last_error = null,
      updated_at = now()
  from candidates c
  where d.drive_file_id = c.drive_file_id
  returning d.*;
end;
$$;

revoke all on function public.claim_catalog_drive_files(integer) from public;
grant execute on function public.claim_catalog_drive_files(integer) to service_role;
