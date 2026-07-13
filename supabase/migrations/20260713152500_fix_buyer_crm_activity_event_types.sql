-- Align Buyer CRM action functions with the existing activity-event contract.

begin;

create or replace function public.crm_update_buyer_operating_state(
  _source_type text,
  _source_id uuid,
  _stage text,
  _priority text,
  _assignee text default null,
  _follow_up_at timestamptz default null,
  _outreach_opt_out boolean default null,
  _outcome_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _actor_email text;
  _clean_assignee text := nullif(btrim(coalesce(_assignee, '')), '');
  _clean_reason text := nullif(btrim(coalesce(_outcome_reason, '')), '');
  _company text;
  _legacy_status public.lead_status;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  if _source_type not in ('inquiry', 'catalogue', 'prospect') then raise exception 'Unsupported buyer source'; end if;
  if _stage not in ('new','qualified','contacted','replied','sample_requested','quote_requested','quotation_sent','negotiation','won','lost') then raise exception 'Unsupported sales stage'; end if;
  if _priority not in ('low','normal','high','urgent') then raise exception 'Unsupported priority'; end if;
  if _stage = 'lost' and _clean_reason is null then raise exception 'A lost reason is required before closing this buyer'; end if;
  if _clean_reason is not null and char_length(_clean_reason) > 1000 then raise exception 'Outcome reason is too long'; end if;
  if not public.crm_source_exists(_source_type, _source_id) then raise exception 'Buyer record not found'; end if;

  select email into _actor_email from auth.users where id = _actor;

  if _source_type = 'inquiry' then
    update public.inquiries
    set status = _stage, priority = _priority, assignee = _clean_assignee, follow_up_at = _follow_up_at, updated_at = now()
    where id = _source_id
    returning coalesce(nullif(btrim(company), ''), nullif(btrim(name), ''), 'Buyer') into _company;
  elsif _source_type = 'catalogue' then
    update public.catalogue_leads
    set status = _stage, priority = _priority, assignee = _clean_assignee, follow_up_at = _follow_up_at, updated_at = now()
    where id = _source_id
    returning coalesce(nullif(btrim(company_name), ''), nullif(btrim(name), ''), 'Buyer') into _company;
  else
    _legacy_status := case
      when _stage = 'lost' then 'Rejected'::public.lead_status
      when _stage = 'replied' then 'Replied'::public.lead_status
      when _stage in ('qualified','negotiation','won') then 'Warm'::public.lead_status
      when _stage in ('contacted','sample_requested','quote_requested','quotation_sent') then 'Pitched'::public.lead_status
      else 'New'::public.lead_status
    end;
    update public.b2b_leads
    set crm_status = _stage,
        lead_status = _legacy_status,
        priority = _priority,
        assignee = _clean_assignee,
        follow_up_at = _follow_up_at,
        outreach_opt_out = coalesce(_outreach_opt_out, outreach_opt_out),
        updated_at = now()
    where id = _source_id
    returning company_name into _company;
  end if;

  if _clean_reason is not null then
    insert into public.crm_notes (source_type, source_id, body, pinned, created_by, created_by_email, updated_by)
    values (
      _source_type,
      _source_id,
      case when _stage = 'lost' then 'Lost reason: ' else 'Outcome note: ' end || _clean_reason,
      false,
      _actor,
      _actor_email,
      _actor
    );
  end if;

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values (
    _source_type,
    _source_id,
    'stage_changed',
    coalesce(_company, 'Buyer') || ' moved to ' || replace(_stage, '_', ' '),
    jsonb_build_object(
      'stage', _stage,
      'priority', _priority,
      'assignee', _clean_assignee,
      'follow_up_at', _follow_up_at,
      'outreach_opt_out', case when _source_type = 'prospect' then _outreach_opt_out else null end,
      'outcome_reason', _clean_reason
    ),
    _actor
  );

  return jsonb_build_object(
    'source_type', _source_type,
    'source_id', _source_id,
    'stage', _stage,
    'priority', _priority,
    'assignee', _clean_assignee,
    'follow_up_at', _follow_up_at,
    'outreach_opt_out', case when _source_type = 'prospect' then _outreach_opt_out else null end
  );
end;
$$;

create or replace function public.crm_set_task_status(_task_id uuid, _status text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _row public.crm_tasks%rowtype;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  if _status not in ('open','completed','cancelled') then raise exception 'Unsupported task status'; end if;

  update public.crm_tasks
  set status = _status,
      completed_at = case when _status = 'completed' then now() else null end,
      updated_by = _actor,
      updated_at = now()
  where id = _task_id
  returning * into _row;

  if _row.id is null then raise exception 'Task not found'; end if;

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values (
    _row.source_type,
    _row.source_id,
    case when _status = 'completed' then 'task_completed' else 'record_updated' end,
    'Task marked ' || _status || ': ' || _row.title,
    jsonb_build_object('task_id', _row.id, 'status', _status),
    _actor
  );

  return to_jsonb(_row);
end;
$$;

commit;
