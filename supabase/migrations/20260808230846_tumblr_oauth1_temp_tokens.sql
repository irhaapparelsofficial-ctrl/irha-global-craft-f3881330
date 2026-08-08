begin;
create table if not exists public.tumblr_oauth1_temp_tokens (
  oauth_token text primary key,
  token_secret text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tumblr_oauth1_temp_tokens enable row level security;
revoke all on public.tumblr_oauth1_temp_tokens from public, anon, authenticated;
grant all on public.tumblr_oauth1_temp_tokens to service_role;
commit;
