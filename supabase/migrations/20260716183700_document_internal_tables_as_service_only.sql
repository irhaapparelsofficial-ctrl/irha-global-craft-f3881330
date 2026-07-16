-- These operational/migration tables are intentionally service-only. RLS with
-- no policy already denied browser clients; explicit deny policies preserve the
-- same behavior while making the security contract visible and auditable.

do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'internal_asset_migration_control',
    'internal_media_integrity_audits',
    'internal_storage_cleanup_control',
    'internal_storage_cleanup_runs',
    'operations_call_tokens',
    'operations_setting_events',
    'product_image_migration_assets',
    'product_image_migration_backups',
    'product_image_migration_control',
    'product_media_live_validation',
    'sitemap_submission_control'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'drop policy if exists "Service role only - deny browser clients" on public.%I',
        table_name
      );
      execute format(
        'create policy "Service role only - deny browser clients" on public.%I for all to anon, authenticated using (false) with check (false)',
        table_name
      );
    end if;
  end loop;
end
$block$;
