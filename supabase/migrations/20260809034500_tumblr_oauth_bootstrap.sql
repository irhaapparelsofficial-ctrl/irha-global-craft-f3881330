begin;

create table if not exists public.tumblr_oauth_bootstrap_tokens (
  token_hash text primary key,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tumblr_oauth_bootstrap_tokens enable row level security;
revoke all on public.tumblr_oauth_bootstrap_tokens from public, anon, authenticated;
grant all on public.tumblr_oauth_bootstrap_tokens to service_role;

commit;
