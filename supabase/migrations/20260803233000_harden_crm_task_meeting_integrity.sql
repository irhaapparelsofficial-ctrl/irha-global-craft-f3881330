-- IA-SEC-E005 / IRHA-CRM-TASK-MEETING-AUTHORIZATION-01
-- Preserve the authenticated admin SECURITY DEFINER boundary while tightening only
-- proven task/meeting workflow-integrity gaps. No buyer-facing communication occurs.

begin;

create or replace function public.crm_set_task_status(
  _task_id uuid,
  _status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _row public.crm_tasks%rowtype;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if _status not in ('open','completed','cancelled') then
    raise exception 'Unsupported task status';
  end if;

  select *
  into _row
  from public.crm_tasks
  where id = _task_id
  for update;

  if not found then
    raise exception 'Task not found';
  end if;

  -- Exact status replays are idempotent: preserve completed_at/updated_at and do not
  -- manufacture duplicate CRM history for a state transition that did not happen.
  if _row.status = _status then
    return to_jsonb(_row);
  end if;

  update public.crm_tasks
  set status = _status,
      completed_at = case when _status = 'completed' then now() else null end,
      updated_by = _actor,
      updated_at = now()
  where id = _task_id
  returning * into _row;

  -- The existing task trigger records the real transition into completed. Preserve
  -- the current record_updated event for real transitions into open/cancelled only.
  if _status <> 'completed' then
    insert into public.crm_activity_events (
      source_type, source_id, event_type, summary, metadata, actor_id
    ) values (
      _row.source_type,
      _row.source_id,
      'record_updated',
      'Task marked ' || _status || ': ' || _row.title,
      jsonb_build_object('task_id', _row.id, 'status', _status),
      _actor
    );
  end if;

  return to_jsonb(_row);
end;
$$;

create or replace function public.crm_schedule_buyer_meeting(
  _source_type text,
  _source_id uuid,
  _title text,
  _meeting_type text,
  _start_at timestamptz,
  _end_at timestamptz,
  _timezone text default 'Asia/Karachi',
  _location_url text default null,
  _agenda text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _row public.crm_meetings%rowtype;
  _clean_title text := btrim(coalesce(_title, ''));
  _clean_timezone text := nullif(btrim(coalesce(_timezone, '')), '');
  _clean_location text := nullif(btrim(coalesce(_location_url, '')), '');
  _clean_agenda text := nullif(btrim(coalesce(_agenda, '')), '');
  _reference text;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if not public.crm_source_exists(_source_type, _source_id) then
    raise exception 'Buyer record not found';
  end if;

  if char_length(_clean_title) < 2 or char_length(_clean_title) > 240 then
    raise exception 'Meeting title must be between 2 and 240 characters';
  end if;

  if _meeting_type not in ('factory_video','sales_call','sample_review','quotation_review','other') then
    raise exception 'Unsupported meeting type';
  end if;

  if _start_at is null or _end_at is null or _end_at <= _start_at then
    raise exception 'Meeting end time must be after the start time';
  end if;

  if _clean_timezone is null then
    raise exception 'Timezone is required';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = _clean_timezone
  ) then
    raise exception 'Unsupported timezone';
  end if;

  if _clean_location is not null
     and _clean_location !~* '^https://[^[:space:]/?#]+([/?#][^[:space:]]*)?$' then
    raise exception 'Meeting link must be a valid HTTPS URL';
  end if;

  _reference := 'MTG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.crm_meetings (
    source_type, source_id, meeting_reference, title, meeting_type, start_at, end_at,
    timezone, location_url, agenda, status, created_by, updated_by
  ) values (
    _source_type, _source_id, _reference, _clean_title, _meeting_type, _start_at, _end_at,
    _clean_timezone, _clean_location, _clean_agenda, 'scheduled', _actor, _actor
  )
  returning * into _row;

  return to_jsonb(_row);
end;
$$;

