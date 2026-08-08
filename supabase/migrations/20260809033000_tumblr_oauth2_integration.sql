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
  access_secret_id uuid not null,
  refresh_secret_id uuid,
  token_type text not null default 'bearer',
  scope text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.tumblr_oauth_states enable row level security;
alter table public.tumblr_oauth_credentials enable row level security;

revoke all on public.tumblr_oauth_states from public, anon, authenticated;
revoke all on public.tumblr_oauth_credentials from public, anon, authenticated;
grant all on public.tumblr_oauth_states to service_role;
grant all on public.tumblr_oauth_credentials to service_role;

create or replace function public.tumblr_store_tokens(
  p_access_token text,
  p_refresh_token text,
  p_token_type text,
  p_scope text,
  p_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access_id uuid;
  v_refresh_id uuid;
  v_current public.tumblr_oauth_credentials%rowtype;
begin
  if p_access_token is null or length(p_access_token) < 8 then
    raise exception 'invalid Tumblr access token';
  end if;

  select * into v_current from public.tumblr_oauth_credentials where id = 1;

  if v_current.id is null then
    v_access_id := vault.create_secret(p_access_token, null, 'Tumblr OAuth access token');
    if p_refresh_token is not null and p_refresh_token <> '' then
      v_refresh_id := vault.create_secret(p_refresh_token, null, 'Tumblr OAuth refresh token');
    end if;
    insert into public.tumblr_oauth_credentials(id, access_secret_id, refresh_secret_id, token_type, scope, expires_at)
    values (1, v_access_id, v_refresh_id, coalesce(nullif(p_token_type,''),'bearer'), p_scope, p_expires_at);
  else
    perform vault.update_secret(v_current.access_secret_id, p_access_token);
    v_access_id := v_current.access_secret_id;
    if p_refresh_token is not null and p_refresh_token <> '' then
      if v_current.refresh_secret_id is null then
        v_refresh_id := vault.create_secret(p_refresh_token, null, 'Tumblr OAuth refresh token');
      else
        perform vault.update_secret(v_current.refresh_secret_id, p_refresh_token);
        v_refresh_id := v_current.refresh_secret_id;
      end if;
    else
      v_refresh_id := v_current.refresh_secret_id;
    end if;
    update public.tumblr_oauth_credentials
      set refresh_secret_id = v_refresh_id,
          token_type = coalesce(nullif(p_token_type,''), token_type),
          scope = coalesce(p_scope, scope),
          expires_at = p_expires_at,
          updated_at = now()
      where id = 1;
  end if;
end;
$$;

create or replace function public.tumblr_get_tokens()
returns table(access_token text, refresh_token text, token_type text, scope text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select a.decrypted_secret,
         r.decrypted_secret,
         c.token_type,
         c.scope,
         c.expires_at
  from public.tumblr_oauth_credentials c
  join vault.decrypted_secrets a on a.id = c.access_secret_id
  left join vault.decrypted_secrets r on r.id = c.refresh_secret_id
  where c.id = 1;
$$;

revoke all on function public.tumblr_store_tokens(text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.tumblr_get_tokens() from public, anon, authenticated;
grant execute on function public.tumblr_store_tokens(text,text,text,text,timestamptz) to service_role;
grant execute on function public.tumblr_get_tokens() to service_role;

commit;
