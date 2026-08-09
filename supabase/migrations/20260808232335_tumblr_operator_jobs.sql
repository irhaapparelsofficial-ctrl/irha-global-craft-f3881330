begin;
create table if not exists public.tumblr_operator_jobs (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  action text not null check (action in ('inventory','publish')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed','expired')),
  expires_at timestamptz not null,
  used_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  result jsonb,
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists tumblr_operator_jobs_status_expires_idx on public.tumblr_operator_jobs(status, expires_at);
alter table public.tumblr_operator_jobs enable row level security;
revoke all on public.tumblr_operator_jobs from public, anon, authenticated;
grant all on public.tumblr_operator_jobs to service_role;
commit;