create or replace function public.crm_set_meeting_outcome(
  _meeting_id uuid,
  _status text,
  _outcome_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _clean_notes text := nullif(btrim(coalesce(_outcome_notes, '')), '');
  _meeting public.crm_meetings%rowtype;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if _status not in ('completed','cancelled','no_show') then
    raise exception 'Unsupported meeting outcome';
  end if;

  if _clean_notes is null or char_length(_clean_notes) < 3 then
    raise exception 'Meeting outcome notes are required';
  end if;

  if char_length(_clean_notes) > 2000 then
    raise exception 'Meeting outcome notes are too long';
  end if;

  select *
  into _meeting
  from public.crm_meetings
  where id = _meeting_id
  for update;

  if not found then
    raise exception 'Meeting not found';
  end if;

  if _meeting.status not in ('scheduled', _status) then
    raise exception 'This meeting already has a different final outcome';
  end if;

  -- An exact retry is not a new business event. Return the locked row unchanged so
  -- trigger/audit history remains stable under client retries or repeated clicks.
  if _meeting.status = _status
     and _meeting.outcome_notes is not distinct from _clean_notes then
    return to_jsonb(_meeting);
  end if;

  update public.crm_meetings
  set status = _status,
      outcome_notes = _clean_notes,
      updated_by = _actor,
      updated_at = now()
  where id = _meeting_id
  returning * into _meeting;

  insert into public.crm_activity_events (
    source_type, source_id, event_type, summary, metadata, actor_id
  ) values (
    _meeting.source_type,
    _meeting.source_id,
    'record_updated',
    'Meeting marked ' || replace(_status, '_', ' ') || ': ' || _meeting.title,
    jsonb_build_object(
      'meeting_id', _meeting.id,
      'meeting_reference', _meeting.meeting_reference,
      'status', _status,
      'outcome_notes', _clean_notes
    ),
    _actor
  );

  return to_jsonb(_meeting);
end;
$$;

-- Keep the existing browser-admin RPC architecture. Ordinary authenticated users can
-- reach the RPC endpoint but must fail the explicit admin guard before privileged work.
revoke all on function public.crm_create_followup_task(text, uuid, text, text, text, timestamptz, text)
  from public, anon;
revoke all on function public.crm_set_task_status(uuid, text)
  from public, anon;
revoke all on function public.crm_schedule_buyer_meeting(text, uuid, text, text, timestamptz, timestamptz, text, text, text)
  from public, anon;
revoke all on function public.crm_set_meeting_outcome(uuid, text, text)
  from public, anon;

grant execute on function public.crm_create_followup_task(text, uuid, text, text, text, timestamptz, text)
  to authenticated, service_role;
grant execute on function public.crm_set_task_status(uuid, text)
  to authenticated, service_role;
grant execute on function public.crm_schedule_buyer_meeting(text, uuid, text, text, timestamptz, timestamptz, text, text, text)
  to authenticated, service_role;
grant execute on function public.crm_set_meeting_outcome(uuid, text, text)
  to authenticated, service_role;

comment on function public.crm_set_task_status(uuid, text) is
  'Admin-only CRM task status mutation. Exact status retries are idempotent and do not rewrite timestamps or CRM history.';
comment on function public.crm_schedule_buyer_meeting(text, uuid, text, text, timestamptz, timestamptz, text, text, text) is
  'Admin-only buyer meeting scheduler with source-tuple, IANA timezone, time-order and usable HTTPS-link validation.';
comment on function public.crm_set_meeting_outcome(uuid, text, text) is
  'Admin-only meeting outcome mutation. Different final outcomes are blocked and exact retries are idempotent.';

-- Catalogue assertions: preserve the intended SECURITY DEFINER boundary and prove the
-- audited search_path is safe from ordinary API-role CREATE injection.
do $ia_sec_e005_catalog$
declare
  _sig regprocedure;
  _name text;
begin
  foreach _name in array array[
    'crm_create_followup_task(text,uuid,text,text,text,timestamp with time zone,text)',
    'crm_set_task_status(uuid,text)',
    'crm_schedule_buyer_meeting(text,uuid,text,text,timestamp with time zone,timestamp with time zone,text,text,text)',
    'crm_set_meeting_outcome(uuid,text,text)'
  ] loop
    _sig := to_regprocedure('public.' || _name);
    if _sig is null then
      raise exception 'IA-SEC-E005 missing target function: %', _name;
    end if;

    if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = _sig) then
      raise exception 'IA-SEC-E005 target is not SECURITY DEFINER: %', _name;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_proc p
      where p.oid = _sig
        and p.proconfig @> array['search_path=public, pg_temp']::text[]
    ) then
      raise exception 'IA-SEC-E005 unexpected search_path: %', _name;
    end if;

    if has_function_privilege('anon', _sig, 'execute') then
      raise exception 'IA-SEC-E005 anon can execute target: %', _name;
    end if;

    if not has_function_privilege('authenticated', _sig, 'execute')
       or not has_function_privilege('service_role', _sig, 'execute') then
      raise exception 'IA-SEC-E005 intended authenticated/service_role execution missing: %', _name;
    end if;
  end loop;

  if has_schema_privilege('anon', 'public', 'create')
     or has_schema_privilege('authenticated', 'public', 'create') then
    raise exception 'IA-SEC-E005 public schema CREATE is unexpectedly available to an unprivileged API role';
  end if;
end;
$ia_sec_e005_catalog$;

