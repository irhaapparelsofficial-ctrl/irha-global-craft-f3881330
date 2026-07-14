alter table public.operations_runs drop constraint if exists operations_runs_action_check;
alter table public.operations_runs add constraint operations_runs_action_check
check (action in (
  'health','heartbeat','daily','email_queue','cleanup','manual_test',
  'lead_discovery','lead_verification','social_drafts'
));

alter table public.operations_call_tokens drop constraint if exists operations_call_tokens_action_check;
alter table public.operations_call_tokens add constraint operations_call_tokens_action_check
check (action in (
  'health','heartbeat','daily','email_queue','cleanup','manual_test',
  'lead_discovery','lead_verification','social_drafts'
));

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
  if p_action not in (
    'health','heartbeat','daily','cleanup',
    'lead_discovery','lead_verification','social_drafts'
  ) then
    raise exception 'unsupported_operations_action';
  end if;

  if p_trigger_source not in ('cron','manual','system') then
    raise exception 'invalid_trigger_source';
  end if;

  v_slug := case
    when p_action = 'lead_discovery' then 'scheduled-lead-discovery'
    when p_action = 'lead_verification' then 'scheduled-lead-verification'
    when p_action = 'social_drafts' then 'scheduled-social-drafts'
    else 'operations-orchestrator'
  end;

  insert into public.operations_call_tokens(action, expires_at)
  values (p_action, now() + interval '5 minutes')
  returning id into v_token;

  v_payload := coalesce(p_body, '{}'::jsonb)
    || jsonb_build_object('trigger_source', p_trigger_source);

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
    timeout_milliseconds := case
      when p_action in ('lead_discovery','lead_verification') then 120000
      else 60000
    end
  ) into v_request_id;

  return v_request_id;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'irha-daily-lead-verification';

select cron.schedule(
  'irha-daily-lead-verification',
  '0 4 * * *',
  $$select public.invoke_irha_operations(
    'lead_verification',
    'cron',
    '{"limit":10}'::jsonb
  );$$
);
