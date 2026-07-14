alter table public.operations_control
  add column if not exists lead_discovery_enabled boolean not null default true,
  add column if not exists social_drafts_enabled boolean not null default true,
  add column if not exists email_provider_ready boolean not null default false;

alter table public.operations_runs drop constraint if exists operations_runs_action_check;
alter table public.operations_runs add constraint operations_runs_action_check
check (action in ('health','heartbeat','daily','email_queue','cleanup','manual_test','lead_discovery','social_drafts'));

alter table public.operations_call_tokens drop constraint if exists operations_call_tokens_action_check;
alter table public.operations_call_tokens add constraint operations_call_tokens_action_check
check (action in ('health','heartbeat','daily','email_queue','cleanup','manual_test','lead_discovery','social_drafts'));

update public.operations_control
set email_queue_enabled=false,
    email_provider_ready=false,
    last_error='Transactional email worker is deployed but its mail-provider credential is not configured; recurring sends remain disabled.',
    updated_at=now()
where id='default';
