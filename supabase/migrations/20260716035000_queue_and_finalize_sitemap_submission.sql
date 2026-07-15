alter table public.sitemap_submission_control
  add column if not exists last_request_id bigint;

create or replace function public.queue_sitemap_submission(
  _token text,
  _force boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  _provided_hash text;
  _request_id bigint;
  _claimed boolean;
begin
  if _token is null or length(_token) < 40 then
    return null;
  end if;

  if coalesce(_force, false) then
    _provided_hash := encode(extensions.digest(_token, 'sha256'), 'hex');
    update public.sitemap_submission_control
    set last_attempt_at = now(),
        updated_at = now(),
        last_error = null
    where id = 'default'
      and token_hash = _provided_hash;
    if not found then return null; end if;
  else
    _claimed := public.claim_sitemap_submission(_token);
    if not coalesce(_claimed, false) then return null; end if;
  end if;

  select net.http_post(
    url := 'https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/sitemap-ping',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-irha-sitemap-token', _token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000
  ) into _request_id;

  update public.sitemap_submission_control
  set last_request_id = _request_id,
      updated_at = now()
  where id = 'default';

  return _request_id;
end;
$$;

create or replace function public.finalize_sitemap_submission()
returns boolean
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  _request_id bigint;
  _status integer;
  _content text;
  _error text;
  _timed_out boolean;
  _ok boolean := false;
  _provider_error text;
begin
  select last_request_id into _request_id
  from public.sitemap_submission_control
  where id = 'default';

  if _request_id is null then return false; end if;

  select status_code, content::text, error_msg, timed_out
  into _status, _content, _error, _timed_out
  from net._http_response
  where id = _request_id;

  if not found then return false; end if;

  begin
    _ok := _status between 200 and 299
      and coalesce((_content::jsonb ->> 'ok')::boolean, false);
    _provider_error := nullif(_content::jsonb ->> 'error', '');
  exception when others then
    _ok := false;
    _provider_error := 'invalid_scheduler_response';
  end;

  update public.sitemap_submission_control
  set last_success_at = case when _ok then now() else last_success_at end,
      last_http_status = coalesce(_status, 0),
      last_error = case
        when _ok then null
        when coalesce(_timed_out, false) then 'scheduler_request_timed_out'
        else left(coalesce(_provider_error, _error, 'scheduler_submission_failed'), 1000)
      end,
      updated_at = now()
  where id = 'default';

  return _ok;
end;
$$;

revoke all on function public.queue_sitemap_submission(text, boolean) from public, anon, authenticated;
revoke all on function public.finalize_sitemap_submission() from public, anon, authenticated;
grant execute on function public.queue_sitemap_submission(text, boolean) to service_role;
grant execute on function public.finalize_sitemap_submission() to service_role;

comment on function public.queue_sitemap_submission(text, boolean) is
  'Validates the Vault token, applies the database rate limit, queues the connected sitemap-ping function and records its pg_net request id.';
comment on function public.finalize_sitemap_submission() is
  'Reads the queued pg_net response and records the sanitized Google sitemap submission outcome.';
