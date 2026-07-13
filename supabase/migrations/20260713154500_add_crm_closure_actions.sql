-- Buyer CRM closure actions: duplicate confirmation, meeting outcomes and quotation handoff.
-- These functions never delete buyer records or send external communications.

begin;

create or replace function public.crm_normalize_email(_value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(lower(btrim(coalesce(_value, ''))), '');
$$;

create or replace function public.crm_normalize_phone(_value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(regexp_replace(coalesce(_value, ''), '[^0-9]+', '', 'g'), '');
$$;

create or replace function public.crm_source_contact_snapshot(_source_type text, _source_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  _display_name text;
  _company_name text;
  _country text;
  _email text;
  _phone text;
  _whatsapp text;
  _profile public.crm_buyer_profiles%rowtype;
begin
  if _source_type = 'inquiry' then
    select name, company, country, email, phone, phone
      into _display_name, _company_name, _country, _email, _phone, _whatsapp
    from public.inquiries where id = _source_id;
  elsif _source_type = 'catalogue' then
    select name, company_name, country, email, whatsapp, whatsapp
      into _display_name, _company_name, _country, _email, _phone, _whatsapp
    from public.catalogue_leads where id = _source_id;
  elsif _source_type = 'prospect' then
    select company_name, company_name, country, email, phone, coalesce(whatsapp, phone)
      into _display_name, _company_name, _country, _email, _phone, _whatsapp
    from public.b2b_leads where id = _source_id;
  else
    raise exception 'Unsupported buyer source';
  end if;

  if not found then raise exception 'Buyer record not found'; end if;

  select * into _profile
  from public.crm_buyer_profiles
  where source_type = _source_type and source_id = _source_id;

  if found then
    _display_name := coalesce(nullif(btrim(_profile.display_name), ''), _display_name);
    _company_name := coalesce(nullif(btrim(_profile.company_name), ''), _company_name);
    _country := coalesce(nullif(btrim(_profile.country), ''), _country);
    _email := coalesce(nullif(btrim(_profile.email), ''), _email);
    _phone := coalesce(nullif(btrim(_profile.phone), ''), _phone);
    _whatsapp := coalesce(nullif(btrim(_profile.whatsapp), ''), _whatsapp, _phone);
  end if;

  return jsonb_build_object(
    'source_type', _source_type,
    'source_id', _source_id,
    'display_name', nullif(btrim(coalesce(_display_name, '')), ''),
    'company_name', nullif(btrim(coalesce(_company_name, '')), ''),
    'country', nullif(btrim(coalesce(_country, '')), ''),
    'email', public.crm_normalize_email(_email),
    'phone', public.crm_normalize_phone(coalesce(_whatsapp, _phone))
  );
end;
$$;

revoke all on function public.crm_normalize_email(text) from public, anon, authenticated;
revoke all on function public.crm_normalize_phone(text) from public, anon, authenticated;
revoke all on function public.crm_source_contact_snapshot(text, uuid) from public, anon, authenticated;
grant execute on function public.crm_normalize_email(text) to service_role;
grant execute on function public.crm_normalize_phone(text) to service_role;
grant execute on function public.crm_source_contact_snapshot(text, uuid) to service_role;

create or replace function public.crm_find_duplicate_candidates(
  _source_type text,
  _source_id uuid,
  _limit integer default 25
)
returns table (
  candidate_source_type text,
  candidate_source_id uuid,
  display_name text,
  company_name text,
  country text,
  email text,
  phone text,
  match_type text,
  match_score integer,
  already_linked boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _current jsonb;
  _email text;
  _phone text;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  _current := public.crm_source_contact_snapshot(_source_type, _source_id);
  _email := nullif(_current->>'email', '');
  _phone := nullif(_current->>'phone', '');

  if _email is null and (_phone is null or char_length(_phone) < 7) then
    return;
  end if;

  return query
  with all_buyers as (
    select
      'inquiry'::text as source_type,
      i.id as source_id,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(i.name), '')) as display_name,
      coalesce(nullif(btrim(p.company_name), ''), nullif(btrim(i.company), '')) as company_name,
      coalesce(nullif(btrim(p.country), ''), nullif(btrim(i.country), '')) as country,
      public.crm_normalize_email(coalesce(nullif(btrim(p.email), ''), i.email)) as email,
      public.crm_normalize_phone(coalesce(nullif(btrim(p.whatsapp), ''), nullif(btrim(p.phone), ''), i.phone)) as phone
    from public.inquiries i
    left join public.crm_buyer_profiles p on p.source_type = 'inquiry' and p.source_id = i.id

    union all

    select
      'catalogue'::text,
      c.id,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(c.name), '')),
      coalesce(nullif(btrim(p.company_name), ''), nullif(btrim(c.company_name), '')),
      coalesce(nullif(btrim(p.country), ''), nullif(btrim(c.country), '')),
      public.crm_normalize_email(coalesce(nullif(btrim(p.email), ''), c.email)),
      public.crm_normalize_phone(coalesce(nullif(btrim(p.whatsapp), ''), nullif(btrim(p.phone), ''), c.whatsapp))
    from public.catalogue_leads c
    left join public.crm_buyer_profiles p on p.source_type = 'catalogue' and p.source_id = c.id

    union all

    select
      'prospect'::text,
      b.id,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(b.company_name), '')),
      coalesce(nullif(btrim(p.company_name), ''), nullif(btrim(b.company_name), '')),
      coalesce(nullif(btrim(p.country), ''), nullif(btrim(b.country), '')),
      public.crm_normalize_email(coalesce(nullif(btrim(p.email), ''), b.email)),
      public.crm_normalize_phone(coalesce(nullif(btrim(p.whatsapp), ''), nullif(btrim(p.phone), ''), b.whatsapp, b.phone))
    from public.b2b_leads b
    left join public.crm_buyer_profiles p on p.source_type = 'prospect' and p.source_id = b.id
  ), matched as (
    select
      buyer.*,
      case
        when _email is not null and buyer.email = _email and _phone is not null and char_length(_phone) >= 7 and buyer.phone = _phone then 'email_and_phone'
        when _email is not null and buyer.email = _email then 'email'
        else 'phone'
      end as evidence,
      case
        when _email is not null and buyer.email = _email and _phone is not null and char_length(_phone) >= 7 and buyer.phone = _phone then 100
        when _email is not null and buyer.email = _email then 90
        else 80
      end as score
    from all_buyers buyer
    where not (buyer.source_type = _source_type and buyer.source_id = _source_id)
      and (
        (_email is not null and buyer.email = _email)
        or (_phone is not null and char_length(_phone) >= 7 and buyer.phone = _phone)
      )
  )
  select
    matched.source_type,
    matched.source_id,
    matched.display_name,
    matched.company_name,
    matched.country,
    matched.email,
    matched.phone,
    matched.evidence,
    matched.score,
    exists (
      select 1 from public.crm_record_links link
      where link.status = 'confirmed'
        and (
          (link.left_source_type = _source_type and link.left_source_id = _source_id and link.right_source_type = matched.source_type and link.right_source_id = matched.source_id)
          or
          (link.right_source_type = _source_type and link.right_source_id = _source_id and link.left_source_type = matched.source_type and link.left_source_id = matched.source_id)
        )
    ) as already_linked
  from matched
  order by matched.score desc, matched.company_name nulls last, matched.display_name nulls last
  limit greatest(1, least(coalesce(_limit, 25), 100));
