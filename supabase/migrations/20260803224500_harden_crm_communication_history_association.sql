-- IA-SEC-E004 / IRHA-CRM-CORE-BUYER-AUTHORIZATION-01
-- Keep the authenticated admin RPC boundary intact while preventing buyer-history
-- association from falling back to ambiguous or explicitly cross-linked identifiers.

create or replace function public.crm_get_buyer_communication_history(
  _source_type text,
  _source_id uuid,
  _limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _profile jsonb;
  _email text;
  _phone text;
  _email_is_unique boolean := false;
  _phone_is_unique boolean := false;
  _safe_limit integer := greatest(1, least(coalesce(_limit, 200), 500));
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  _profile := public.crm_get_buyer_profile(_source_type, _source_id);
  _email := lower(nullif(btrim(coalesce(_profile->>'email', '')), ''));
  _phone := public.crm_normalize_phone(coalesce(_profile->>'whatsapp', _profile->>'phone'));

  with buyer_identities as (
    select
      lower(nullif(btrim(coalesce(p.email, i.email, '')), '')) as email,
      public.crm_normalize_phone(
        coalesce(p.whatsapp, i.lead_context->>'whatsapp', p.phone, i.phone)
      ) as phone
    from public.inquiries i
    left join public.crm_buyer_profiles p
      on p.source_type = 'inquiry' and p.source_id = i.id

    union all

    select
      lower(nullif(btrim(coalesce(p.email, c.email, '')), '')),
      public.crm_normalize_phone(coalesce(p.whatsapp, c.whatsapp, p.phone))
    from public.catalogue_leads c
    left join public.crm_buyer_profiles p
      on p.source_type = 'catalogue' and p.source_id = c.id

    union all

    select
      lower(nullif(btrim(coalesce(p.email, b.email, '')), '')),
      public.crm_normalize_phone(coalesce(p.whatsapp, b.whatsapp, p.phone, b.phone))
    from public.b2b_leads b
    left join public.crm_buyer_profiles p
      on p.source_type = 'prospect' and p.source_id = b.id
  )
  select
    case
      when _email is null then false
      else count(*) filter (where email = _email) = 1
    end,
    case
      when _phone is null then false
      else count(*) filter (where phone = _phone) = 1
    end
  into _email_is_unique, _phone_is_unique
  from buyer_identities;

  return (
    select coalesce(jsonb_agg(to_jsonb(history_rows) order by history_rows.occurred_at desc), '[]'::jsonb)
    from (
      select *
      from (
        select
          'manual:' || c.id::text as id,
          c.channel,
          c.direction,
          c.status,
          c.subject,
          c.summary as body,
          c.occurred_at,
          c.external_url,
          c.metadata || jsonb_build_object('source', 'manual') as metadata
        from public.crm_communications c
        where c.source_type = _source_type and c.source_id = _source_id

        union all

        select
          'gmail:' || g.gmail_message_id as id,
          'email'::text as channel,
          case when _email is not null and lower(g.sender_email) = _email then 'inbound' else 'outbound' end as direction,
          g.status,
          g.subject,
          coalesce(g.summary_roman_urdu, g.snippet, '') as body,
          g.received_at as occurred_at,
          g.gmail_url as external_url,
          jsonb_build_object(
            'source', 'gmail',
            'category', g.category,
            'importance', g.importance,
            'has_attachment', g.has_attachment,
            'gmail_thread_id', g.gmail_thread_id
          ) as metadata
        from public.gmail_inbox_items g
        where (_source_type = 'prospect' and g.linked_lead_id = _source_id)
           or (
             g.linked_lead_id is null
             and _email_is_unique
             and _email is not null
             and (lower(g.sender_email) = _email or lower(g.recipient_email) = _email)
           )

        union all

        select
          'outreach:' || o.id::text as id,
          'email'::text as channel,
          'outbound'::text as direction,
          o.status,
          o.subject,
          o.body_text as body,
          coalesce(o.replied_at, o.sent_at, o.created_at) as occurred_at,
          null::text as external_url,
          jsonb_build_object(
            'source', 'outreach',
            'campaign_id', o.campaign_id,
            'sequence_number', o.sequence_number,
            'gmail_thread_id', o.gmail_thread_id,
            'error', o.error
          ) as metadata
        from public.outreach_messages o
        where (_source_type = 'prospect' and o.lead_id = _source_id)
           or (
             o.lead_id is null
             and _email_is_unique
             and _email is not null
             and lower(o.recipient_email) = _email
           )

        union all

        select
          'send-log:' || e.id::text as id,
          'email'::text as channel,
          'outbound'::text as direction,
          e.status,
          e.template_name as subject,
          coalesce(e.error_message, 'Email delivery event') as body,
          e.created_at as occurred_at,
          null::text as external_url,
          coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object('source', 'email_send_log', 'message_id', e.message_id) as metadata
        from public.email_send_log e
        where _email_is_unique
          and _email is not null
          and lower(e.recipient_email) = _email
          and not exists (
            select 1 from public.outreach_messages om
            where e.message_id is not null and om.gmail_message_id = e.message_id
          )

        union all

        select
          'whatsapp:' || m.id::text as id,
          'whatsapp'::text as channel,
          m.direction,
          m.status,
          coalesce(m.template_name, replace(m.message_type, '_', ' ')) as subject,
          coalesce(m.body, '[media or non-text message]') as body,
          coalesce(m.received_at, m.sent_at, m.created_at) as occurred_at,
          null::text as external_url,
          jsonb_build_object(
            'source', 'whatsapp',
            'conversation_id', m.conversation_id,
            'message_type', m.message_type,
            'media_mime_type', m.media_mime_type,
            'requires_owner_approval', m.requires_owner_approval,
            'error', m.error
          ) as metadata
        from public.whatsapp_messages m
        join public.whatsapp_contacts wc on wc.id = m.contact_id
        where (_source_type = 'prospect' and wc.crm_lead_id = _source_id)
           or (
             wc.crm_lead_id is null
             and _phone_is_unique
             and _phone is not null
             and public.crm_normalize_phone(coalesce(wc.phone_e164, wc.wa_id)) = _phone
           )

        union all

        select
          'source:' || i.id::text as id,
          'website'::text as channel,
          'inbound'::text as direction,
          'received'::text as status,
          'Website inquiry'::text as subject,
          coalesce(i.message, 'Website inquiry received') as body,
          i.created_at as occurred_at,
          null::text as external_url,
          jsonb_build_object('source', 'website_inquiry', 'intent', i.intent, 'category', i.category, 'quantity', i.quantity) as metadata
        from public.inquiries i
        where _source_type = 'inquiry' and i.id = _source_id

        union all

        select
          'source:' || c.id::text as id,
          'website'::text as channel,
          'inbound'::text as direction,
          'received'::text as status,
          'Catalogue request'::text as subject,
          coalesce(c.message, 'Catalogue request received') as body,
          c.created_at as occurred_at,
          c.catalogue_url as external_url,
          jsonb_build_object('source', 'catalogue_request', 'category_interest', c.category_interest, 'utm_source', c.utm_source) as metadata
        from public.catalogue_leads c
        where _source_type = 'catalogue' and c.id = _source_id
      ) all_history
      order by occurred_at desc
      limit _safe_limit
    ) history_rows
  );
end;
$$;

revoke all on function public.crm_get_buyer_communication_history(text, uuid, integer)
  from public, anon;
grant execute on function public.crm_get_buyer_communication_history(text, uuid, integer)
  to authenticated, service_role;

comment on function public.crm_get_buyer_communication_history(text, uuid, integer) is
  'Admin-only unified buyer communication history. Direct CRM links win; unlinked email/phone fallback is permitted only when the effective identifier uniquely identifies one buyer source record.';

-- Catalogue-only assertions: preserve the intended authenticated admin RPC architecture,
-- prove anon has no execution, and verify the audited search_path is safe because the
-- unprivileged API roles cannot CREATE objects in public.
do $ia_sec_e004_catalog$
declare
  _sig regprocedure;
  _name text;
begin
  foreach _name in array array[
    'crm_get_buyer_profile(text,uuid)',
    'crm_get_buyer_communication_history(text,uuid,integer)',
    'crm_save_buyer_profile(text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)',
    'crm_update_buyer_operating_state(text,uuid,text,text,text,timestamp with time zone,boolean,text)',
    'crm_log_communication(text,uuid,text,text,text,text,timestamp with time zone,text,text)'
  ] loop
    _sig := to_regprocedure('public.' || _name);
    if _sig is null then
      raise exception 'IA-SEC-E004 missing target function: %', _name;
    end if;

    if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = _sig) then
      raise exception 'IA-SEC-E004 target is not SECURITY DEFINER: %', _name;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_proc p
      where p.oid = _sig
        and p.proconfig @> array['search_path=public, pg_temp']::text[]
    ) then
      raise exception 'IA-SEC-E004 unexpected search_path: %', _name;
    end if;

    if has_function_privilege('anon', _sig, 'execute') then
      raise exception 'IA-SEC-E004 anon can execute target: %', _name;
    end if;

    if not has_function_privilege('authenticated', _sig, 'execute')
       or not has_function_privilege('service_role', _sig, 'execute') then
      raise exception 'IA-SEC-E004 intended authenticated/service_role execution missing: %', _name;
    end if;
  end loop;

  if has_schema_privilege('anon', 'public', 'create')
     or has_schema_privilege('authenticated', 'public', 'create') then
    raise exception 'IA-SEC-E004 public schema CREATE is unexpectedly available to an unprivileged API role';
  end if;
