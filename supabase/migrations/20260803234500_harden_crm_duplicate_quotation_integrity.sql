-- IA-SEC-E006 / IRHA-CRM-DUPLICATE-QUOTATION-AUTHORIZATION-01
-- Preserve the authenticated admin SECURITY DEFINER boundary while correcting only
-- proven duplicate-confirmation replay history and quotation activity duplication.
-- No buyer record is merged/deleted and no quotation is sent externally.

begin;

create or replace function public.crm_confirm_same_buyer(
  _left_source_type text,
  _left_source_id uuid,
  _right_source_type text,
  _right_source_id uuid,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _left jsonb;
  _right jsonb;
  _left_email text;
  _right_email text;
  _left_phone text;
  _right_phone text;
  _email_match boolean;
  _phone_match boolean;
  _clean_reason text := nullif(btrim(coalesce(_reason, '')), '');
  _first_type text;
  _first_id uuid;
  _second_type text;
  _second_id uuid;
  _link public.crm_record_links%rowtype;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if _left_source_type = _right_source_type and _left_source_id = _right_source_id then
    raise exception 'Choose two different buyer records';
  end if;

  if _clean_reason is null or char_length(_clean_reason) < 5 then
    raise exception 'A clear confirmation reason is required';
  end if;
  if char_length(_clean_reason) > 1000 then
    raise exception 'Confirmation reason is too long';
  end if;

  -- Resolve each source tuple independently. The helper rejects unsupported namespaces
  -- and missing source records before any identity link can be changed.
  _left := public.crm_source_contact_snapshot(_left_source_type, _left_source_id);
  _right := public.crm_source_contact_snapshot(_right_source_type, _right_source_id);
  _left_email := nullif(_left->>'email', '');
  _right_email := nullif(_right->>'email', '');
  _left_phone := nullif(_left->>'phone', '');
  _right_phone := nullif(_right->>'phone', '');

  _email_match := _left_email is not null and _left_email = _right_email;
  _phone_match := _left_phone is not null
                  and char_length(_left_phone) >= 7
                  and _left_phone = _right_phone;

  if not (_email_match or _phone_match) then
    raise exception 'Exact email or phone evidence is required before confirming the same buyer';
  end if;

  -- Canonical pair ordering prevents this RPC from manufacturing reciprocal rows.
  if (_left_source_type || ':' || _left_source_id::text)
       <= (_right_source_type || ':' || _right_source_id::text) then
    _first_type := _left_source_type;
    _first_id := _left_source_id;
    _second_type := _right_source_type;
    _second_id := _right_source_id;
  else
    _first_type := _right_source_type;
    _first_id := _right_source_id;
    _second_type := _left_source_type;
    _second_id := _left_source_id;
  end if;

  select *
  into _link
  from public.crm_record_links
  where (left_source_type = _first_type and left_source_id = _first_id
         and right_source_type = _second_type and right_source_id = _second_id)
     or (left_source_type = _second_type and left_source_id = _second_id
         and right_source_type = _first_type and right_source_id = _first_id)
  limit 1
  for update;

  -- Exact confirmation retries are not new CRM events. Revalidate the live evidence
  -- above, then return the locked row unchanged when the persisted decision is identical.
  if found
     and _link.link_type = 'same_buyer'
     and _link.status = 'confirmed'
     and _link.reason is not distinct from _clean_reason then
    return to_jsonb(_link) || jsonb_build_object(
      'email_match', _email_match,
      'phone_match', _phone_match,
      'records_deleted', false
    );
  end if;

  if found then
    update public.crm_record_links
    set link_type = 'same_buyer',
        status = 'confirmed',
        reason = _clean_reason,
        updated_by = _actor,
        updated_at = now()
    where id = _link.id
    returning * into _link;
  else
    insert into public.crm_record_links (
      left_source_type, left_source_id, right_source_type, right_source_id,
      link_type, status, reason, created_by, updated_by
    ) values (
      _first_type, _first_id, _second_type, _second_id,
      'same_buyer', 'confirmed', _clean_reason, _actor, _actor
    )
    returning * into _link;
  end if;

  insert into public.crm_activity_events (
    source_type, source_id, event_type, summary, metadata, actor_id
  ) values
    (
      _left_source_type,
      _left_source_id,
      'record_updated',
      'Confirmed matching buyer record',
      jsonb_build_object(
        'linked_source_type', _right_source_type,
        'linked_source_id', _right_source_id,
        'link_id', _link.id,
        'email_match', _email_match,
        'phone_match', _phone_match
      ),
      _actor
    ),
    (
      _right_source_type,
      _right_source_id,
      'record_updated',
      'Confirmed matching buyer record',
      jsonb_build_object(
        'linked_source_type', _left_source_type,
        'linked_source_id', _left_source_id,
        'link_id', _link.id,
        'email_match', _email_match,
        'phone_match', _phone_match
      ),
      _actor
    );

  return to_jsonb(_link) || jsonb_build_object(
    'email_match', _email_match,
    'phone_match', _phone_match,
    'records_deleted', false
  );
end;
$$;

create or replace function public.crm_create_buyer_quotation_handoff(
  _source_type text,
  _source_id uuid,
  _currency text,
  _valid_until date,
  _incoterm text,
  _shipping_scope text,
  _payment_terms text,
  _notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _identity jsonb;
  _currency_clean text := upper(btrim(coalesce(_currency, '')));
  _incoterm_clean text := nullif(btrim(coalesce(_incoterm, '')), '');
  _shipping_clean text := nullif(btrim(coalesce(_shipping_scope, '')), '');
  _payment_clean text := nullif(btrim(coalesce(_payment_terms, '')), '');
  _notes_clean text := nullif(btrim(coalesce(_notes, '')), '');
  _quotation public.crm_quotations%rowtype;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  -- Identity is taken only from the requested exact source tuple. The helper rejects
  -- unsupported namespaces and nonexistent source records before quotation insertion.
  _identity := public.crm_source_contact_snapshot(_source_type, _source_id);

  if _currency_clean not in ('USD','EUR','GBP','AUD','CAD','AED') then
    raise exception 'Unsupported quotation currency';
  end if;
  if _valid_until is null or _valid_until < current_date then
    raise exception 'Quotation validity date cannot be in the past';
  end if;
  if _valid_until > current_date + 365 then
    raise exception 'Quotation validity cannot exceed one year';
  end if;
  if _incoterm_clean is null or char_length(_incoterm_clean) not between 2 and 40 then
    raise exception 'Incoterm is required';
  end if;
  if _shipping_clean is null or char_length(_shipping_clean) not between 2 and 2000 then
    raise exception 'Shipping scope is required';
  end if;
  if _payment_clean is null or char_length(_payment_clean) not between 2 and 2000 then
    raise exception 'Payment terms review note is required';
  end if;
  if _notes_clean is not null and char_length(_notes_clean) > 4000 then
    raise exception 'Quotation notes are too long';
  end if;
  if coalesce(
       nullif(_identity->>'display_name', ''),
       nullif(_identity->>'company_name', '')
     ) is null then
    raise exception 'Buyer name or company is required';
  end if;

  insert into public.crm_quotations (
    source_type, source_id, buyer_name, company, destination_country, buyer_email,
    currency, status, valid_until, incoterm, shipping_scope, payment_terms, notes,
    subtotal, shipping_amount, discount_amount, total_amount, created_by, updated_by
  ) values (
    _source_type,
    _source_id,
    coalesce(
      nullif(_identity->>'display_name', ''),
      nullif(_identity->>'company_name', ''),
      ''
    ),
    nullif(_identity->>'company_name', ''),
    nullif(_identity->>'country', ''),
    nullif(_identity->>'email', ''),
    _currency_clean,
    'draft',
    _valid_until,
    _incoterm_clean,
    _shipping_clean,
    _payment_clean,
    _notes_clean,
    0, 0, 0, 0,
    _actor,
    _actor
  )
  returning * into _quotation;

  -- crm_quotations_activity_trigger already writes the single authoritative
  -- quotation_created event for INSERT. Do not duplicate that audit event here.
  return to_jsonb(_quotation) || jsonb_build_object(
    'external_send', false,
    'owner_approval_required', true
  );
end;
$$;

-- Keep browser-admin RPC execution. The explicit in-function admin guard remains the
-- authorization boundary; anonymous callers cannot execute any target.
revoke all on function public.crm_find_duplicate_candidates(integer)
  from public, anon;
revoke all on function public.crm_find_duplicate_candidates(text, uuid, integer)
  from public, anon;
revoke all on function public.crm_confirm_same_buyer(text, uuid, text, uuid, text)
  from public, anon;
revoke all on function public.crm_create_buyer_quotation_handoff(text, uuid, text, date, text, text, text, text)
  from public, anon;

grant execute on function public.crm_find_duplicate_candidates(integer)
  to authenticated, service_role;
grant execute on function public.crm_find_duplicate_candidates(text, uuid, integer)
  to authenticated, service_role;
grant execute on function public.crm_confirm_same_buyer(text, uuid, text, uuid, text)
  to authenticated, service_role;
grant execute on function public.crm_create_buyer_quotation_handoff(text, uuid, text, date, text, text, text, text)
  to authenticated, service_role;

comment on function public.crm_confirm_same_buyer(text, uuid, text, uuid, text) is
  'Admin-only exact-evidence buyer linkage. Exact confirmed retries are idempotent and do not manufacture duplicate CRM activity history.';
comment on function public.crm_create_buyer_quotation_handoff(text, uuid, text, date, text, text, text, text) is
  'Admin-only quotation draft handoff for an exact buyer source tuple. The table audit trigger is the single quotation-created history writer; no external send occurs.';

-- Catalogue and privilege assertions for the exact E006 surface.
do $ia_sec_e006_catalog$
declare
  _sig regprocedure;
  _name text;
  _helper regprocedure := 'public.crm_source_contact_snapshot(text,uuid)'::regprocedure;
begin
  foreach _name in array array[
    'crm_find_duplicate_candidates(integer)',
    'crm_find_duplicate_candidates(text,uuid,integer)',
    'crm_confirm_same_buyer(text,uuid,text,uuid,text)',
    'crm_create_buyer_quotation_handoff(text,uuid,text,date,text,text,text,text)'
  ] loop
    _sig := to_regprocedure('public.' || _name);
    if _sig is null then
      raise exception 'IA-SEC-E006 missing target function: %', _name;
    end if;

    if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = _sig) then
      raise exception 'IA-SEC-E006 target is not SECURITY DEFINER: %', _name;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_proc p
      where p.oid = _sig
        and p.proconfig @> array['search_path=public, pg_temp']::text[]
    ) then
      raise exception 'IA-SEC-E006 unexpected search_path: %', _name;
    end if;

    if has_function_privilege('anon', _sig, 'execute') then
      raise exception 'IA-SEC-E006 anon can execute target: %', _name;
    end if;

    if not has_function_privilege('authenticated', _sig, 'execute')
       or not has_function_privilege('service_role', _sig, 'execute') then
      raise exception 'IA-SEC-E006 intended authenticated/service_role execution missing: %', _name;
    end if;
  end loop;

  if has_schema_privilege('anon', 'public', 'create')
     or has_schema_privilege('authenticated', 'public', 'create') then
    raise exception 'IA-SEC-E006 public schema CREATE is unexpectedly available to an unprivileged API role';
  end if;

  if has_function_privilege('anon', _helper, 'execute')
     or has_function_privilege('authenticated', _helper, 'execute')
     or not has_function_privilege('service_role', _helper, 'execute') then
    raise exception 'IA-SEC-E006 source snapshot helper direct EXECUTE boundary drifted';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'public.crm_quotations'::regclass
      and not t.tgisinternal
      and t.tgenabled <> 'D'
      and p.proname = 'crm_commercial_activity_audit'
      and pg_catalog.pg_get_triggerdef(t.oid) ilike '%AFTER INSERT%'
  ) then
    raise exception 'IA-SEC-E006 authoritative quotation activity trigger is missing or disabled';
  end if;

  if pg_catalog.pg_get_functiondef(
       'public.crm_create_buyer_quotation_handoff(text,uuid,text,date,text,text,text,text)'::regprocedure
     ) ilike '%insert into public.crm_activity_events%' then
    raise exception 'IA-SEC-E006 quotation handoff still writes a duplicate direct activity event';
  end if;