end;
$$;

revoke all on function public.crm_find_duplicate_candidates(text, uuid, integer) from public, anon;
grant execute on function public.crm_find_duplicate_candidates(text, uuid, integer) to authenticated, service_role;

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
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  if _left_source_type = _right_source_type and _left_source_id = _right_source_id then raise exception 'Choose two different buyer records'; end if;
  if _clean_reason is null or char_length(_clean_reason) < 5 then raise exception 'A clear confirmation reason is required'; end if;
  if char_length(_clean_reason) > 1000 then raise exception 'Confirmation reason is too long'; end if;

  _left := public.crm_source_contact_snapshot(_left_source_type, _left_source_id);
  _right := public.crm_source_contact_snapshot(_right_source_type, _right_source_id);
  _left_email := nullif(_left->>'email', '');
  _right_email := nullif(_right->>'email', '');
  _left_phone := nullif(_left->>'phone', '');
  _right_phone := nullif(_right->>'phone', '');

  _email_match := _left_email is not null and _left_email = _right_email;
  _phone_match := _left_phone is not null and char_length(_left_phone) >= 7 and _left_phone = _right_phone;
  if not (_email_match or _phone_match) then
    raise exception 'Exact email or phone evidence is required before confirming the same buyer';
  end if;

  if (_left_source_type || ':' || _left_source_id::text) <= (_right_source_type || ':' || _right_source_id::text) then
    _first_type := _left_source_type; _first_id := _left_source_id;
    _second_type := _right_source_type; _second_id := _right_source_id;
  else
    _first_type := _right_source_type; _first_id := _right_source_id;
    _second_type := _left_source_type; _second_id := _left_source_id;
  end if;

  select * into _link
  from public.crm_record_links
  where (left_source_type = _first_type and left_source_id = _first_id and right_source_type = _second_type and right_source_id = _second_id)
     or (left_source_type = _second_type and left_source_id = _second_id and right_source_type = _first_type and right_source_id = _first_id)
  limit 1
  for update;

  if found then
    update public.crm_record_links
    set link_type = 'same_buyer', status = 'confirmed', reason = _clean_reason, updated_by = _actor, updated_at = now()
    where id = _link.id
    returning * into _link;
  else
    insert into public.crm_record_links (
      left_source_type, left_source_id, right_source_type, right_source_id,
      link_type, status, reason, created_by, updated_by
    ) values (
      _first_type, _first_id, _second_type, _second_id,
      'same_buyer', 'confirmed', _clean_reason, _actor, _actor
    ) returning * into _link;
  end if;

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values
    (_left_source_type, _left_source_id, 'record_updated', 'Confirmed matching buyer record', jsonb_build_object('linked_source_type', _right_source_type, 'linked_source_id', _right_source_id, 'link_id', _link.id, 'email_match', _email_match, 'phone_match', _phone_match), _actor),
    (_right_source_type, _right_source_id, 'record_updated', 'Confirmed matching buyer record', jsonb_build_object('linked_source_type', _left_source_type, 'linked_source_id', _left_source_id, 'link_id', _link.id, 'email_match', _email_match, 'phone_match', _phone_match), _actor);

  return to_jsonb(_link) || jsonb_build_object('email_match', _email_match, 'phone_match', _phone_match, 'records_deleted', false);
