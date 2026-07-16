begin;

create or replace function public.notification_claim_outbox(_limit integer default 25)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_outbox o
  set status = 'retry',
      locked_at = null,
      next_attempt_at = now(),
      last_error = coalesce(o.last_error, 'Recovered stale processing lock'),
      updated_at = now()
  where o.status = 'processing'
    and o.locked_at < now() - interval '5 minutes';

  return query
  with picked as (
    select candidate.id
    from public.notification_outbox candidate
    where candidate.status in ('pending', 'retry')
      and candidate.next_attempt_at <= now()
    order by candidate.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(_limit, 25), 100))
  )
  update public.notification_outbox target
  set status = 'processing',
      locked_at = now(),
      attempt_count = target.attempt_count + 1,
      updated_at = now()
  from picked
  where target.id = picked.id
  returning target.*;
end;
$$;

revoke all on function public.notification_claim_outbox(integer) from public, anon, authenticated;
grant execute on function public.notification_claim_outbox(integer) to service_role;

commit;