end;
$ia_sec_e006_catalog$;

-- Behavioural authorization-order probes. No genuine buyer data is returned and no
-- source/link/quotation/activity row is changed by these probes.
do $ia_sec_e006_auth$
declare
  _probe uuid := '00000000-0000-0000-0000-00000000e006'::uuid;
  _probe_two uuid := '00000000-0000-0000-0000-00000000e016'::uuid;
  _admin uuid;
  _statement text;
  _claims text;
  _before_links bigint;
  _before_quotes bigint;
  _before_events bigint;
  _after_links bigint;
  _after_quotes bigint;
  _after_events bigint;
begin
  if exists (select 1 from public.user_roles where user_id = _probe) then
    raise exception 'IA-SEC-E006 synthetic non-admin probe unexpectedly has a role';
  end if;

  select count(*) into _before_links from public.crm_record_links;
  select count(*) into _before_quotes from public.crm_quotations;
  select count(*) into _before_events from public.crm_activity_events;

  _claims := json_build_object('sub', _probe::text, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claim.sub', _probe::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', _claims, true);

  foreach _statement in array array[
    'select * from public.crm_find_duplicate_candidates(1)',
    'select * from public.crm_find_duplicate_candidates(''invalid-e006'', ''00000000-0000-0000-0000-00000000e006''::uuid, 1)',
    'select public.crm_confirm_same_buyer(''inquiry'', ''00000000-0000-0000-0000-00000000e006''::uuid, ''prospect'', ''00000000-0000-0000-0000-00000000e016''::uuid, ''IA-SEC-E006 probe'')',
    'select public.crm_create_buyer_quotation_handoff(''inquiry'', ''00000000-0000-0000-0000-00000000e006''::uuid, ''USD'', current_date + 30, ''FOB'', ''IA-SEC-E006 shipping'', ''IA-SEC-E006 payment'', null)'
  ] loop
    begin
      execute _statement;
      raise exception 'IA-SEC-E006 ordinary authenticated probe unexpectedly passed authorization';
    exception
      when others then
        if lower(sqlerrm) <> 'admin access required' then
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

    -- Global discovery is a read-only admin path. Count only; do not surface contact data.
    perform count(*) from public.crm_find_duplicate_candidates(1);

    begin
      perform * from public.crm_find_duplicate_candidates('invalid-e006', _probe, 1);
      raise exception 'IA-SEC-E006 admin duplicate-specific probe skipped source validation';
    exception
      when others then
        if sqlerrm <> 'Unsupported buyer source' then raise; end if;
    end;

    begin
      perform public.crm_confirm_same_buyer(
        'inquiry', _probe, 'prospect', _probe_two, 'IA-SEC-E006 probe'
      );
      raise exception 'IA-SEC-E006 admin same-buyer probe skipped object validation';
    exception
      when others then
        if sqlerrm <> 'Buyer record not found' then raise; end if;
    end;

    begin
      perform public.crm_create_buyer_quotation_handoff(
        'invalid-e006', _probe, 'USD', current_date + 30,
        'FOB', 'IA-SEC-E006 shipping', 'IA-SEC-E006 payment', null
      );
      raise exception 'IA-SEC-E006 admin quotation probe skipped source validation';
    exception
      when others then
        if sqlerrm <> 'Unsupported buyer source' then raise; end if;
    end;
  end if;

  select count(*) into _after_links from public.crm_record_links;
  select count(*) into _after_quotes from public.crm_quotations;
  select count(*) into _after_events from public.crm_activity_events;

  if (_before_links, _before_quotes, _before_events)
       is distinct from (_after_links, _after_quotes, _after_events) then
    raise exception 'IA-SEC-E006 authorization probes mutated CRM state';
  end if;
