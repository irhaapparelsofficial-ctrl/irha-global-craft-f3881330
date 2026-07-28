-- IA-SEC-E002 read-only canonical Supabase inventory generator.
-- Emits metadata and SHA-256 digests only. It intentionally excludes table rows,
-- Auth users, Storage objects, Vault values, environment variables and secrets.
begin read only;

with public_counts as (
  select
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p'))::int as tables,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m'))::int as views,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')::int as function_signatures,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal)::int as triggers,
    (select count(*) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public')::int as indexes,
    (select count(*) from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='public')::int as constraints,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity)::int as rls_enabled_tables,
    (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public')::int as policies
)
select jsonb_build_object(
  'public', to_jsonb(public_counts),
  'migration_count', (select count(*) from supabase_migrations.schema_migrations),
  'cron_count', (select count(*) from cron.job),
  'storage_bucket_count', (select count(*) from storage.buckets),
  'browser_private_schema_usage', jsonb_build_object(
    'anon', has_schema_privilege('anon','private','USAGE'),
    'authenticated', has_schema_privilege('authenticated','private','USAGE')
  ),
  'migrations_sha256', encode(digest(coalesce((select string_agg(version||'|'||name,E'\n' order by version) from supabase_migrations.schema_migrations),''),'sha256'),'hex')
)
from public_counts;

rollback;
