create or replace function public.invoke_irha_operations(
  p_action text,
  p_trigger_source text default 'cron',
  p_body jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, net
as $$
declare
  v_token uuid;
  v_slug text;
  v_payload jsonb;
  v_request_id bigint;
begin
  if p_action not in ('health','heartbeat','daily','cleanup','lead_discovery','social_drafts') then
    raise exception 'unsupported_operations_action';
  end if;
  if p_trigger_source not in ('cron','manual','system') then
    raise exception 'invalid_trigger_source';
  end if;

  v_slug := case
    when p_action = 'lead_discovery' then 'scheduled-lead-discovery'
    when p_action = 'social_drafts' then 'scheduled-social-drafts'
    else 'operations-orchestrator'
  end;

  insert into public.operations_call_tokens(action, expires_at)
  values (p_action, now() + interval '5 minutes')
  returning id into v_token;

  v_payload := coalesce(p_body, '{}'::jsonb) || jsonb_build_object('trigger_source', p_trigger_source);
  if p_action in ('health','heartbeat','daily','cleanup') then
    v_payload := v_payload || jsonb_build_object('action', p_action);
  end if;

  select net.http_post(
    url := 'https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/' || v_slug,
    body := v_payload,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-irha-ops-token', v_token::text
    ),
    timeout_milliseconds := case when p_action = 'lead_discovery' then 120000 else 60000 end
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.invoke_irha_operations(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.invoke_irha_operations(text,text,jsonb) to service_role;

select cron.schedule('irha-operations-heartbeat','*/5 * * * *',$$select public.invoke_irha_operations('heartbeat','cron','{}'::jsonb);$$);
select cron.schedule('irha-operations-daily','40 3 * * *',$$select public.invoke_irha_operations('daily','cron','{}'::jsonb);$$);
select cron.schedule('irha-daily-lead-discovery','50 3 * * *',$$select public.invoke_irha_operations('lead_discovery','cron','{}'::jsonb);$$);
select cron.schedule('irha-daily-social-drafts','10 4 * * *',$$select public.invoke_irha_operations('social_drafts','cron','{}'::jsonb);$$);
select cron.schedule('irha-operations-cleanup','20 2 * * 0',$$select public.invoke_irha_operations('cleanup','cron','{}'::jsonb);$$);

comment on function public.invoke_irha_operations(text,text,jsonb) is
  'Private allowlisted pg_cron invoker using a single-use five-minute nonce; no long-lived scheduler credential is stored.';
