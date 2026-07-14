begin;

create table if not exists public.lead_import_files (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.lead_campaigns(id) on delete cascade,
  bucket text not null default 'crm-private-files' check (bucket = 'crm-private-files'),
  object_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  mime_type text not null check (
    mime_type in (
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  ),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  sheet_name text,
  parsed_row_count integer not null default 0 check (parsed_row_count >= 0),
  staged_row_count integer not null default 0 check (staged_row_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  status text not null default 'pending_upload' check (status in ('pending_upload','uploaded','staged','failed','archived')),
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_import_files_campaign_idx
  on public.lead_import_files (campaign_id, created_at desc);
create index if not exists lead_import_files_status_idx
  on public.lead_import_files (status, updated_at desc);
create unique index if not exists lead_import_files_identity_unique
  on public.lead_import_files (checksum_sha256, sheet_name, file_name)
  where checksum_sha256 is not null;

alter table public.lead_candidates
  add column if not exists import_fingerprint text;
create unique index if not exists lead_candidates_campaign_fingerprint_unique
  on public.lead_candidates (campaign_id, import_fingerprint);

alter table public.lead_import_files enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lead_import_files'
      and policyname = 'lead_import_files_admin_all'
  ) then
    create policy lead_import_files_admin_all
      on public.lead_import_files
      for all
      to authenticated
      using (public.has_role((select auth.uid()), 'admin'))
      with check (public.has_role((select auth.uid()), 'admin'));
  end if;
end $$;

revoke all on table public.lead_import_files from anon;
grant select, insert, update, delete on table public.lead_import_files to authenticated;

create or replace function public.lead_import_files_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  new.bucket := 'crm-private-files';
  new.object_path := btrim(new.object_path);
  new.file_name := btrim(new.file_name);
  new.mime_type := lower(btrim(new.mime_type));
  new.checksum_sha256 := nullif(lower(btrim(new.checksum_sha256)), '');
  new.sheet_name := nullif(btrim(new.sheet_name), '');
  new.error := nullif(left(btrim(new.error), 4000), '');
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists lead_import_files_before_write_trigger on public.lead_import_files;
create trigger lead_import_files_before_write_trigger
  before insert or update on public.lead_import_files
  for each row execute function public.lead_import_files_before_write();

revoke all on function public.lead_import_files_before_write() from public;

commit;
