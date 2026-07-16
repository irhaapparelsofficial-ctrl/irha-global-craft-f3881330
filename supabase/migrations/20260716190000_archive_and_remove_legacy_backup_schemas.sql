-- Consolidate dated rollback schemas into one private, self-describing JSON
-- archive before removing the source tables. No current public function, view or
-- cron job references these schemas at the time of this migration.

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

do $archive$
declare
  source_schema text;
  source_table text;
  archive_key_value text;
  source_regclass regclass;
  archived_rows bigint;
  source_size bigint;
  columns_json jsonb;
  constraints_json jsonb;
  indexes_json jsonb;
  rows_json jsonb;
  private_backup_tables constant text[] := array[
    'catalog_product_backup_20260716',
    'catalog_expansion_product_backup_20260716',
    'catalog_expansion_media_backup_20260716'
  ];
begin
  foreach source_schema in array array[
    'legacy_pre_irha',
    'migration_backup_20260713',
    'migration_backup_20260714_media'
  ]
  loop
    if exists (select 1 from pg_namespace where nspname = source_schema) then
      for source_table in
        select table_name
        from information_schema.tables
        where table_schema = source_schema
          and table_type = 'BASE TABLE'
        order by table_name
      loop
        source_regclass := to_regclass(format('%I.%I', source_schema, source_table));
        archive_key_value := source_schema || '.' || source_table;

        execute format(
          'select count(*)::bigint, coalesce(jsonb_agg(to_jsonb(src)), ''[]''::jsonb) from %I.%I src',
          source_schema,
          source_table
        ) into archived_rows, rows_json;

        source_size := pg_total_relation_size(source_regclass);

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
        where table_schema = source_schema
          and table_name = source_table;

        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'name', conname,
              'type', contype,
              'definition', pg_get_constraintdef(oid, true)
            ) order by conname
          ),
          '[]'::jsonb
        )
        into constraints_json
        from pg_constraint
        where conrelid = source_regclass;

        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'name', indexname,
              'definition', indexdef
            ) order by indexname
          ),
          '[]'::jsonb
        )
        into indexes_json
        from pg_indexes
        where schemaname = source_schema
          and tablename = source_table;

        if jsonb_array_length(rows_json) <> archived_rows then
          raise exception 'archive row mismatch for %', archive_key_value;
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
          archive_key_value,
          source_schema,
          source_table,
          archived_rows,
          source_size,
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
      end loop;
    end if;
  end loop;

  source_schema := 'private';
  foreach source_table in array private_backup_tables
  loop
    source_regclass := to_regclass(format('%I.%I', source_schema, source_table));
    if source_regclass is not null then
      archive_key_value := source_schema || '.' || source_table;

      execute format(
        'select count(*)::bigint, coalesce(jsonb_agg(to_jsonb(src)), ''[]''::jsonb) from %I.%I src',
        source_schema,
        source_table
      ) into archived_rows, rows_json;

      source_size := pg_total_relation_size(source_regclass);

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
      where table_schema = source_schema
        and table_name = source_table;

      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', conname,
            'type', contype,
            'definition', pg_get_constraintdef(oid, true)
          ) order by conname
        ),
        '[]'::jsonb
      )
      into constraints_json
      from pg_constraint
      where conrelid = source_regclass;

      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', indexname,
            'definition', indexdef
          ) order by indexname
        ),
        '[]'::jsonb
      )
      into indexes_json
      from pg_indexes
      where schemaname = source_schema
        and tablename = source_table;

      if jsonb_array_length(rows_json) <> archived_rows then
        raise exception 'archive row mismatch for %', archive_key_value;
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
        archive_key_value,
        source_schema,
        source_table,
        archived_rows,
        source_size,
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

      execute format('drop table %I.%I', source_schema, source_table);
    end if;
  end loop;
end
$archive$;

drop schema if exists legacy_pre_irha cascade;
drop schema if exists migration_backup_20260713 cascade;
drop schema if exists migration_backup_20260714_media cascade;

comment on table private.legacy_schema_archive_20260716 is
  'Private row-level JSON archive of removed legacy and dated migration backup tables, including column, constraint and index metadata.';
