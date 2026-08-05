create table if not exists public.pinterest_operator_jobs (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  action text not null check (action in ('inventory','dry_run_missing','update_one','update_missing')),
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

alter table public.pinterest_operator_jobs enable row level security;
revoke all on table public.pinterest_operator_jobs from anon, authenticated;
grant all on table public.pinterest_operator_jobs to service_role;

create index if not exists idx_pinterest_operator_jobs_pending
  on public.pinterest_operator_jobs (status, expires_at)
  where status = 'pending';

comment on table public.pinterest_operator_jobs is 'Service-only, one-time Pinterest operator jobs. Raw operator tokens are never stored; only SHA-256 hashes and sanitized results are retained.';
