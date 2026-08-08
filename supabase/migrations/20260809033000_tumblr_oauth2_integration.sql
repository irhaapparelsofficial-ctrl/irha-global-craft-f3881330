begin;

alter table public.social_platform_accounts
  drop constraint if exists social_platform_accounts_platform_check;

alter table public.social_platform_accounts
  add constraint social_platform_accounts_platform_check
  check (platform = any (array['facebook'::text,'instagram'::text,'linkedin'::text,'tiktok'::text,'tumblr'::text]));

create table if not exists public.tumblr_oauth_states (
  state text primary key,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tumblr_oauth_credentials (
  id integer primary key check (id = 1),
  access_token text not null,
  refresh_token text,
  token_type text not null default 'bearer',
  scope text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.tumblr_oauth_states enable row level security;
alter table public.tumblr_oauth_credentials enable row level security;

revoke all on public.tumblr_oauth_states from anon, authenticated;
revoke all on public.tumblr_oauth_credentials from anon, authenticated;
grant all on public.tumblr_oauth_states to service_role;
grant all on public.tumblr_oauth_credentials to service_role;

insert into public.social_platform_accounts (
  platform, display_name, enabled, verification_status, capabilities, last_health, connection_note
) values (
  'tumblr', 'Tumblr', false, 'missing',
  '{"text":true,"image":true,"video":true,"link":true}'::jsonb,
  '{}'::jsonb,
  'OAuth2 integration is available after Tumblr authorization.'
)
on conflict (platform) do nothing;

commit;
