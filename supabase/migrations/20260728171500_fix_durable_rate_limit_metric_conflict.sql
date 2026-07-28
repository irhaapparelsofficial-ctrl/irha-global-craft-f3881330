-- IA-CTRL-E001: disambiguate the durable limiter metrics upsert conflict target.
-- The original output column named decision conflicted with the metrics table column
-- inside PL/pgSQL. Rebuild the existing function definition using the named primary-key
-- constraint so the intended atomic upsert remains unchanged.

do $migration$
declare
  v_signature constant regprocedure :=
    'public.consume_edge_rate_limit(text,text,text,text,integer,timestamp with time zone)'::regprocedure;
  v_definition text := pg_get_functiondef(v_signature);
  v_needle constant text := 'on conflict (metric_hour, policy_key, decision) do update';
  v_replacement constant text := 'on conflict on constraint edge_rate_limit_metrics_hourly_pkey do update';
  v_corrected text;
begin
  if (length(lower(v_definition)) - length(replace(lower(v_definition), v_needle, ''))) / length(v_needle) <> 2 then
    raise exception 'unexpected_limiter_metric_conflict_shape';
  end if;

  v_corrected := replace(v_definition, v_needle, v_replacement);
  execute v_corrected;

  v_definition := lower(pg_get_functiondef(v_signature));
  if (length(v_definition) - length(replace(v_definition, v_replacement, ''))) / length(v_replacement) <> 2
     or position(v_needle in v_definition) > 0 then
    raise exception 'limiter_metric_conflict_fix_not_applied';
  end if;
end;
$migration$;

revoke all on function public.consume_edge_rate_limit(text,text,text,text,integer,timestamptz)
  from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text,text,text,text,integer,timestamptz)
  to service_role;

-- Transaction-scoped smoke verification. Deleting the temporary policy cascades any
-- state and metrics created by the call, so no test identity remains after migration.
do $verify$
declare
  v_policy_key constant text := 'test.ia-ctrl-e001.metric-conflict';
  v_decision text;
begin
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
    v_policy_key,
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
    enabled = true,
    updated_at = clock_timestamp();

  select limiter.decision
    into v_decision
  from public.consume_edge_rate_limit(
    v_policy_key,
    repeat('a', 64),
    repeat('b', 64),
    repeat('c', 64),
    1,
    clock_timestamp()
  ) limiter;

  if v_decision <> 'ALLOW' then
    raise exception 'limiter_metric_conflict_smoke_failed: %', v_decision;
  end if;

  delete from private.edge_rate_limit_policies where policy_key = v_policy_key;

  if exists (
    select 1 from private.edge_rate_limit_state where policy_key = v_policy_key
  ) or exists (
    select 1 from private.edge_rate_limit_metrics_hourly where policy_key = v_policy_key
  ) then
    raise exception 'limiter_metric_conflict_smoke_teardown_failed';
  end if;
end;
$verify$;
