-- IA-SEC-E003 database verification.
-- Run after the migration. All test policy/state/metrics are rolled back.

begin;

set local statement_timeout = '15s';
set local lock_timeout = '3s';

insert into private.edge_rate_limit_policies (
  policy_key,
  burst_limit,
  burst_window_seconds,
  sustained_limit,
  sustained_window_seconds,
  duplicate_limit,
  duplicate_window_seconds,
  global_limit,
  global_window_seconds,
  block_seconds,
  enabled
) values (
  'test.ia-sec-e003',
  2, 60,
  3, 300,
  1, 120,
  100, 60,
  300,
  true
)
on conflict (policy_key) do update set
  burst_limit = excluded.burst_limit,
  burst_window_seconds = excluded.burst_window_seconds,
  sustained_limit = excluded.sustained_limit,
  sustained_window_seconds = excluded.sustained_window_seconds,
  duplicate_limit = excluded.duplicate_limit,
  duplicate_window_seconds = excluded.duplicate_window_seconds,
  global_limit = excluded.global_limit,
  global_window_seconds = excluded.global_window_seconds,
  block_seconds = excluded.block_seconds,
  enabled = true;

-- The production RPC accepts only seeded application policies. Temporarily add the
-- transaction-scoped test policy to its allow-list through the policy relation.
-- The function validates against that relation and the rollback removes this row.

do $test$
declare
  v_consume_oid oid;
  v_cleanup_oid oid;
  v_consume_config text[];
  v_cleanup_config text[];
  v_private_acl aclitem[];
begin
  select p.oid, p.proconfig
    into v_consume_oid, v_consume_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'consume_edge_rate_limit'
    and pg_get_function_identity_arguments(p.oid) = 'p_policy_key text, p_subject_hash text, p_resource_hash text, p_duplicate_hash text, p_cost integer, p_now timestamp with time zone';

  if v_consume_oid is null then
    raise exception 'consume_edge_rate_limit signature missing';
  end if;
  if not coalesce(v_consume_config, '{}'::text[]) @> array['search_path=pg_catalog, public, private'] then
    raise exception 'consume_edge_rate_limit search_path is not fixed: %', v_consume_config;
  end if;
  if has_function_privilege('anon', v_consume_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_consume_oid, 'EXECUTE') then
    raise exception 'browser role can execute consume_edge_rate_limit';
  end if;
  if not has_function_privilege('service_role', v_consume_oid, 'EXECUTE') then
    raise exception 'service_role cannot execute consume_edge_rate_limit';
  end if;

  select p.oid, p.proconfig
    into v_cleanup_oid, v_cleanup_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'cleanup_edge_rate_limit_state'
    and pg_get_function_identity_arguments(p.oid) = 'p_max_rows integer';

  if v_cleanup_oid is null then
    raise exception 'cleanup_edge_rate_limit_state signature missing';
  end if;
  if not coalesce(v_cleanup_config, '{}'::text[]) @> array['search_path=pg_catalog, public, private'] then
    raise exception 'cleanup_edge_rate_limit_state search_path is not fixed: %', v_cleanup_config;
  end if;
  if has_function_privilege('anon', v_cleanup_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_cleanup_oid, 'EXECUTE') then
    raise exception 'browser role can execute cleanup_edge_rate_limit_state';
  end if;

  select nspacl into v_private_acl from pg_namespace where nspname = 'private';
  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'browser role has private schema usage: %', v_private_acl;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'private'
      and tablename in ('edge_rate_limit_policies', 'edge_rate_limit_state', 'edge_rate_limit_metrics_hourly')
      and (roles @> array['anon']::name[] or roles @> array['authenticated']::name[] or roles @> array['public']::name[])
  ) then
    raise exception 'browser-facing private limiter policy exists';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in ('edge_rate_limit_policies', 'edge_rate_limit_state', 'edge_rate_limit_metrics_hourly')
      and grantee in ('anon', 'authenticated', 'PUBLIC')
  ) then
    raise exception 'browser role has direct limiter table grant';
  end if;
end;
$test$;

-- Same subject: first two calls are allowed, third exceeds the burst window.
do $test$
declare
  v_now timestamptz := clock_timestamp();
  v_decision text;
  v_remaining integer;