end;
$ia_sec_e004_catalog$;

-- Transaction-safe authorization-order probes. They use synthetic JWT claims and a
-- nonexistent buyer ID, so privileged business processing is never reached and no
-- genuine buyer/communication row can be mutated.
do $ia_sec_e004_auth$
declare
  _probe uuid := '00000000-0000-0000-0000-00000000e004'::uuid;
  _admin uuid;
  _statement text;
  _claims text;
begin
  if exists (select 1 from public.user_roles where user_id = _probe) then
    raise exception 'IA-SEC-E004 synthetic non-admin probe unexpectedly has a role';
  end if;

  _claims := json_build_object('sub', _probe::text, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claim.sub', _probe::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', _claims, true);

  foreach _statement in array array[
    'select public.crm_get_buyer_profile(''invalid-e004'', ''00000000-0000-0000-0000-00000000e004''::uuid)',
    'select public.crm_get_buyer_communication_history(''invalid-e004'', ''00000000-0000-0000-0000-00000000e004''::uuid, 1)',
    'select public.crm_save_buyer_profile(''invalid-e004'', ''00000000-0000-0000-0000-00000000e004''::uuid)',
    'select public.crm_update_buyer_operating_state(''invalid-e004'', ''00000000-0000-0000-0000-00000000e004''::uuid, ''new'', ''normal'', null, null, true, null)',
    'select public.crm_log_communication(''invalid-e004'', ''00000000-0000-0000-0000-00000000e004''::uuid, ''phone'', ''internal'', ''IA-SEC-E004 probe'')'
  ] loop
    begin
      execute _statement;
      raise exception 'IA-SEC-E004 ordinary authenticated probe unexpectedly passed authorization';
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
      'select public.crm_get_buyer_profile(''inquiry'', ''00000000-0000-0000-0000-00000000e004''::uuid)',
      'select public.crm_get_buyer_communication_history(''inquiry'', ''00000000-0000-0000-0000-00000000e004''::uuid, 1)',
      'select public.crm_save_buyer_profile(''inquiry'', ''00000000-0000-0000-0000-00000000e004''::uuid)',
      'select public.crm_update_buyer_operating_state(''inquiry'', ''00000000-0000-0000-0000-00000000e004''::uuid, ''new'', ''normal'', null, null, true, null)',
      'select public.crm_log_communication(''inquiry'', ''00000000-0000-0000-0000-00000000e004''::uuid, ''phone'', ''internal'', ''IA-SEC-E004 probe'')'
    ] loop
      begin
        execute _statement;
        raise exception 'IA-SEC-E004 admin probe unexpectedly found the synthetic buyer';
      exception
        when others then
          if sqlerrm <> 'Buyer record not found' then
            raise;
          end if;
      end;
    end loop;

    raise notice 'IA-SEC-E004 legitimate admin authorization path passed before source validation';
  else
    raise notice 'IA-SEC-E004 admin-path probe skipped because this database contains no admin role row';
  end if;
end;
$ia_sec_e004_auth$;
