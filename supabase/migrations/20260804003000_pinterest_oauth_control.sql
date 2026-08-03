create table if not exists public.pinterest_oauth_states (
  state_hash text primary key,
  requested_by uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pinterest_oauth_states enable row level security;
revoke all on table public.pinterest_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on table public.pinterest_oauth_states to service_role;

create table if not exists public.pinterest_oauth_credentials (
  id text primary key default 'default' check (id = 'default'),
  access_token_cipher text not null,
  access_token_iv text not null,
  refresh_token_cipher text,
  refresh_token_iv text,
  token_type text not null default 'bearer',
  scope text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  connected_by uuid,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pinterest_oauth_credentials enable row level security;
revoke all on table public.pinterest_oauth_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.pinterest_oauth_credentials to service_role;

comment on table public.pinterest_oauth_states is
  'Service-role-only, short-lived CSRF state hashes for the Irha Pinterest OAuth authorization-code flow.';
comment on table public.pinterest_oauth_credentials is
  'Service-role-only encrypted Pinterest OAuth token material. Ciphertext is decrypted only inside Pinterest Edge Functions using the Pinterest app secret.';
