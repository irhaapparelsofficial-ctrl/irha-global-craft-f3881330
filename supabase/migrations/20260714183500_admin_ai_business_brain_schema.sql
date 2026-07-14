create table if not exists public.admin_ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  knowledge_key text not null unique,
  category text not null check (category in (
    'company','commercial','catalog','crm','leads','outreach','social','seo',
    'website','media','production','operations','tutorial','setup','safety'
  )),
  title text not null,
  content text not null,
  instructions jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  truth_status text not null default 'verified'
    check (truth_status in ('verified','operational','blocked','instruction','deprecated')),
  source_type text not null default 'owner_approved'
    check (source_type in ('owner_approved','database','runtime','repository','system')),
  source_reference text,
  admin_route text,
  owner_approval_required boolean not null default false,
  priority integer not null default 50 check (priority between 1 and 100),
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_ai_knowledge_category_priority_idx
  on public.admin_ai_knowledge(category, priority desc)
  where is_active;

create index if not exists admin_ai_knowledge_tags_gin_idx
  on public.admin_ai_knowledge using gin(tags);

alter table public.admin_ai_knowledge enable row level security;

drop policy if exists "Admin users can read AI knowledge" on public.admin_ai_knowledge;
create policy "Admin users can read AI knowledge"
  on public.admin_ai_knowledge
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

drop policy if exists "Admin users can manage AI knowledge" on public.admin_ai_knowledge;
create policy "Admin users can manage AI knowledge"
  on public.admin_ai_knowledge
  for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

grant select, insert, update, delete on public.admin_ai_knowledge to authenticated;

create or replace function public.touch_admin_ai_knowledge_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists admin_ai_knowledge_touch_updated_at on public.admin_ai_knowledge;
create trigger admin_ai_knowledge_touch_updated_at
before update on public.admin_ai_knowledge
for each row execute function public.touch_admin_ai_knowledge_updated_at();

comment on table public.admin_ai_knowledge is
  'Versioned source-of-truth facts, tutorials, guardrails and setup instructions for the Irha admin AI.';
