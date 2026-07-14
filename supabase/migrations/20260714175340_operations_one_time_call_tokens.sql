create table if not exists public.operations_call_tokens (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('health','heartbeat','daily','email_queue','cleanup','manual_test')),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists operations_call_tokens_expiry_idx
  on public.operations_call_tokens(expires_at)
  where consumed_at is null;

alter table public.operations_call_tokens enable row level security;
revoke all on public.operations_call_tokens from anon, authenticated;

comment on table public.operations_call_tokens is
  'Single-use short-lived nonces for pg_cron to invoke private operations functions without storing a long-lived secret.';

update public.operations_control
set enabled=true,
    token_hash='one-time-nonce-mode',
    last_error=null,
    updated_at=now()
where id='default';
