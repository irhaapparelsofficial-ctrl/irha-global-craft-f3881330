begin;

create table if not exists public.lead_source_file_links (
  id uuid primary key default gen_random_uuid(),
  import_file_id uuid not null references public.lead_import_files(id) on delete cascade,
  lead_id uuid not null references public.b2b_leads(id) on delete cascade,
  candidate_id uuid references public.lead_candidates(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (import_file_id, lead_id)
);

create index if not exists lead_source_file_links_lead_idx
  on public.lead_source_file_links (lead_id, created_at desc);
create index if not exists lead_source_file_links_candidate_idx
  on public.lead_source_file_links (candidate_id)
  where candidate_id is not null;

alter table public.lead_source_file_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lead_source_file_links'
      and policyname = 'lead_source_file_links_admin_all'
  ) then
    create policy lead_source_file_links_admin_all
      on public.lead_source_file_links
      for all to authenticated
      using (public.has_role((select auth.uid()), 'admin'))
      with check (public.has_role((select auth.uid()), 'admin'));
  end if;
end $$;

revoke all on table public.lead_source_file_links from anon;
grant select, insert, delete on table public.lead_source_file_links to authenticated;

commit;