-- Authorization-order probes use only nonexistent object IDs. They prove ordinary
-- authenticated callers fail before privileged work while a legitimate admin reaches
-- normal source/object validation.
do $ia_sec_e005_auth$
declare
  _probe uuid := '00000000-0000-0000-0000-00000000e005'::uuid;
  _admin uuid;
  _statement text;
  _claims text;
begin
  if exists (select 1 from public.user_roles where user_id = _probe) then
    raise exception 'IA-SEC-E005 synthetic non-admin probe unexpectedly has a role';
  end if;

  _claims := json_build_object('sub', _probe::text, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claim.sub', _probe::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', _claims, true);

  foreach _statement in array array[
    'select public.crm_create_followup_task(''invalid-e005'', ''00000000-0000-0000-0000-00000000e005''::uuid, ''IA-SEC-E005 probe'', null, ''normal'', now() + interval ''1 day'', null)',
    'select public.crm_set_task_status(''00000000-0000-0000-0000-00000000e005''::uuid, ''completed'')',
    'select public.crm_schedule_buyer_meeting(''invalid-e005'', ''00000000-0000-0000-0000-00000000e005''::uuid, ''IA-SEC-E005 probe'', ''sales_call'', now() + interval ''1 day'', now() + interval ''1 day 30 minutes'', ''Asia/Karachi'', null, null)',
    'select public.crm_set_meeting_outcome(''00000000-0000-0000-0000-00000000e005''::uuid, ''completed'', ''IA-SEC-E005 probe'')'
  ] loop
    begin
      execute _statement;
      raise exception 'IA-SEC-E005 ordinary authenticated probe unexpectedly passed authorization';
    exception
      when others then
        if sqlerrm <> 'Admin access required' then
          raise;
        end if;
    end;
  end loop;

  select ur.user_id
  into _admin
  from public.user_roles ur
  where ur.role = 'admin'::public.app_role
  order by ur.user_id
  limit 1;

  if _admin is not null then
    _claims := json_build_object('sub', _admin::text, 'role', 'authenticated')::text;
    perform set_config('request.jwt.claim.sub', _admin::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claims', _claims, true);

    foreach _statement in array array[
      'select public.crm_create_followup_task(''inquiry'', ''00000000-0000-0000-0000-00000000e005''::uuid, ''IA-SEC-E005 probe'', null, ''normal'', now() + interval ''1 day'', null)',
      'select public.crm_set_task_status(''00000000-0000-0000-0000-00000000e005''::uuid, ''completed'')',
      'select public.crm_schedule_buyer_meeting(''inquiry'', ''00000000-0000-0000-0000-00000000e005''::uuid, ''IA-SEC-E005 probe'', ''sales_call'', now() + interval ''1 day'', now() + interval ''1 day 30 minutes'', ''Asia/Karachi'', null, null)',
      'select public.crm_set_meeting_outcome(''00000000-0000-0000-0000-00000000e005''::uuid, ''completed'', ''IA-SEC-E005 probe'')'
    ] loop
      begin
        execute _statement;
        raise exception 'IA-SEC-E005 admin probe unexpectedly found the synthetic object';
      exception
        when others then
          if sqlerrm not in ('Buyer record not found', 'Task not found', 'Meeting not found') then
            raise;
          end if;
      end;
    end loop;
  end if;
end;
$ia_sec_e005_auth$;

-- Rollback-safe synthetic integrity fixture. It touches no genuine CRM row and removes
-- itself before commit. Any assertion failure aborts the entire migration transaction.
do $ia_sec_e005_integrity$
declare
  _source_id uuid := '00000000-0000-0000-0000-00000000e505'::uuid;
  _admin uuid;
  _claims text;
  _task jsonb;
  _task_id uuid;
  _meeting jsonb;
  _meeting_id uuid;
  _events_before integer;
  _events_after integer;
  _accepted boolean;
begin
  select ur.user_id
  into _admin
  from public.user_roles ur
  where ur.role = 'admin'::public.app_role
  order by ur.user_id
  limit 1;

  if _admin is null then
    raise notice 'IA-SEC-E005 synthetic integrity probes skipped because this database contains no admin role row';
    return;
  end if;

  if public.crm_source_exists('inquiry', _source_id)
     or public.crm_source_exists('catalogue', _source_id)
     or public.crm_source_exists('prospect', _source_id) then
    raise exception 'IA-SEC-E005 synthetic fixture ID already exists in a buyer source';
  end if;

  _claims := json_build_object('sub', _admin::text, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claim.sub', _admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', _claims, true);

  insert into public.b2b_leads(id, company_name, country)
  values (_source_id, 'IA-SEC-E005 synthetic migration fixture', 'ZZ');

  -- Wrong source type + valid UUID must fail as a tuple before any task/meeting write.
  begin
    perform public.crm_create_followup_task(
      'inquiry', _source_id, 'IA-SEC-E005 tuple probe', null, 'normal', now() + interval '1 day', null
    );
    raise exception 'IA-SEC-E005 task source tuple mismatch was accepted';
  exception when others then
    if sqlerrm <> 'Buyer record not found' then raise; end if;
  end;

  begin
    perform public.crm_schedule_buyer_meeting(
      'inquiry', _source_id, 'IA-SEC-E005 tuple probe', 'sales_call',
      now() + interval '1 day', now() + interval '1 day 30 minutes',
      'Asia/Karachi', null, null
    );
    raise exception 'IA-SEC-E005 meeting source tuple mismatch was accepted';
  exception when others then
    if sqlerrm <> 'Buyer record not found' then raise; end if;
  end;

  _task := public.crm_create_followup_task(
    'prospect', _source_id, 'IA-SEC-E005 idempotence task', null, 'normal',
    now() + interval '1 day', null
  );
  _task_id := (_task ->> 'id')::uuid;

  select count(*) into _events_before
  from public.crm_activity_events
  where source_type = 'prospect' and source_id = _source_id;

  perform public.crm_set_task_status(_task_id, 'open');
  perform public.crm_set_task_status(_task_id, 'open');

  select count(*) into _events_after
  from public.crm_activity_events
  where source_type = 'prospect' and source_id = _source_id;

  if _events_after <> _events_before then
    raise exception 'IA-SEC-E005 no-op task replay changed CRM activity history';
  end if;

  _accepted := false;
  begin
    perform public.crm_schedule_buyer_meeting(
      'prospect', _source_id, 'IA-SEC-E005 timezone probe', 'sales_call',
      now() + interval '1 day', now() + interval '1 day 30 minutes',
      'Definitely/Not_A_Timezone', null, null
    );
    _accepted := true;
  exception when others then
    if sqlerrm <> 'Unsupported timezone' then raise; end if;
  end;
  if _accepted then
    raise exception 'IA-SEC-E005 invalid timezone was accepted';
  end if;

  _accepted := false;
  begin
    perform public.crm_schedule_buyer_meeting(
      'prospect', _source_id, 'IA-SEC-E005 URL probe', 'sales_call',
      now() + interval '1 day', now() + interval '1 day 30 minutes',
      'Asia/Karachi', 'https://', null
    );
    _accepted := true;
  exception when others then
    if sqlerrm <> 'Meeting link must be a valid HTTPS URL' then raise; end if;
  end;
  if _accepted then
    raise exception 'IA-SEC-E005 hostless HTTPS meeting link was accepted';
  end if;

  _meeting := public.crm_schedule_buyer_meeting(
    'prospect', _source_id, 'IA-SEC-E005 outcome meeting', 'sales_call',
    now() + interval '1 day', now() + interval '1 day 30 minutes',
    'Asia/Karachi', 'https://example.com/meeting', 'Synthetic migration fixture'
  );
  _meeting_id := (_meeting ->> 'id')::uuid;

  perform public.crm_set_meeting_outcome(
    _meeting_id, 'completed', 'IA-SEC-E005 synthetic outcome'
  );

  select count(*) into _events_before
  from public.crm_activity_events
  where source_type = 'prospect' and source_id = _source_id;

  perform public.crm_set_meeting_outcome(
    _meeting_id, 'completed', 'IA-SEC-E005 synthetic outcome'
  );

  select count(*) into _events_after
  from public.crm_activity_events
  where source_type = 'prospect' and source_id = _source_id;

  if _events_after <> _events_before then
    raise exception 'IA-SEC-E005 exact meeting-outcome replay changed CRM activity history';
  end if;

  delete from public.crm_activity_events
  where source_type = 'prospect' and source_id = _source_id;
  delete from public.crm_tasks where source_type = 'prospect' and source_id = _source_id;
  delete from public.crm_meetings where source_type = 'prospect' and source_id = _source_id;
  delete from public.b2b_leads where id = _source_id;

  if exists (select 1 from public.crm_activity_events where source_type = 'prospect' and source_id = _source_id)
     or exists (select 1 from public.crm_tasks where source_type = 'prospect' and source_id = _source_id)
     or exists (select 1 from public.crm_meetings where source_type = 'prospect' and source_id = _source_id)
     or exists (select 1 from public.b2b_leads where id = _source_id) then
    raise exception 'IA-SEC-E005 synthetic fixture cleanup failed';
  end if;
end;
$ia_sec_e005_integrity$;

commit;