end;
$ia_sec_e006_auth$;

-- Synthetic exact-retry fixture proves that an already-confirmed pair does not create
-- a second history event. Fixed UUIDs avoid sequence consumption; every fixture row is
-- explicitly removed before commit.
do $ia_sec_e006_retry$
declare
  _left_id uuid := '00000000-0000-0000-0000-00000000e606'::uuid;
  _right_id uuid := '00000000-0000-0000-0000-00000000e616'::uuid;
  _link_id uuid := '00000000-0000-0000-0000-00000000e626'::uuid;
  _admin uuid;
  _claims text;
  _before_events bigint;
  _after_events bigint;
  _result jsonb;
begin
  if exists (select 1 from public.b2b_leads where id in (_left_id, _right_id))
     or exists (select 1 from public.crm_record_links where id = _link_id) then
    raise exception 'IA-SEC-E006 synthetic fixture collision';
  end if;

  select ur.user_id
  into _admin
  from public.user_roles ur
  where ur.role = 'admin'::public.app_role
  order by ur.user_id
  limit 1;

  if _admin is null then
    return;
  end if;

  _claims := json_build_object('sub', _admin::text, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claim.sub', _admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', _claims, true);

  insert into public.b2b_leads (id, company_name, country, email)
  values
    (_left_id, 'IA-SEC-E006 Synthetic Left', 'Test', 'ia-sec-e006@example.invalid'),
    (_right_id, 'IA-SEC-E006 Synthetic Right', 'Test', 'ia-sec-e006@example.invalid');

  insert into public.crm_record_links (
    id, left_source_type, left_source_id, right_source_type, right_source_id,
    link_type, status, reason, created_by, updated_by
  ) values (
    _link_id, 'prospect', _left_id, 'prospect', _right_id,
    'same_buyer', 'confirmed', 'IA-SEC-E006 exact retry', _admin, _admin
  );

  select count(*) into _before_events
  from public.crm_activity_events
  where metadata->>'link_id' = _link_id::text;

  _result := public.crm_confirm_same_buyer(
    'prospect', _right_id,
    'prospect', _left_id,
    'IA-SEC-E006 exact retry'
  );

  select count(*) into _after_events
  from public.crm_activity_events
  where metadata->>'link_id' = _link_id::text;

  if _after_events <> _before_events then
    raise exception 'IA-SEC-E006 exact same-buyer retry changed CRM activity history';
  end if;

  if (_result->>'id')::uuid <> _link_id
     or _result->>'link_type' <> 'same_buyer'
     or _result->>'status' <> 'confirmed' then
    raise exception 'IA-SEC-E006 exact same-buyer retry did not return the existing confirmed link';
  end if;

  delete from public.crm_record_links where id = _link_id;
  delete from public.b2b_leads where id in (_left_id, _right_id);

  if exists (select 1 from public.crm_record_links where id = _link_id)
     or exists (select 1 from public.b2b_leads where id in (_left_id, _right_id))
     or exists (select 1 from public.crm_activity_events where metadata->>'link_id' = _link_id::text) then
    raise exception 'IA-SEC-E006 synthetic fixture cleanup failed';
  end if;
end;
$ia_sec_e006_retry$;

commit;
