begin;

alter table public.lead_candidates
  add column if not exists activation_claim_token uuid,
  add column if not exists activation_claimed_at timestamptz;

create index if not exists lead_candidates_activation_claim_idx
  on public.lead_candidates (activation_claim_token)
  where activation_claim_token is not null;

create index if not exists lead_candidates_activation_claimed_at_idx
  on public.lead_candidates (activation_claimed_at)
  where activation_claimed_at is not null;

create or replace function public.claim_lead_candidates_for_activation(
  p_candidate_ids uuid[],
  p_claim_token uuid,
  p_limit integer default 25
)
returns setof public.lead_candidates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_claim_token is null then
    raise exception 'claim token is required' using errcode = '22023';
  end if;

  update public.lead_candidates
  set activation_claim_token = null,
      activation_claimed_at = null
  where imported_lead_id is null
    and activation_claim_token is not null
    and activation_claimed_at < now() - interval '15 minutes';

  return query
  with requested as (
    select input.candidate_id
    from unnest(coalesce(p_candidate_ids, '{}'::uuid[])) with ordinality as input(candidate_id, position)
    where input.candidate_id is not null
    order by input.position
    limit least(greatest(coalesce(p_limit, 25), 1), 25)
  ),
  claimed as (
    update public.lead_candidates candidate
    set activation_claim_token = p_claim_token,
        activation_claimed_at = now()
    from requested
    where candidate.id = requested.candidate_id
      and candidate.imported_lead_id is null
      and candidate.verification_status in ('verified', 'needs_review')
      and candidate.activation_claim_token is null
    returning candidate.*
  )
  select claimed.*
  from claimed;
end;
$$;

revoke all on function public.claim_lead_candidates_for_activation(uuid[], uuid, integer) from public;
revoke all on function public.claim_lead_candidates_for_activation(uuid[], uuid, integer) from anon;
revoke all on function public.claim_lead_candidates_for_activation(uuid[], uuid, integer) from authenticated;
grant execute on function public.claim_lead_candidates_for_activation(uuid[], uuid, integer) to service_role;

commit;
