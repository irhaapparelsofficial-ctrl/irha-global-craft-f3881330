create table if not exists public.admin_ai_snapshot_cache (
  id text primary key default 'default',
  snapshot jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_ai_snapshot_cache enable row level security;

drop policy if exists "Admin users can read AI snapshot cache" on public.admin_ai_snapshot_cache;
create policy "Admin users can read AI snapshot cache"
  on public.admin_ai_snapshot_cache
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

revoke all on public.admin_ai_snapshot_cache from public, anon, authenticated;
grant select on public.admin_ai_snapshot_cache to authenticated;

create or replace function public.refresh_admin_ai_snapshot_cache()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  v_snapshot := public.admin_ai_live_snapshot();

  insert into public.admin_ai_snapshot_cache(id, snapshot, checked_at, updated_at)
  values (
    'default',
    v_snapshot,
    coalesce((v_snapshot->>'checked_at')::timestamptz, now()),
    now()
  )
  on conflict (id) do update set
    snapshot = excluded.snapshot,
    checked_at = excluded.checked_at,
    updated_at = now();

  return v_snapshot;
end;
$$;

revoke all on function public.refresh_admin_ai_snapshot_cache()
  from public, anon, authenticated;
grant execute on function public.refresh_admin_ai_snapshot_cache() to service_role;

create or replace function public.admin_ai_snapshot_cache_after_health()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_admin_ai_snapshot_cache();
  return new;
end;
$$;

revoke all on function public.admin_ai_snapshot_cache_after_health()
  from public, anon, authenticated;

drop trigger if exists admin_ai_refresh_snapshot_after_health
  on public.operations_health_snapshots;
create trigger admin_ai_refresh_snapshot_after_health
after insert on public.operations_health_snapshots
for each statement execute function public.admin_ai_snapshot_cache_after_health();

drop function if exists public.admin_ai_get_live_snapshot();
create function public.admin_ai_get_live_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select snapshot
  from public.admin_ai_snapshot_cache
  where id = 'default';
$$;

revoke all on function public.admin_ai_get_live_snapshot() from public, anon;
grant execute on function public.admin_ai_get_live_snapshot() to authenticated;

select public.refresh_admin_ai_snapshot_cache();

comment on table public.admin_ai_snapshot_cache is
  'Admin-RLS PII-free operational snapshot cache refreshed after each operations health snapshot.';
comment on function public.admin_ai_get_live_snapshot() is
  'Security-invoker admin UI reader for the RLS-protected Business Brain snapshot cache.';
