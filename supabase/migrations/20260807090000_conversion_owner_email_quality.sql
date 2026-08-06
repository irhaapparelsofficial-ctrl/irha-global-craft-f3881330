-- IA-CONVERSION-NOTIFY-20260807
-- Keep buyer persistence independent from mail delivery while making the
-- existing CRM -> outbox -> dispatcher pipeline operationally useful.

create or replace function public.crm_new_public_lead_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  _source_type text;
  _source_id uuid;
  _name text;
  _email text;
  _phone text;
  _company text;
  _inquiry_ref text;
  _created_at timestamptz;
  _request text;
  _country text;
  _body text;
  _title text;
  _intent text;
  _product text;
  _buyer_type text;
  _source_page text;
  _items jsonb := '[]'::jsonb;
  _item_summary text;
  _intent_label text;
begin
  if tg_table_name = 'inquiries' then
    _source_type := 'inquiry';
    _source_id := new.id;
    _name := nullif(btrim(new.name), '');
    _email := nullif(btrim(new.email), '');
    _phone := nullif(btrim(new.phone), '');
    _company := nullif(btrim(new.company), '');
    _inquiry_ref := nullif(btrim(new.inquiry_ref), '');
    _created_at := new.created_at;
    _country := nullif(btrim(new.country), '');
    _intent := lower(coalesce(nullif(btrim(new.intent), ''), nullif(btrim(new.lead_context->>'intent'), ''), 'rfq'));
    _buyer_type := nullif(btrim(new.lead_context->>'buyer_type'), '');
    _source_page := coalesce(
      nullif(btrim(new.lead_context->>'source_page'), ''),
      nullif(btrim(new.lead_context->>'current_page'), ''),
      nullif(btrim(new.source), '')
    );
    _product := coalesce(
      nullif(btrim(new.lead_context->>'product_name'), ''),
      nullif(btrim(new.lead_context->'product_names'->>0), ''),
      nullif(btrim(new.category), ''),
      'General inquiry'
    );
    _request := _product;
    _items := case
      when jsonb_typeof(new.lead_context->'inquiry_items') = 'array'
        then new.lead_context->'inquiry_items'
      else '[]'::jsonb
    end;

    select string_agg(
      format(
        '%s. %s — %s pcs%s',
        row_number,
        coalesce(nullif(btrim(item->>'name'), ''), 'Unnamed style'),
        coalesce(nullif(btrim(item->>'target_quantity'), ''), 'quantity not supplied'),
        case
          when nullif(btrim(item->>'size_breakdown'), '') is not null
            then ' — Sizes: ' || left(btrim(item->>'size_breakdown'), 500)
          else ''
        end
      ),
      E'\n' order by row_number
    ) into _item_summary
    from jsonb_array_elements(_items) with ordinality as source(item, row_number);

    _intent_label := case _intent
      when 'sample' then 'Sample Request'
      when 'meeting' then 'Factory Video Call Request'
      when 'catalogue' then 'Catalogue Request'
      when 'reference' then 'Buyer Reference Inquiry'
      else 'New RFQ'
    end;

    _title := case _intent
      when 'sample' then 'Sample Request — ' || coalesce(_company, _name, 'Buyer') || ' — ' || _product
      when 'meeting' then 'Factory Video Call Request — ' || coalesce(_company, _name, 'Buyer')
      when 'catalogue' then 'Catalogue Request — ' || coalesce(_company, _name, 'Buyer') || ' — ' || _product
      when 'reference' then 'Buyer Reference Inquiry — ' || coalesce(_company, _name, 'Buyer') || ' — ' || _product
      else 'New Website RFQ — ' || coalesce(_company, _name, 'Buyer') || ' — ' || _product
    end;

    _body := concat_ws(
      E'\n',
      _intent_label,
      'Buyer: ' || coalesce(_name, 'Not supplied'),
      'Company: ' || coalesce(_company, 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Product: ' || _product,
      'Quantity: ' || coalesce(nullif(btrim(new.quantity), ''), 'Not supplied'),
      'WhatsApp: ' || coalesce(_phone, 'Not supplied'),
      'Email: ' || coalesce(_email, 'Not supplied'),
      '',
      'Inquiry reference: ' || coalesce(_inquiry_ref, _source_id::text),
      case when _buyer_type is not null then 'Buyer type: ' || _buyer_type else null end,
      case when _source_page is not null then 'Source page: ' || left(_source_page, 500) else null end,
      'Submitted: ' || to_char(_created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS "UTC"'),
      case when _item_summary is not null then E'\nRequested styles:\n' || _item_summary else null end,
      case when jsonb_typeof(new.lead_context->'sample_requirements') = 'object'
        then E'\nSample details:\n' || left((new.lead_context->'sample_requirements')::text, 1500) else null end,
      case when jsonb_typeof(new.lead_context->'meeting_preferences') = 'object'
        then E'\nMeeting preferences:\n' || left((new.lead_context->'meeting_preferences')::text, 1500) else null end,
      case when jsonb_typeof(new.lead_context->'catalogue_preferences') = 'object'
        then E'\nCatalogue preferences:\n' || left((new.lead_context->'catalogue_preferences')::text, 1500) else null end,
      case when nullif(btrim(new.message), '') is not null
        then E'\nRequirements:\n' || left(btrim(new.message), 2500) else null end
    );
  elsif tg_table_name = 'catalogue_leads' then
    _source_type := 'catalogue';
    _source_id := new.id;
    _name := nullif(btrim(new.name), '');
    _email := nullif(btrim(new.email), '');
    _phone := nullif(btrim(new.whatsapp), '');
    _company := nullif(btrim(new.company_name), '');
    _inquiry_ref := null;
    _created_at := new.created_at;
    _request := coalesce(nullif(btrim(new.category_interest), ''), 'Catalogue');
    _country := nullif(btrim(new.country), '');
    _intent := 'catalogue';
    _product := _request;
    _source_page := coalesce(nullif(btrim(new.catalogue_url), ''), nullif(btrim(new.source), ''));
    _items := '[]'::jsonb;
    _title := 'Catalogue Request — ' || coalesce(_company, _name, 'Buyer') || ' — ' || _request;

    _body := concat_ws(
      E'\n',
      'Catalogue Request',
      'Buyer: ' || coalesce(_name, 'Not supplied'),
      'Company: ' || coalesce(_company, 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Category: ' || _request,
      'WhatsApp: ' || coalesce(_phone, 'Not supplied'),
      'Email: ' || coalesce(_email, 'Not supplied'),
      '',
      case when _source_page is not null then 'Source: ' || left(_source_page, 500) else null end,
      case when nullif(btrim(new.utm_source), '') is not null then 'UTM source: ' || left(btrim(new.utm_source), 160) else null end,
      case when nullif(btrim(new.utm_medium), '') is not null then 'UTM medium: ' || left(btrim(new.utm_medium), 160) else null end,
      case when nullif(btrim(new.utm_campaign), '') is not null then 'UTM campaign: ' || left(btrim(new.utm_campaign), 200) else null end,
      'Submitted: ' || to_char(_created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS "UTC"'),
      case when nullif(btrim(new.message), '') is not null
        then E'\nRequirements:\n' || left(btrim(new.message), 2500) else null end
    );
  else
    return new;
  end if;

  insert into public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  ) values (
    'new_lead', _source_type, _source_id,
    left(_title, 500), left(_body, 4000), 'attention',
    'new-lead:' || _source_type || ':' || _source_id::text,
    jsonb_build_object(
      'name', _name,
      'company', _company,
      'email', _email,
      'phone', _phone,
      'request', _request,
      'product', _product,
      'country', _country,
      'intent', _intent,
      'buyer_type', _buyer_type,
      'source_page', _source_page,
      'inquiry_ref', _inquiry_ref,
      'inquiry_items', _items,
      'created_at', _created_at
    )
  )
  on conflict (dedupe_key) do update
  set title = excluded.title,
      body = excluded.body,
      metadata = excluded.metadata,
      updated_at = now();

  return new;
end;
$function$;

create or replace function public.notify_human_live_chat_admin()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  _visitor_name text;
  _visitor_company text;
  _visitor_email text;
  _visitor_whatsapp text;
  _visitor_requirement text;
  _visitor_country text;
  _visitor_country_code text;
  _visitor_region text;
  _visitor_city text;
  _entry_path text;
  _location text;
  _notification_body text;
begin
  if new.channel is distinct from 'human' then
    return new;
  end if;

  if new.role = 'user' then
    select
      visitor_name,
      visitor_company,
      visitor_email,
      visitor_whatsapp,
      visitor_requirement,
      visitor_country,
      visitor_country_code,
      visitor_region,
      visitor_city,
      entry_path
    into
      _visitor_name,
      _visitor_company,
      _visitor_email,
      _visitor_whatsapp,
      _visitor_requirement,
      _visitor_country,
      _visitor_country_code,
      _visitor_region,
      _visitor_city,
      _entry_path
    from public.chat_sessions
    where session_id = new.session_id;

    _location := concat_ws(
      ', ',
      nullif(btrim(_visitor_city), ''),
      nullif(btrim(_visitor_region), ''),
      coalesce(nullif(btrim(_visitor_country), ''), nullif(btrim(_visitor_country_code), ''))
    );

    _notification_body := concat_ws(
      E'\n',
      'Live Chat Message',
      'Buyer: ' || coalesce(nullif(btrim(_visitor_name), ''), 'Website visitor'),
      'Company: ' || coalesce(nullif(btrim(_visitor_company), ''), 'Not supplied'),
      'Country: ' || coalesce(nullif(btrim(_location), ''), 'Not supplied'),
      'Page: ' || coalesce(nullif(btrim(_entry_path), ''), 'Not supplied'),
      'WhatsApp: ' || coalesce(nullif(btrim(_visitor_whatsapp), ''), 'Not supplied'),
      'Email: ' || coalesce(nullif(btrim(_visitor_email), ''), 'Not supplied'),
      case when nullif(btrim(_visitor_requirement), '') is not null
        then 'Requirement: ' || left(btrim(_visitor_requirement), 1000) else null end,
      '',
      'New message: ' || left(new.message, 2200),
      'Conversation: ' || new.session_id,
      'Time: ' || to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS "UTC"')
    );

    insert into public.crm_notifications (
      notification_type,
      source_type,
      source_id,
      title,
      body,
      severity,
      status,
      dedupe_key,
      metadata,
      read_at,
      archived_at,
      created_at,
      updated_at
    )
    values (
      'system',
      'system',
      null,
      'Live Chat Message — ' || coalesce(nullif(btrim(_visitor_name), ''), nullif(btrim(_visitor_country), ''), 'Website visitor'),
      left(_notification_body, 4000),
      'attention',
      'unread',
      'live_chat:' || new.session_id,
      jsonb_build_object(
        'session_id', new.session_id,
        'channel', 'human_live_chat',
        'event', 'message',
        'message_id', new.id,
        'country_code', _visitor_country_code,
        'country', _visitor_country,
        'region', _visitor_region,
        'city', _visitor_city,
        'entry_path', _entry_path
      ),
      null,
      null,
      now(),
      now()
    )
    on conflict (dedupe_key) do update
    set title = excluded.title,
        body = excluded.body,
        severity = 'attention',
        status = 'unread',
        metadata = excluded.metadata,
        read_at = null,
        archived_at = null,
        updated_at = now();

  elsif new.role = 'admin' then
    update public.crm_notifications
    set status = 'read',
        read_at = coalesce(read_at, now()),
        updated_at = now()
    where dedupe_key = 'live_chat:' || new.session_id
      and status = 'unread';
  end if;

  return new;
end;
$function$;

create or replace function public.notification_enqueue_from_crm()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  _kind text;
  _event_id text;
  _event_key text;
  _url text;
  _owner_email text;
  _session_id text;
  _event_type text;
  _email_title text;
  _email_body text;
  _visitor_name text;
  _visitor_company text;
  _visitor_email text;
  _visitor_whatsapp text;
  _visitor_requirement text;
  _visitor_country text;
  _visitor_country_code text;
  _visitor_region text;
  _visitor_city text;
  _entry_path text;
  _location text;
begin
  if new.status <> 'unread' then return new; end if;

  if new.metadata->>'channel' = 'human_live_chat' then
    _kind := 'live_chat';
    _session_id := nullif(btrim(new.metadata->>'session_id'), '');
    _event_type := coalesce(nullif(btrim(new.metadata->>'event'), ''), 'message');
    _event_id := coalesce(nullif(btrim(new.metadata->>'message_id'), ''), nullif(btrim(new.metadata->>'presence_event_id'), ''), extract(epoch from new.updated_at)::bigint::text);
    _event_key := 'live-chat:' || new.id::text || ':' || _event_id;
    _url := case when _session_id is not null then '/admin/live-chat?session=' || _session_id else '/admin/live-chat' end;

    if _session_id is not null then
      select
        visitor_name,
        visitor_company,
        visitor_email,
        visitor_whatsapp,
        visitor_requirement,
        visitor_country,
        visitor_country_code,
        visitor_region,
        visitor_city,
        entry_path
      into
        _visitor_name,
        _visitor_company,
        _visitor_email,
        _visitor_whatsapp,
        _visitor_requirement,
        _visitor_country,
        _visitor_country_code,
        _visitor_region,
        _visitor_city,
        _entry_path
      from public.chat_sessions
      where session_id = _session_id;
    end if;

    _visitor_country := coalesce(_visitor_country, nullif(btrim(new.metadata->>'country'), ''));
    _visitor_country_code := coalesce(_visitor_country_code, nullif(btrim(new.metadata->>'country_code'), ''));
    _visitor_region := coalesce(_visitor_region, nullif(btrim(new.metadata->>'region'), ''));
    _visitor_city := coalesce(_visitor_city, nullif(btrim(new.metadata->>'city'), ''));
    _entry_path := coalesce(_entry_path, nullif(btrim(new.metadata->>'entry_path'), ''));
    _location := concat_ws(', ', nullif(btrim(_visitor_city), ''), nullif(btrim(_visitor_region), ''), coalesce(nullif(btrim(_visitor_country), ''), nullif(btrim(_visitor_country_code), '')));

    if _event_type = 'presence' then
      _email_title := 'Live Chat Opened — ' || coalesce(nullif(btrim(_visitor_name), ''), nullif(btrim(_visitor_country), ''), nullif(btrim(_visitor_country_code), ''), 'Website visitor');
      _email_body := concat_ws(
        E'\n',
        'Live Chat Opened',
        'Buyer: ' || coalesce(nullif(btrim(_visitor_name), ''), 'Not supplied'),
        'Company: ' || coalesce(nullif(btrim(_visitor_company), ''), 'Not supplied'),
        'Country: ' || coalesce(nullif(btrim(_location), ''), 'Not supplied'),
        'Page: ' || coalesce(nullif(btrim(_entry_path), ''), 'Not supplied'),
        'WhatsApp: ' || coalesce(nullif(btrim(_visitor_whatsapp), ''), 'Not supplied'),
        'Email: ' || coalesce(nullif(btrim(_visitor_email), ''), 'Not supplied'),
        case when nullif(btrim(_visitor_requirement), '') is not null then 'Requirement: ' || left(btrim(_visitor_requirement), 1000) else null end,
        'Conversation: ' || coalesce(_session_id, 'Not supplied'),
        'Time: ' || coalesce(nullif(btrim(new.metadata->>'presence_seen_at'), ''), to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS "UTC"'))
      );
    else
      _email_title := case when new.title ilike 'Live Chat Message%' then new.title else 'Live Chat Message — ' || coalesce(nullif(btrim(_visitor_name), ''), nullif(btrim(_visitor_country), ''), 'Website visitor') end;
      _email_body := new.body;
    end if;
  elsif new.notification_type = 'new_lead' and new.source_type in ('inquiry', 'catalogue') then
    _kind := case
      when new.source_type = 'catalogue' then 'catalogue'
      else coalesce(nullif(btrim(new.metadata->>'intent'), ''), 'inquiry')
    end;
    _event_id := coalesce(new.source_id::text, new.id::text);
    _event_key := 'new-lead:' || new.source_type || ':' || _event_id;
    _url := '/admin';
    _email_title := new.title;
    _email_body := new.body;
  else
    return new;
  end if;

  insert into public.notification_outbox(notification_id,dedupe_key,event_key,channel,recipient,payload)
  values(new.id,'push:'||_event_key,_event_key,'web_push','owner-admins',jsonb_build_object(
    'title',new.title,'body',left(new.body,500),'url',_url,'tag',_event_key,'kind',_kind,
    'notification_id',new.id,'source_type',new.source_type,'source_id',new.source_id,'created_at',new.created_at
  )) on conflict(dedupe_key) do nothing;

  _owner_email := public.notification_owner_email();
  if _owner_email is not null then
    insert into public.notification_outbox(notification_id,dedupe_key,event_key,channel,recipient,payload)
    values(new.id,'email-owner:'||_event_key,_event_key,'email',_owner_email,jsonb_build_object(
      'template','owner_alert','subject',left(_email_title,500),'title',left(_email_title,500),
      'body',left(_email_body,4000),'url','https://irhaapparels.com'||_url,'kind',_kind,
      'notification_id',new.id,'source_type',new.source_type,'source_id',new.source_id
    )) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end;
$function$;

-- Replacements retain existing ownership and grants. No public privilege is added.
