create table if not exists public.sitemap_submission_control (
  id text primary key default 'default' check (id = 'default'),
  token_hash text not null,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_http_status integer,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.sitemap_submission_control enable row level security;
revoke all on table public.sitemap_submission_control from public, anon, authenticated;

insert into public.sitemap_submission_control (id, token_hash)
values ('default', 'unconfigured')
on conflict (id) do nothing;

create or replace function public.claim_sitemap_submission(_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _state public.sitemap_submission_control%rowtype;
  _provided_hash text;
begin
  if _token is null or length(_token) < 40 then
    return false;
  end if;

  _provided_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  select * into _state
  from public.sitemap_submission_control
  where id = 'default'
  for update;

  if not found or _state.token_hash <> _provided_hash then
    return false;
  end if;

  if _state.last_success_at is not null
     and _state.last_success_at > now() - interval '20 hours' then
    return false;
  end if;

  if _state.last_attempt_at is not null
     and _state.last_attempt_at > now() - interval '30 minutes' then
    return false;
  end if;

  update public.sitemap_submission_control
  set last_attempt_at = now(),
      updated_at = now(),
      last_error = null
  where id = 'default';

  return true;
end;
$$;

create or replace function public.record_sitemap_submission_result(
  _token text,
  _ok boolean,
  _http_status integer,
  _error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _provided_hash text;
begin
  if _token is null or length(_token) < 40 then
    return false;
  end if;

  _provided_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  update public.sitemap_submission_control
  set last_success_at = case when coalesce(_ok, false) then now() else last_success_at end,
      last_http_status = coalesce(_http_status, 0),
      last_error = case when coalesce(_ok, false) then null else left(coalesce(_error, 'submission_failed'), 1000) end,
      updated_at = now()
  where id = 'default'
    and token_hash = _provided_hash;

  return found;
end;
$$;

revoke all on function public.claim_sitemap_submission(text) from public;
revoke all on function public.record_sitemap_submission_result(text, boolean, integer, text) from public;
grant execute on function public.claim_sitemap_submission(text) to anon, authenticated, service_role;
grant execute on function public.record_sitemap_submission_result(text, boolean, integer, text) to anon, authenticated, service_role;

comment on table public.sitemap_submission_control is
  'Private rate-limit and audit state for the scheduled Google Search Console sitemap submission.';
comment on function public.claim_sitemap_submission(text) is
  'Validates the hashed Vault token and grants at most one sitemap attempt per 30 minutes and one successful submission per 20 hours.';
