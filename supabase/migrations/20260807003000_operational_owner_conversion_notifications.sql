-- Production owner notification quality and live-chat context hardening.
-- Reuses the existing CRM -> notification_outbox -> notification-dispatcher pipeline.

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
  _buyer_label text;
  _inquiry_ref text;
  _created_at timestamptz;
  _request text;
  _intent text;
  _country text;
  _product text;
  _quantity text;
  _source_page text;
  _buyer_type text;
  _utm_source text;
  _utm_medium text;
  _utm_campaign text;
  _body text;
  _title text;
  _items jsonb := '[]'::jsonb;
  _item_summary text;
  _sample_summary text;
  _meeting_summary text;
begin
  if tg_table_name = 'inquiries' then
    _source_type := 'inquiry';
    _source_id := new.id;
    _name := nullif(btrim(new.name), '');
    _email := nullif(btrim(new.email), '');
    _phone := nullif(btrim(new.phone), '');
    _company := nullif(btrim(new.company), '');
    _buyer_label := coalesce(_company, _name, 'Website buyer');
    _inquiry_ref := nullif(btrim(new.inquiry_ref), '');
    _created_at := new.created_at;
    _intent := lower(coalesce(nullif(btrim(new.intent), ''), 'rfq'));
    _country := nullif(btrim(new.country), '');
    _product := coalesce(
      nullif(btrim(new.lead_context->>'product_name'), ''),
      nullif(btrim(new.category), ''),
      nullif(btrim(new.lead_context->>'category'), ''),
      'General apparel'
    );
    _quantity := coalesce(nullif(btrim(new.quantity), ''), nullif(btrim(new.lead_context->>'quantity'), ''));
    _source_page := coalesce(
      nullif(btrim(new.lead_context->>'source_page'), ''),
      nullif(btrim(new.lead_context->>'current_page'), ''),
      nullif(btrim(new.source), '')
    );
    _buyer_type := nullif(btrim(new.lead_context->>'buyer_type'), '');
    _utm_source := nullif(btrim(new.lead_context->>'utm_source'), '');
    _utm_medium := nullif(btrim(new.lead_context->>'utm_medium'), '');
    _utm_campaign := nullif(btrim(new.lead_context->>'utm_campaign'), '');
    _request := case _intent
      when 'sample' then 'Sample request'
      when 'catalogue' then 'Catalogue request'
      when 'meeting' then 'Factory video-call / meeting request'
      when 'reference' then 'Reference / tech-pack review'
      else coalesce(nullif(btrim(new.category), ''), 'Request for quotation')
    end;

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

    if _intent = 'sample' and jsonb_typeof(new.lead_context->'sample_requirements') = 'object' then
      _sample_summary := concat_ws(
        ' · ',
        case when nullif(btrim(new.lead_context->'sample_requirements'->>'quantity'), '') is not null then 'Qty ' || btrim(new.lead_context->'sample_requirements'->>'quantity') end,
        case when nullif(btrim(new.lead_context->'sample_requirements'->>'size'), '') is not null then 'Size ' || btrim(new.lead_context->'sample_requirements'->>'size') end,
        case when nullif(btrim(new.lead_context->'sample_requirements'->>'color'), '') is not null then 'Colour ' || btrim(new.lead_context->'sample_requirements'->>'color') end,
        case when nullif(btrim(new.lead_context->'sample_requirements'->>'branding'), '') is not null then 'Branding ' || btrim(new.lead_context->'sample_requirements'->>'branding') end
      );
    end if;

    if _intent = 'meeting' and jsonb_typeof(new.lead_context->'meeting_preferences') = 'object' then
      _meeting_summary := concat_ws(
        ' · ',
        case when nullif(btrim(new.lead_context->'meeting_preferences'->>'topic'), '') is not null then 'Topic ' || btrim(new.lead_context->'meeting_preferences'->>'topic') end,
        case when nullif(btrim(new.lead_context->'meeting_preferences'->>'date'), '') is not null then 'Date ' || btrim(new.lead_context->'meeting_preferences'->>'date') end,
        case when nullif(btrim(new.lead_context->'meeting_preferences'->>'time_window'), '') is not null then 'Window ' || btrim(new.lead_context->'meeting_preferences'->>'time_window') end,
        case when nullif(btrim(new.lead_context->'meeting_preferences'->>'timezone'), '') is not null then 'Timezone ' || btrim(new.lead_context->'meeting_preferences'->>'timezone') end
      );
    end if;

    _title := case _intent
      when 'sample' then 'New Sample Request — ' || _buyer_label || ' — ' || _product
      when 'catalogue' then 'New Catalogue Request — ' || _buyer_label
      when 'meeting' then 'Factory Video Call Request — ' || _buyer_label || ' — ' || _product
      when 'reference' then 'New Website RFQ — ' || _buyer_label || ' — Reference Review'
      else 'New Website RFQ — ' || _buyer_label || ' — ' || _product
    end;

    _body := concat_ws(
      E'\n',
      case _intent
        when 'sample' then 'New Sample Request'
        when 'catalogue' then 'New Catalogue Request'
        when 'meeting' then 'Factory Video Call Request'
        else 'New RFQ'
      end,
      'Buyer: ' || coalesce(_name, 'Not supplied'),
      'Company: ' || coalesce(_company, 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Product: ' || _product,
      'Quantity: ' || coalesce(_quantity, 'Not supplied'),
      'WhatsApp: ' || coalesce(_phone, 'Not supplied'),
      'Email: ' || coalesce(_email, 'Not supplied'),
      'Reference: ' || coalesce(_inquiry_ref, _source_id::text),
      case when _buyer_type is not null then 'Buyer type: ' || _buyer_type end,
      'Intent: ' || _request,
      case when _source_page is not null then 'Source page: ' || left(_source_page, 1000) end,
      'Submitted: ' || coalesce(_created_at::text, now()::text),
      case when _utm_source is not null or _utm_medium is not null or _utm_campaign is not null
        then 'UTM: ' || concat_ws(' / ', _utm_source, _utm_medium, _utm_campaign) end,
      case when _sample_summary is not null then 'Sample details: ' || _sample_summary end,
      case when _meeting_summary is not null then 'Meeting details: ' || _meeting_summary end,
      case when _item_summary is not null then E'\nRequested styles:\n' || _item_summary end,
      case when nullif(btrim(new.message), '') is not null then E'\nRequirements:\n' || left(btrim(new.message), 2500) end
    );
  elsif tg_table_name = 'catalogue_leads' then
    _source_type := 'catalogue';
    _source_id := new.id;
    _name := nullif(btrim(new.name), '');
    _email := nullif(btrim(new.email), '');
    _phone := nullif(btrim(new.whatsapp), '');
    _company := nullif(btrim(new.company_name), '');
    _buyer_label := coalesce(_company, _name, 'Website buyer');
    _inquiry_ref := null;
    _created_at := new.created_at;
    _intent := 'catalogue';
    _request := coalesce(nullif(btrim(new.category_interest), ''), 'Catalogue request');
    _country := nullif(btrim(new.country), '');
    _product := coalesce(nullif(btrim(new.category_interest), ''), 'Catalogue');
    _quantity := null;
    _source_page := coalesce(nullif(btrim(new.catalogue_url), ''), nullif(btrim(new.source), ''));
    _utm_source := nullif(btrim(new.utm_source), '');
    _utm_medium := nullif(btrim(new.utm_medium), '');
    _utm_campaign := nullif(btrim(new.utm_campaign), '');
    _items := '[]'::jsonb;
    _title := 'New Catalogue Request — ' || _buyer_label;

    _body := concat_ws(
      E'\n',
      'New Catalogue Request',
      'Buyer: ' || coalesce(_name, 'Not supplied'),
      'Company: ' || coalesce(_company, 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Category: ' || _product,
      'WhatsApp: ' || coalesce(_phone, 'Not supplied'),
      'Email: ' || coalesce(_email, 'Not supplied'),
      case when _source_page is not null then 'Source: ' || left(_source_page, 1000) end,
      'Submitted: ' || coalesce(_created_at::text, now()::text),
      case when _utm_source is not null or _utm_medium is not null or _utm_campaign is not null
        then 'UTM: ' || concat_ws(' / ', _utm_source, _utm_medium, _utm_campaign) end,
      case when nullif(btrim(new.message), '') is not null then E'\nRequirements:\n' || left(btrim(new.message), 2500) end
    );
  else
    return new;
  end if;

  insert into public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  ) values (
    'new_lead', _source_type, _source_id,
    left(_title, 300),
    left(_body, 4000),
    'attention',
    'new-lead:' || _source_type || ':' || _source_id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'name', _name,
      'company', _company,
      'email', _email,
      'phone', _phone,
      'request', _request,
      'intent', _intent,
      'country', _country,
      'product', _product,
      'quantity', _quantity,
      'source_page', _source_page,
      'buyer_type', _buyer_type,
      'utm_source', _utm_source,
      'utm_medium', _utm_medium,
      'utm_campaign', _utm_campaign,
      'inquiry_ref', _inquiry_ref,
      'inquiry_items', _items,
      'created_at', _created_at
    ))
  )
  on conflict (dedupe_key) do update
  set title = excluded.title,
      body = excluded.body,
      metadata = excluded.metadata,
      severity = 'attention',
      status = 'unread',
      read_at = null,
      archived_at = null,
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
  _buyer_label text;
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
    _buyer_label := coalesce(nullif(btrim(_visitor_name), ''), nullif(btrim(_visitor_company), ''), nullif(btrim(_visitor_country), ''), 'Website visitor');

    _notification_body := concat_ws(
      E'\n',
      'Live Chat Message',
      'Buyer: ' || coalesce(nullif(btrim(_visitor_name), ''), 'Not supplied'),
      'Company: ' || coalesce(nullif(btrim(_visitor_company), ''), 'Not supplied'),
      'Country: ' || coalesce(nullif(btrim(_location), ''), 'Not supplied'),
      'WhatsApp: ' || coalesce(nullif(btrim(_visitor_whatsapp), ''), 'Not supplied'),
      'Email: ' || coalesce(nullif(btrim(_visitor_email), ''), 'Not supplied'),
      case when nullif(btrim(_entry_path), '') is not null then 'Entry page: ' || left(btrim(_entry_path), 1000) end,
      'Session: ' || new.session_id,
      'Time: ' || new.created_at::text,
      E'\nNew message:\n' || left(new.message, 2000),
      case when nullif(btrim(_visitor_requirement), '') is not null then E'\nRequirement:\n' || left(btrim(_visitor_requirement), 1000) end
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
      left('Live Chat Message — ' || _buyer_label, 300),
      left(_notification_body, 4000),
      'attention',
      'unread',
      'live_chat:' || new.session_id,
      jsonb_strip_nulls(jsonb_build_object(
        'session_id', new.session_id,
        'channel', 'human_live_chat',
        'event', 'message',
        'message_id', new.id,
        'name', _visitor_name,
        'company', _visitor_company,
        'email', _visitor_email,
        'whatsapp', _visitor_whatsapp,
        'requirement', _visitor_requirement,
        'entry_path', _entry_path,
        'country_code', _visitor_country_code,
        'country', _visitor_country,
        'region', _visitor_region,
        'city', _visitor_city
      )),
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
  _email_subject text;
  _email_body text;
  _chat_name text;
  _chat_company text;
  _chat_email text;
  _chat_whatsapp text;
  _chat_requirement text;
  _chat_country text;
  _chat_entry_path text;
begin
  if new.status <> 'unread' then return new; end if;

  if new.metadata->>'channel' = 'human_live_chat' then
    _kind := 'live_chat';
    _session_id := nullif(btrim(new.metadata->>'session_id'), '');
    _event_id := coalesce(
      nullif(btrim(new.metadata->>'message_id'), ''),
      nullif(btrim(new.metadata->>'presence_event_id'), ''),
      extract(epoch from new.updated_at)::bigint::text
    );
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
        entry_path
      into
        _chat_name,
        _chat_company,
        _chat_email,
        _chat_whatsapp,
        _chat_requirement,
        _chat_country,
        _chat_entry_path
      from public.chat_sessions
      where session_id = _session_id;
    end if;

    if new.metadata->>'event' = 'presence' then
      _email_subject := 'Live Chat Opened — ' || coalesce(
        nullif(concat_ws(' / ', nullif(btrim(_chat_country), ''), nullif(btrim(_chat_name), '')), ''),
        nullif(btrim(new.metadata->>'country'), ''),
        'Website visitor'
      );
      _email_body := concat_ws(
        E'\n',
        'Live Chat Opened',
        'Buyer: ' || coalesce(nullif(btrim(_chat_name), ''), 'Not supplied'),
        'Company: ' || coalesce(nullif(btrim(_chat_company), ''), 'Not supplied'),
        'Country: ' || coalesce(nullif(btrim(_chat_country), ''), nullif(btrim(new.metadata->>'country'), ''), 'Not supplied'),
        'WhatsApp: ' || coalesce(nullif(btrim(_chat_whatsapp), ''), 'Not supplied'),
        'Email: ' || coalesce(nullif(btrim(_chat_email), ''), 'Not supplied'),
        case when coalesce(nullif(btrim(_chat_entry_path), ''), nullif(btrim(new.metadata->>'entry_path'), '')) is not null
          then 'Entry page: ' || left(coalesce(nullif(btrim(_chat_entry_path), ''), nullif(btrim(new.metadata->>'entry_path'), '')), 1000) end,
        'Session: ' || coalesce(_session_id, 'Unavailable'),
        'Time: ' || new.created_at::text,
        case when nullif(btrim(_chat_requirement), '') is not null then E'\nRequirement:\n' || left(btrim(_chat_requirement), 1000) end
      );
    else
      _email_subject := new.title;
      _email_body := new.body;
    end if;
  elsif new.notification_type = 'new_lead' and new.source_type in ('inquiry', 'catalogue') then
    _kind := new.source_type;
    _event_id := coalesce(new.source_id::text, new.id::text);
    _event_key := 'new-lead:' || new.source_type || ':' || _event_id;
    _url := '/admin';
    _email_subject := new.title;
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
      'template','owner_alert','subject',left(_email_subject,300),'title',new.title,
      'body',left(_email_body,4000),'url','https://irhaapparels.com'||_url,'kind',_kind,
      'notification_id',new.id,'source_type',new.source_type,'source_id',new.source_id
    )) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end;
$function$;
