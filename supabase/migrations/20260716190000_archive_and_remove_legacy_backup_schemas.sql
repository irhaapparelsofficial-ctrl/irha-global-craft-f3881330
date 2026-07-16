-- Consolidate dated rollback tables into one private, self-describing JSON
-- archive. Each source table is dropped only after its row count and payload are
-- verified. Empty schemas are intentionally retained; no schema-wide destructive
-- statement is used.

create schema if not exists private;

create table if not exists private.legacy_schema_archive_20260716 (
  archive_key text primary key,
  source_schema text not null,
  source_table text not null,
  row_count bigint not null,
  table_size_bytes bigint not null,
  columns_metadata jsonb not null,
  constraints_metadata jsonb not null,
  indexes_metadata jsonb not null,
  row_data jsonb not null,
  archived_at timestamptz not null default now(),
  unique (source_schema, source_table)
);

revoke all on table private.legacy_schema_archive_20260716 from public, anon, authenticated;
grant select, insert, update, delete on table private.legacy_schema_archive_20260716 to service_role;

create or replace function private.archive_and_drop_legacy_table_20260716(
  _source_schema text,
  _source_table text
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'private'
as $function$
declare
  source_relation regclass;
  archived_rows bigint;
  rows_json jsonb;
  columns_json jsonb;
  constraints_json jsonb;
  indexes_json jsonb;
begin
  source_relation := pg_catalog.to_regclass(pg_catalog.format('%I.%I', _source_schema, _source_table));
  if source_relation is null then
    return;
  end if;

  execute pg_catalog.format(
    'select count(*)::bigint, coalesce(jsonb_agg(to_jsonb(src)), ''[]''::jsonb) from %I.%I src',
    _source_schema,
    _source_table
  ) into archived_rows, rows_json;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', column_name,
        'ordinal_position', ordinal_position,
        'data_type', data_type,
        'udt_name', udt_name,
        'is_nullable', is_nullable,
        'column_default', column_default
      ) order by ordinal_position
    ),
    '[]'::jsonb
  )
  into columns_json
  from information_schema.columns
  where table_schema = _source_schema
    and table_name = _source_table;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', conname,
        'type', contype,
        'definition', pg_catalog.pg_get_constraintdef(oid, true)
      ) order by conname
    ),
    '[]'::jsonb
  )
  into constraints_json
  from pg_catalog.pg_constraint
  where conrelid = source_relation;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', indexname, 'definition', indexdef)
      order by indexname
    ),
    '[]'::jsonb
  )
  into indexes_json
  from pg_catalog.pg_indexes
  where schemaname = _source_schema
    and tablename = _source_table;

  if jsonb_array_length(rows_json) <> archived_rows then
    raise exception 'archive row mismatch for %.%', _source_schema, _source_table;
  end if;

  insert into private.legacy_schema_archive_20260716 (
    archive_key,
    source_schema,
    source_table,
    row_count,
    table_size_bytes,
    columns_metadata,
    constraints_metadata,
    indexes_metadata,
    row_data,
    archived_at
  ) values (
    _source_schema || '.' || _source_table,
    _source_schema,
    _source_table,
    archived_rows,
    pg_catalog.pg_total_relation_size(source_relation),
    columns_json,
    constraints_json,
    indexes_json,
    rows_json,
    now()
  )
  on conflict (archive_key) do update
  set row_count = excluded.row_count,
      table_size_bytes = excluded.table_size_bytes,
      columns_metadata = excluded.columns_metadata,
      constraints_metadata = excluded.constraints_metadata,
      indexes_metadata = excluded.indexes_metadata,
      row_data = excluded.row_data,
      archived_at = excluded.archived_at;

  if not exists (
    select 1
    from private.legacy_schema_archive_20260716
    where archive_key = _source_schema || '.' || _source_table
      and row_count = archived_rows
      and jsonb_array_length(row_data) = archived_rows
  ) then
    raise exception 'archive verification failed for %.%', _source_schema, _source_table;
  end if;

  execute pg_catalog.format('drop table %I.%I', _source_schema, _source_table);
end;
$function$;

revoke all on function private.archive_and_drop_legacy_table_20260716(text, text) from public, anon, authenticated;
grant execute on function private.archive_and_drop_legacy_table_20260716(text, text) to service_role;

do $archive$
declare
  source_schema text;
  source_table text;
begin
  foreach source_schema in array array[
    'legacy_pre_irha',
    'migration_backup_20260713',
    'migration_backup_20260714_media'
  ]
  loop
    for source_table in
      select table_name
      from information_schema.tables
      where table_schema = source_schema
        and table_type = 'BASE TABLE'
      order by table_name
    loop
      perform private.archive_and_drop_legacy_table_20260716(source_schema, source_table);
    end loop;
  end loop;

  foreach source_table in array array[
    'catalog_product_backup_20260716',
    'catalog_expansion_product_backup_20260716',
    'catalog_expansion_media_backup_20260716'
  ]
  loop
    perform private.archive_and_drop_legacy_table_20260716('private', source_table);
  end loop;
end
$archive$;

drop function private.archive_and_drop_legacy_table_20260716(text, text);

comment on table private.legacy_schema_archive_20260716 is
  'Private JSON archive of removed legacy and dated migration backup tables, including column, constraint and index metadata.';