begin
  select decision, remaining into v_decision, v_remaining
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('a', 64), repeat('1', 64), null, 1, v_now
  );
  if v_decision <> 'ALLOW' or v_remaining <> 1 then
    raise exception 'first same-subject call failed: %, remaining %', v_decision, v_remaining;
  end if;

  select decision, remaining into v_decision, v_remaining
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('a', 64), repeat('1', 64), null, 1, v_now + interval '1 millisecond'
  );
  if v_decision <> 'ALLOW' or v_remaining <> 0 then
    raise exception 'second same-subject call failed: %, remaining %', v_decision, v_remaining;
  end if;

  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('a', 64), repeat('1', 64), null, 1, v_now + interval '2 milliseconds'
  );
  if v_decision not in ('THROTTLE', 'TEMPORARY_BLOCK') then
    raise exception 'burst boundary over-admitted: %', v_decision;
  end if;
end;
$test$;

-- Different subject remains isolated.
do $test$
declare
  v_decision text;
begin
  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('b', 64), repeat('1', 64), null, 1, clock_timestamp()
  );
  if v_decision <> 'ALLOW' then
    raise exception 'different subject was not isolated: %', v_decision;
  end if;
end;
$test$;

-- Different production policy remains isolated from the test policy.
do $test$
declare
  v_decision text;
begin
  select decision into v_decision
  from public.consume_edge_rate_limit(
    'site-visitor.heartbeat', repeat('c', 64), repeat('2', 64), null, 1, clock_timestamp()
  );
  if v_decision <> 'ALLOW' then
    raise exception 'different policy was not isolated: %', v_decision;
  end if;
end;
$test$;

-- Duplicate fingerprint is suppressed after the configured allowance while the
-- base subject can still be admitted.
do $test$
declare
  v_now timestamptz := clock_timestamp();
  v_duplicate boolean;
  v_decision text;
begin
  select decision, duplicate_suppressed into v_decision, v_duplicate
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('d', 64), repeat('3', 64), repeat('e', 64), 1, v_now
  );
  if v_decision <> 'ALLOW' or v_duplicate then
    raise exception 'first duplicate fingerprint was unexpectedly suppressed';
  end if;

  select decision, duplicate_suppressed into v_decision, v_duplicate
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('d', 64), repeat('3', 64), repeat('e', 64), 1, v_now + interval '1 millisecond'
  );
  if v_decision <> 'ALLOW' or not v_duplicate then
    raise exception 'duplicate fingerprint was not suppressed';
  end if;
end;
$test$;

-- Expired windows reset rather than carrying stale request counts.
do $test$
declare
  v_now timestamptz := clock_timestamp();
  v_decision text;
begin
  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('f', 64), repeat('4', 64), null, 1, v_now
  );
  if v_decision <> 'ALLOW' then raise exception 'expiry setup call failed'; end if;

  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('f', 64), repeat('4', 64), null, 1, v_now + interval '301 seconds'
  );
  if v_decision <> 'ALLOW' then
    raise exception 'expired windows did not reset: %', v_decision;
  end if;
end;
$test$;

-- Cleanup is bounded and removes only expired state in each call.
insert into private.edge_rate_limit_state (
  policy_key, bucket_kind, subject_hash, resource_hash, window_seconds,
  window_started_at, request_count, violation_count, blocked_until,
  expires_at, created_at, updated_at
)
select
  'test.ia-sec-e003',
  'burst',
  lpad(to_hex(series), 64, '0'),
  repeat('5', 64),
  60,
  clock_timestamp() - interval '2 hours',
  1,
  0,
  null,
  clock_timestamp() - interval '1 hour',
  clock_timestamp() - interval '2 hours',
  clock_timestamp() - interval '2 hours'
from generate_series(1, 3) as series;

do $test$
declare
  v_state_deleted integer;
  v_metric_deleted integer;
  v_remaining integer;
begin
  select state_rows_deleted, metric_rows_deleted
    into v_state_deleted, v_metric_deleted
  from public.cleanup_edge_rate_limit_state(2);

  if v_state_deleted <> 2 then
    raise exception 'cleanup batch was not bounded to 2: %', v_state_deleted;
  end if;

  select count(*) into v_remaining
  from private.edge_rate_limit_state
  where policy_key = 'test.ia-sec-e003'
    and expires_at < clock_timestamp();

  if v_remaining < 1 then
    raise exception 'bounded cleanup unexpectedly removed the entire expired batch';
  end if;
end;
$test$;

-- Query-plan smoke checks: primary key lookup and expiry cleanup paths must have
-- usable indexes. Production verification records the actual EXPLAIN output.
do $test$
begin
  if to_regclass('private.edge_rate_limit_state_pkey') is null
     or to_regclass('private.edge_rate_limit_state_expiry_idx') is null
     or to_regclass('private.edge_rate_limit_state_policy_updated_idx') is null
     or to_regclass('private.edge_rate_limit_metrics_policy_hour_idx') is null then
    raise exception 'required limiter index is missing';
  end if;
end;
$test$;

rollback;
