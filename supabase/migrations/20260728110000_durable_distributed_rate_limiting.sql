-- IA-SEC-E003: durable distributed rate limiting for public Edge Functions.
-- Fixed-window burst + sustained guards are enforced atomically in PostgreSQL.

create table if not exists private.edge_rate_limit_policies (
  policy_key text primary key,
  burst_limit integer not null check (burst_limit between 1 and 100000),
  burst_window_seconds integer not null check (burst_window_seconds between 1 and 86400),
  sustained_limit integer not null check (sustained_limit between 1 and 1000000),
  sustained_window_seconds integer not null check (sustained_window_seconds between 1 and 604800),
  duplicate_limit integer check (duplicate_limit between 1 and 1000),
  duplicate_window_seconds integer check (duplicate_window_seconds between 1 and 604800),
  global_limit integer not null check (global_limit between 1 and 10000000),
  global_window_seconds integer not null check (global_window_seconds between 1 and 86400),
  block_seconds integer not null check (block_seconds between 1 and 86400),
  enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint edge_rate_limit_duplicate_pair check (
    (duplicate_limit is null and duplicate_window_seconds is null)
    or (duplicate_limit is not null and duplicate_window_seconds is not null)
  ),
  constraint edge_rate_limit_sustained_not_smaller check (sustained_limit >= burst_limit)
);

