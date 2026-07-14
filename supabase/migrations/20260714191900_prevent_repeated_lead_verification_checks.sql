create or replace function public.invoke_next_lead_verification(
  p_trigger_source text default 'cron',
  p_limit integer default 5
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ids jsonb;
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 5));
begin
  select coalesce(jsonb_agg(id), '[]'::jsonb)
  into v_ids
  from (
    select id
    from public.lead_candidates
    where verification_status in ('needs_review','unverified')
      and (reviewed_at is null or reviewed_at < now() - interval '7 days')
    order by verification_score desc, created_at asc
    limit v_limit
  ) pending;

  if jsonb_array_length(v_ids) = 0 then
    return null;
  end if;

  return public.invoke_irha_operations(
    'lead_verification',
    p_trigger_source,
    jsonb_build_object(
      'limit', v_limit,
      'candidate_ids', v_ids
    )
  );
end;
$$;

revoke all on function public.invoke_next_lead_verification(text, integer)
  from public, anon, authenticated;
grant execute on function public.invoke_next_lead_verification(text, integer)
  to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'irha-daily-lead-verification';

select cron.schedule(
  'irha-daily-lead-verification',
  '0 4 * * *',
  $$select public.invoke_next_lead_verification('cron', 5);$$
);
