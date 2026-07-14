-- Large Batch 2: audited candidate review -> CRM activation.
-- No candidate or CRM rows are changed by this migration.

create table if not exists public.lead_activation_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running','completed','partial','failed','rolled_back','rollback_partial')),
  requested_by uuid null references auth.users(id) on delete set null,
  candidate_ids uuid[] not null default '{}'::uuid[],
  imported_lead_ids uuid[] not null default '{}'::uuid[],
  strict_ready_count integer not null default 0 check (strict_ready_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  summary jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  rolled_back_at timestamptz null
);

create table if not exists public.lead_activation_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.lead_activation_batches(id) on delete cascade,
  candidate_id uuid null references public.lead_candidates(id) on delete set null,
  lead_id uuid null references public.b2b_leads(id) on delete set null,
  event_type text not null
    check (event_type in ('validated','blocked','duplicate','imported','failed','rollback_skipped','rolled_back','visit_scheduled')),
  detail jsonb not null default '{}'::jsonb,
  actor uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lead_activation_batches_status_created_idx
  on public.lead_activation_batches(status, created_at desc);
create index if not exists lead_activation_batches_requested_idx
  on public.lead_activation_batches(requested_by, created_at desc);
create index if not exists lead_activation_events_batch_created_idx
  on public.lead_activation_events(batch_id, created_at);
create index if not exists lead_activation_events_candidate_idx
  on public.lead_activation_events(candidate_id) where candidate_id is not null;
create index if not exists lead_activation_events_lead_idx
  on public.lead_activation_events(lead_id) where lead_id is not null;

alter table public.lead_activation_batches enable row level security;
alter table public.lead_activation_events enable row level security;

revoke all on public.lead_activation_batches from anon;
revoke all on public.lead_activation_events from anon;
grant select, insert, update, delete on public.lead_activation_batches to authenticated;
grant select, insert, update, delete on public.lead_activation_events to authenticated;
grant all on public.lead_activation_batches to service_role;
grant all on public.lead_activation_events to service_role;

drop policy if exists "Admins manage lead activation batches" on public.lead_activation_batches;
create policy "Admins manage lead activation batches"
  on public.lead_activation_batches for all to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

drop policy if exists "Admins manage lead activation events" on public.lead_activation_events;
create policy "Admins manage lead activation events"
  on public.lead_activation_events for all to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

comment on table public.lead_activation_batches is
  'Owner-approved, chunked candidate-to-CRM activation checkpoints with rollback status.';
comment on table public.lead_activation_events is
  'Immutable-style event trail for validation, import, skips, failures and safe rollback decisions.';