create table if not exists private.edge_rate_limit_state (
  policy_key text not null references private.edge_rate_limit_policies(policy_key) on delete cascade,
  bucket_kind text not null check (bucket_kind in ('burst','sustained','duplicate','global','block')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  resource_hash text not null default repeat('0', 64) check (resource_hash ~ '^[0-9a-f]{64}$'),
  window_seconds integer not null check (window_seconds between 0 and 604800),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  violation_count integer not null default 0 check (violation_count >= 0),
  blocked_until timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (policy_key, bucket_kind, subject_hash, resource_hash, window_seconds)
);

create table if not exists private.edge_rate_limit_metrics_hourly (
  metric_hour timestamptz not null,
  policy_key text not null references private.edge_rate_limit_policies(policy_key) on delete cascade,
  decision text not null check (decision in ('ALLOW','THROTTLE','TEMPORARY_BLOCK','ERROR')),
  request_count bigint not null default 0 check (request_count >= 0),
  duplicate_suppressed_count bigint not null default 0 check (duplicate_suppressed_count >= 0),
  max_retry_after_seconds integer not null default 0 check (max_retry_after_seconds between 0 and 3600),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (metric_hour, policy_key, decision)
);

alter table private.edge_rate_limit_policies enable row level security;
alter table private.edge_rate_limit_state enable row level security;
alter table private.edge_rate_limit_metrics_hourly enable row level security;

revoke all on table private.edge_rate_limit_policies from public, anon, authenticated;
revoke all on table private.edge_rate_limit_state from public, anon, authenticated;
revoke all on table private.edge_rate_limit_metrics_hourly from public, anon, authenticated;
grant select on table private.edge_rate_limit_policies to service_role;

create index if not exists edge_rate_limit_state_expiry_idx
  on private.edge_rate_limit_state (expires_at);
create index if not exists edge_rate_limit_state_policy_updated_idx
  on private.edge_rate_limit_state (policy_key, updated_at desc);
create index if not exists edge_rate_limit_metrics_policy_hour_idx
  on private.edge_rate_limit_metrics_hourly (policy_key, metric_hour desc);

insert into private.edge_rate_limit_policies (
  policy_key, burst_limit, burst_window_seconds,
  sustained_limit, sustained_window_seconds,
  duplicate_limit, duplicate_window_seconds,
  global_limit, global_window_seconds, block_seconds
) values
  ('generate-mockup.generate', 6, 60, 24, 900, 2, 300, 120, 600, 600),
  ('site-visitor.arrive', 4, 300, 12, 86400, 1, 86400, 6000, 600, 900),
  ('site-visitor.heartbeat', 12, 300, 240, 7200, 1, 30, 15000, 600, 600),
  ('site-visitor.chat_open', 6, 600, 24, 86400, 1, 120, 3000, 600, 900),
  ('live-chat.presence', 6, 600, 20, 86400, 1, 300, 3000, 600, 900),
  ('live-chat.connect', 4, 600, 12, 86400, 2, 300, 1500, 600, 900),
  ('live-chat.send', 8, 60, 60, 900, 1, 86400, 5000, 600, 900),
  ('live-chat.poll', 40, 60, 450, 900, null, null, 30000, 600, 300)
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

create or replace function private.consume_edge_rate_limit_bucket(
  p_policy_key text,
  p_bucket_kind text,
  p_subject_hash text,
  p_resource_hash text,
  p_window_seconds integer,
  p_cost integer,
  p_now timestamptz
)
returns table(request_count integer, window_started_at timestamptz, expires_at timestamptz)
language sql
security definer
set search_path = pg_catalog, private
as $function$
  insert into private.edge_rate_limit_state as state (
    policy_key, bucket_kind, subject_hash, resource_hash, window_seconds,
    window_started_at, request_count, violation_count, blocked_until,
    expires_at, created_at, updated_at
  ) values (
    p_policy_key, p_bucket_kind, p_subject_hash, p_resource_hash, p_window_seconds,
    p_now, p_cost, 0, null,
    p_now + make_interval(secs => p_window_seconds + 3600), p_now, p_now
  )
  on conflict (policy_key, bucket_kind, subject_hash, resource_hash, window_seconds)
  do update set
    request_count = case
      when state.window_started_at + make_interval(secs => state.window_seconds) <= p_now then excluded.request_count
      else state.request_count + excluded.request_count
    end,
    window_started_at = case
      when state.window_started_at + make_interval(secs => state.window_seconds) <= p_now then p_now
      else state.window_started_at
    end,
    expires_at = greatest(
      state.expires_at,
      p_now + make_interval(secs => p_window_seconds + 3600)
    ),
    updated_at = p_now
  returning state.request_count, state.window_started_at, state.expires_at;
$function$;

revoke all on function private.consume_edge_rate_limit_bucket(text,text,text,text,integer,integer,timestamptz) from public, anon, authenticated, service_role;

create or replace function public.consume_edge_rate_limit(
  p_policy_key text,
  p_subject_hash text,
  p_resource_hash text default null,
  p_duplicate_hash text default null,
  p_cost integer default 1,
  p_now timestamptz default clock_timestamp()
)
returns table(
  decision text,
  retry_after_seconds integer,
  remaining integer,
  duplicate_suppressed boolean,
  blocked_until timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_policy private.edge_rate_limit_policies%rowtype;
  v_resource_hash text := coalesce(p_resource_hash, repeat('0', 64));
  v_global_hash constant text := repeat('0', 64);
  v_burst_count integer;
  v_burst_start timestamptz;
  v_sustained_count integer;
  v_sustained_start timestamptz;
  v_global_count integer;
  v_global_start timestamptz;
  v_duplicate_count integer := 0;
  v_duplicate_start timestamptz;
  v_retry numeric := 0;
  v_violation_count integer := 0;
  v_existing_block timestamptz;
  v_decision text := 'ALLOW';
  v_duplicate_suppressed boolean := false;
  v_remaining integer;
begin
  if p_policy_key is null or length(p_policy_key) > 100 then
    raise exception 'invalid_rate_limit_policy';
  end if;
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_subject';
  end if;
  if v_resource_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_resource';
  end if;
  if p_duplicate_hash is not null and p_duplicate_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_duplicate';
  end if;
  if p_cost is null or p_cost < 1 or p_cost > 10 then
    raise exception 'invalid_rate_limit_cost';
  end if;
  if p_now is null or p_now > clock_timestamp() + interval '5 minutes' or p_now < clock_timestamp() - interval '30 days' then
    raise exception 'invalid_rate_limit_time';
  end if;

  select * into v_policy
  from private.edge_rate_limit_policies
  where policy_key = p_policy_key and enabled
  for share;

  if not found then
    raise exception 'unknown_rate_limit_policy';
  end if;

  select state.blocked_until into v_existing_block
  from private.edge_rate_limit_state state
  where state.policy_key = p_policy_key
    and state.bucket_kind = 'block'
    and state.subject_hash = p_subject_hash
    and state.resource_hash = v_global_hash
    and state.window_seconds = 0
  for update;

  if v_existing_block is not null and v_existing_block > p_now then
    v_retry := extract(epoch from (v_existing_block - p_now));
    v_decision := 'TEMPORARY_BLOCK';
    insert into private.edge_rate_limit_metrics_hourly as metrics (
      metric_hour, policy_key, decision, request_count,
      duplicate_suppressed_count, max_retry_after_seconds, updated_at
    ) values (
      date_trunc('hour', p_now), p_policy_key, v_decision, 1, 0,
      least(3600, greatest(1, ceil(v_retry)::integer)), p_now
    )
    on conflict (metric_hour, policy_key, decision) do update set
      request_count = metrics.request_count + 1,
      max_retry_after_seconds = greatest(metrics.max_retry_after_seconds, excluded.max_retry_after_seconds),
      updated_at = p_now;

    return query select v_decision, least(3600, greatest(1, ceil(v_retry)::integer)), 0, false, v_existing_block;
    return;
  end if;

  select bucket.request_count, bucket.window_started_at
    into v_burst_count, v_burst_start
  from private.consume_edge_rate_limit_bucket(
    p_policy_key, 'burst', p_subject_hash, v_global_hash,
    v_policy.burst_window_seconds, p_cost, p_now
  ) bucket;

  select bucket.request_count, bucket.window_started_at
    into v_sustained_count, v_sustained_start
  from private.consume_edge_rate_limit_bucket(
    p_policy_key, 'sustained', p_subject_hash, v_global_hash,
    v_policy.sustained_window_seconds, p_cost, p_now
  ) bucket;

  select bucket.request_count, bucket.window_started_at
    into v_global_count, v_global_start
  from private.consume_edge_rate_limit_bucket(
    p_policy_key, 'global', v_global_hash, v_global_hash,
    v_policy.global_window_seconds, p_cost, p_now
  ) bucket;

  if p_duplicate_hash is not null and v_policy.duplicate_limit is not null then
    select bucket.request_count, bucket.window_started_at
      into v_duplicate_count, v_duplicate_start
    from private.consume_edge_rate_limit_bucket(
      p_policy_key, 'duplicate', p_duplicate_hash, v_resource_hash,
      v_policy.duplicate_window_seconds, p_cost, p_now
    ) bucket;
    v_duplicate_suppressed := v_duplicate_count > v_policy.duplicate_limit;
  end if;

  if v_burst_count > v_policy.burst_limit then
    v_retry := greatest(v_retry, extract(epoch from (v_burst_start + make_interval(secs => v_policy.burst_window_seconds) - p_now)));
  end if;
  if v_sustained_count > v_policy.sustained_limit then
    v_retry := greatest(v_retry, extract(epoch from (v_sustained_start + make_interval(secs => v_policy.sustained_window_seconds) - p_now)));
  end if;
  if v_global_count > v_policy.global_limit then
    v_retry := greatest(v_retry, extract(epoch from (v_global_start + make_interval(secs => v_policy.global_window_seconds) - p_now)));
  end if;

  v_remaining := greatest(0, least(
    v_policy.burst_limit - v_burst_count,
    v_policy.sustained_limit - v_sustained_count,
    v_policy.global_limit - v_global_count
  ));

  if v_retry > 0 then
    v_decision := 'THROTTLE';

    insert into private.edge_rate_limit_state as state (
      policy_key, bucket_kind, subject_hash, resource_hash, window_seconds,
      window_started_at, request_count, violation_count, blocked_until,
      expires_at, created_at, updated_at
    ) values (
      p_policy_key, 'block', p_subject_hash, v_global_hash, 0,
      p_now, 0, 1, null,
      p_now + interval '1 hour' + make_interval(secs => v_policy.block_seconds), p_now, p_now
    )
    on conflict (policy_key, bucket_kind, subject_hash, resource_hash, window_seconds)
    do update set
      violation_count = case
        when state.updated_at < p_now - interval '1 hour' then 1
        else state.violation_count + 1
      end,
      blocked_until = case
        when (case when state.updated_at < p_now - interval '1 hour' then 1 else state.violation_count + 1 end) >= 3
          or v_burst_count > v_policy.burst_limit * 2
          or v_sustained_count > v_policy.sustained_limit * 2
          or v_global_count > v_policy.global_limit * 2
        then p_now + make_interval(secs => v_policy.block_seconds)
        else state.blocked_until
      end,
      expires_at = p_now + interval '1 hour' + make_interval(secs => v_policy.block_seconds),
      updated_at = p_now
    returning state.violation_count, state.blocked_until
      into v_violation_count, v_existing_block;

    if v_existing_block is not null and v_existing_block > p_now then
      v_decision := 'TEMPORARY_BLOCK';
      v_retry := greatest(v_retry, extract(epoch from (v_existing_block - p_now)));
    end if;
  end if;

  insert into private.edge_rate_limit_metrics_hourly as metrics (
    metric_hour, policy_key, decision, request_count,
    duplicate_suppressed_count, max_retry_after_seconds, updated_at
  ) values (
    date_trunc('hour', p_now), p_policy_key, v_decision, 1,
    case when v_duplicate_suppressed then 1 else 0 end,
    case when v_retry > 0 then least(3600, greatest(1, ceil(v_retry)::integer)) else 0 end,
    p_now
  )
  on conflict (metric_hour, policy_key, decision) do update set
    request_count = metrics.request_count + 1,
    duplicate_suppressed_count = metrics.duplicate_suppressed_count + excluded.duplicate_suppressed_count,
    max_retry_after_seconds = greatest(metrics.max_retry_after_seconds, excluded.max_retry_after_seconds),
    updated_at = p_now;

  return query select
    v_decision,
    case when v_retry > 0 then least(3600, greatest(1, ceil(v_retry)::integer)) else 0 end,
    v_remaining,
    v_duplicate_suppressed,
    case when v_existing_block is not null and v_existing_block > p_now then v_existing_block else null end;
end;
$function$;

revoke all on function public.consume_edge_rate_limit(text,text,text,text,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text,text,text,text,integer,timestamptz) to service_role;

create or replace function public.cleanup_edge_rate_limit_state(p_max_rows integer default 5000)
returns table(state_rows_deleted integer, metric_rows_deleted integer)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_state_deleted integer := 0;
  v_metric_deleted integer := 0;
begin
  if p_max_rows is null or p_max_rows < 1 or p_max_rows > 10000 then
    raise exception 'invalid_cleanup_batch_size';
  end if;

  with candidates as (
    select policy_key, bucket_kind, subject_hash, resource_hash, window_seconds
    from private.edge_rate_limit_state
    where expires_at < clock_timestamp()
    order by expires_at
    limit p_max_rows
    for update skip locked
  ), deleted as (
    delete from private.edge_rate_limit_state state
    using candidates
    where state.policy_key = candidates.policy_key
      and state.bucket_kind = candidates.bucket_kind
      and state.subject_hash = candidates.subject_hash
      and state.resource_hash = candidates.resource_hash
      and state.window_seconds = candidates.window_seconds
    returning 1
  )
  select count(*)::integer into v_state_deleted from deleted;

  with candidates as (
    select metric_hour, policy_key, decision
    from private.edge_rate_limit_metrics_hourly
    where metric_hour < date_trunc('hour', clock_timestamp()) - interval '30 days'
    order by metric_hour
    limit p_max_rows
    for update skip locked
  ), deleted as (
    delete from private.edge_rate_limit_metrics_hourly metrics
    using candidates
    where metrics.metric_hour = candidates.metric_hour
      and metrics.policy_key = candidates.policy_key
      and metrics.decision = candidates.decision
    returning 1
  )
  select count(*)::integer into v_metric_deleted from deleted;

  return query select v_state_deleted, v_metric_deleted;
end;
$function$;

revoke all on function public.cleanup_edge_rate_limit_state(integer) from public, anon, authenticated;
grant execute on function public.cleanup_edge_rate_limit_state(integer) to service_role;

-- Preserve the existing weekly operations cleanup and append bounded limiter cleanup.
do $block$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'irha-operations-cleanup';
  if v_job_id is null then
    raise exception 'irha_operations_cleanup_cron_missing';
  end if;

  perform cron.alter_job(
    v_job_id,
    '20 2 * * 0',
    $command$select public.invoke_irha_operations('cleanup','cron','{}'::jsonb); select * from public.cleanup_edge_rate_limit_state(5000);$command$,
    null,
    null,
    true
  );
end;
$block$;

comment on table private.edge_rate_limit_policies is 'IA-SEC-E003 durable endpoint policy registry; service contexts only.';
comment on table private.edge_rate_limit_state is 'IA-SEC-E003 HMAC-keyed atomic limiter state; contains no raw client identity.';
comment on table private.edge_rate_limit_metrics_hourly is 'IA-SEC-E003 bounded privacy-preserving hourly limiter summaries.';
comment on function public.consume_edge_rate_limit(text,text,text,text,integer,timestamptz) is 'Service-role-only atomic fixed-window rate-limit decision RPC.';
comment on function public.cleanup_edge_rate_limit_state(integer) is 'Service-role-only bounded cleanup for expired limiter state and 30-day metrics retention.';
