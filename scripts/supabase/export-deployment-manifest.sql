-- IA-SEC-E002R read-only canonical Supabase inventory generator.
-- Emits metadata and SHA-256 digests only. It excludes table rows, Auth users,
-- Storage objects, Vault values, environment variables, cron commands and secrets.
begin read only;

with
public_counts as (
  select
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p'))::int as tables,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m'))::int as views,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')::int as function_signatures,
    (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')::int as distinct_function_names,
    (select count(*) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typtype='e')::int as enums,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal)::int as triggers,
    (select count(*) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public')::int as indexes,
    (select count(*) from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='public')::int as constraints,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity)::int as rls_enabled_tables,
    (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public')::int as policies
),
digests as (
  select
    encode(digest(coalesce((
      select string_agg(concat_ws('|',table_name,ordinal_position,column_name,data_type,udt_name,is_nullable,coalesce(column_default,'')), E'\n' order by table_name,ordinal_position)
      from information_schema.columns where table_schema='public'
    ),''),'sha256'),'hex') as columns,
    encode(digest(coalesce((
      select string_agg(concat_ws('|',c.relname,con.conname,con.contype,pg_get_constraintdef(con.oid,true)), E'\n' order by c.relname,con.conname)
      from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=con.connamespace where n.nspname='public'
    ),''),'sha256'),'hex') as constraints,
    encode(digest(coalesce((
      select string_agg(concat_ws('|',p.proname,pg_get_function_identity_arguments(p.oid),pg_get_function_result(p.oid),l.lanname,p.prosecdef,p.provolatile,encode(digest(pg_get_functiondef(p.oid),'sha256'),'hex')), E'\n' order by p.proname,pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public'
    ),''),'sha256'),'hex') as functions,
    encode(digest(coalesce((
      select string_agg(pg_get_indexdef(i.indexrelid), E'\n' order by ic.relname)
      from pg_index i join pg_class c on c.oid=i.indrelid join pg_class ic on ic.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    ),''),'sha256'),'hex') as indexes,
    encode(digest(coalesce((
      select string_agg(concat_ws('|',version,name,encode(digest(convert_to(array_to_string(statements,E'\n-- IRHA-MIGRATION-STATEMENT-BOUNDARY --\n'),'UTF8'),'sha256'),'hex')), E'\n' order by version)
      from supabase_migrations.schema_migrations
    ),''),'sha256'),'hex') as migrations,
    encode(digest(coalesce((
      select string_agg(concat_ws('|',c.relname,p.polname,p.polcmd,array_to_string(p.polroles,','),coalesce(pg_get_expr(p.polqual,p.polrelid),''),coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')), E'\n' order by c.relname,p.polname)
      from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    ),''),'sha256'),'hex') as policies,
    encode(digest(coalesce((
      select string_agg(pg_get_triggerdef(t.oid,true), E'\n' order by c.relname,t.tgname)
      from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
    ),''),'sha256'),'hex') as triggers
),
migration_stats as (
  select count(*)::int as count,min(version) as min_version,max(version) as max_version
  from supabase_migrations.schema_migrations
),
cron_payload as (
  select
    count(*)::int as count,
    count(*) filter(where active)::int as active_count,
    encode(digest(coalesce(string_agg(concat_ws('|',jobid,jobname,schedule,active),E'\n' order by jobid),''),'sha256'),'hex') as canonical_sha256,
    coalesce(jsonb_agg(jsonb_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'active',active) order by jobid),'[]'::jsonb) as jobs
  from cron.job
),
storage_payload as (
  select
    count(*)::int as bucket_count,
    encode(digest(coalesce(string_agg(concat_ws('|',id,public,coalesce(file_size_limit::text,''),coalesce(array_to_string(allowed_mime_types,','),'')),E'\n' order by id),''),'sha256'),'hex') as canonical_sha256,
    coalesce(jsonb_agg(jsonb_build_object('name',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) order by id),'[]'::jsonb) as buckets
  from storage.buckets
)
select jsonb_build_object(
  'database',jsonb_build_object(
    'public',to_jsonb(public_counts),
    'canonical_digests_sha256',to_jsonb(digests),
    'live_migrations',to_jsonb(migration_stats)
  ),
  'cron',to_jsonb(cron_payload),
  'storage',to_jsonb(storage_payload),
  'browser_exposure',jsonb_build_object(
    'public_schema_usage',jsonb_build_object(
      'anon',has_schema_privilege('anon','public','USAGE'),
      'authenticated',has_schema_privilege('authenticated','public','USAGE')
    ),
    'private_schema_usage',jsonb_build_object(
      'anon',case when to_regnamespace('private') is null then false else has_schema_privilege('anon','private','USAGE') end,
      'authenticated',case when to_regnamespace('private') is null then false else has_schema_privilege('authenticated','private','USAGE') end
    ),
    'vault_schema_usage',jsonb_build_object(
      'anon',case when to_regnamespace('vault') is null then false else has_schema_privilege('anon','vault','USAGE') end,
      'authenticated',case when to_regnamespace('vault') is null then false else has_schema_privilege('authenticated','vault','USAGE') end
    ),
    'legacy_schema_usage',jsonb_build_object(
      'anon',case when to_regnamespace('legacy') is null then false else has_schema_privilege('anon','legacy','USAGE') end,
      'authenticated',case when to_regnamespace('legacy') is null then false else has_schema_privilege('authenticated','legacy','USAGE') end
    ),
    'migration_archive_schema_usage',jsonb_build_object(
      'anon',case when to_regnamespace('migration_archive') is null then false else has_schema_privilege('anon','migration_archive','USAGE') end,
      'authenticated',case when to_regnamespace('migration_archive') is null then false else has_schema_privilege('authenticated','migration_archive','USAGE') end
    )
  )
)
from public_counts,digests,migration_stats,cron_payload,storage_payload;

rollback;