end;
$$;

revoke all on function public.crm_confirm_same_buyer(text, uuid, text, uuid, text) from public, anon;
grant execute on function public.crm_confirm_same_buyer(text, uuid, text, uuid, text) to authenticated, service_role;

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
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  if _status not in ('completed', 'cancelled', 'no_show') then raise exception 'Unsupported meeting outcome'; end if;
  if _clean_notes is null or char_length(_clean_notes) < 3 then raise exception 'Meeting outcome notes are required'; end if;
  if char_length(_clean_notes) > 2000 then raise exception 'Meeting outcome notes are too long'; end if;

  select * into _meeting from public.crm_meetings where id = _meeting_id for update;
  if not found then raise exception 'Meeting not found'; end if;
  if _meeting.status not in ('scheduled', _status) then raise exception 'This meeting already has a different final outcome'; end if;

  update public.crm_meetings
  set status = _status, outcome_notes = _clean_notes, updated_by = _actor, updated_at = now()
  where id = _meeting_id
  returning * into _meeting;

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values (
    _meeting.source_type,
    _meeting.source_id,
    'record_updated',
    'Meeting marked ' || replace(_status, '_', ' ') || ': ' || _meeting.title,
    jsonb_build_object('meeting_id', _meeting.id, 'meeting_reference', _meeting.meeting_reference, 'status', _status, 'outcome_notes', _clean_notes),
    _actor
  );

  return to_jsonb(_meeting);
end;
$$;

revoke all on function public.crm_set_meeting_outcome(uuid, text, text) from public, anon;
grant execute on function public.crm_set_meeting_outcome(uuid, text, text) to authenticated, service_role;

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
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  _identity := public.crm_source_contact_snapshot(_source_type, _source_id);

  if _currency_clean not in ('USD','EUR','GBP','AUD','CAD','AED') then raise exception 'Unsupported quotation currency'; end if;
  if _valid_until is null or _valid_until < current_date then raise exception 'Quotation validity date cannot be in the past'; end if;
  if _valid_until > current_date + 365 then raise exception 'Quotation validity cannot exceed one year'; end if;
  if _incoterm_clean is null or char_length(_incoterm_clean) not between 2 and 40 then raise exception 'Incoterm is required'; end if;
  if _shipping_clean is null or char_length(_shipping_clean) not between 2 and 2000 then raise exception 'Shipping scope is required'; end if;
  if _payment_clean is null or char_length(_payment_clean) not between 2 and 2000 then raise exception 'Payment terms review note is required'; end if;
  if _notes_clean is not null and char_length(_notes_clean) > 4000 then raise exception 'Quotation notes are too long'; end if;
  if coalesce(nullif(_identity->>'display_name', ''), nullif(_identity->>'company_name', '')) is null then raise exception 'Buyer name or company is required'; end if;

  insert into public.crm_quotations (
    source_type, source_id, buyer_name, company, destination_country, buyer_email,
    currency, status, valid_until, incoterm, shipping_scope, payment_terms, notes,
    subtotal, shipping_amount, discount_amount, total_amount, created_by, updated_by
  ) values (
    _source_type,
    _source_id,
    coalesce(nullif(_identity->>'display_name', ''), nullif(_identity->>'company_name', ''), ''),
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
  ) returning * into _quotation;

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values (
    _source_type,
    _source_id,
    'quotation_created',
    'Quotation draft created: ' || _quotation.quotation_number,
    jsonb_build_object('quotation_id', _quotation.id, 'quotation_number', _quotation.quotation_number, 'currency', _quotation.currency, 'status', _quotation.status, 'external_send', false),
    _actor
  );

  return to_jsonb(_quotation) || jsonb_build_object('external_send', false, 'owner_approval_required', true);
end;
$$;

revoke all on function public.crm_create_buyer_quotation_handoff(text, uuid, text, date, text, text, text, text) from public, anon;
grant execute on function public.crm_create_buyer_quotation_handoff(text, uuid, text, date, text, text, text, text) to authenticated, service_role;

commit;
