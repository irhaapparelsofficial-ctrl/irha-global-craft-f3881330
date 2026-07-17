begin;

create or replace function public.crm_new_public_lead_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _source_type text;
  _display text;
  _request text;
  _country text;
  _body text;
  _items jsonb := '[]'::jsonb;
  _item_summary text;
begin
  if tg_table_name = 'inquiries' then
    _source_type := 'inquiry';
    _display := coalesce(nullif(btrim(new.company), ''), nullif(btrim(new.name), ''), 'New buyer');
    _request := coalesce(nullif(btrim(new.category), ''), nullif(btrim(new.intent), ''), 'General inquiry');
    _country := nullif(btrim(new.country), '');
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
    )
    into _item_summary
    from jsonb_array_elements(_items) with ordinality as source(item, row_number);

    _body := concat_ws(
      E'\n',
      'Inquiry ID: ' || coalesce(nullif(btrim(new.inquiry_ref), ''), new.id::text),
      'Company: ' || coalesce(nullif(btrim(new.company), ''), 'Not supplied'),
      'Contact: ' || coalesce(nullif(btrim(new.name), ''), 'Not supplied'),
      'Email: ' || coalesce(nullif(btrim(new.email), ''), 'Not supplied'),
      'Phone / WhatsApp: ' || coalesce(nullif(btrim(new.phone), ''), 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Request: ' || _request,
      'Summary: ' || coalesce(nullif(btrim(new.quantity), ''), 'Not supplied'),
      case when _item_summary is not null then E'\nRequested styles:\n' || _item_summary else null end,
      case when nullif(btrim(new.message), '') is not null then E'\nBuyer notes:\n' || left(btrim(new.message), 2500) else null end
    );
  elsif tg_table_name = 'catalogue_leads' then
    _source_type := 'catalogue';
    _display := coalesce(nullif(btrim(new.company_name), ''), nullif(btrim(new.name), ''), 'New catalogue buyer');
    _request := coalesce(nullif(btrim(new.category_interest), ''), 'Catalogue request');
    _country := nullif(btrim(new.country), '');
    _body := concat_ws(
      E'\n',
      'Company: ' || coalesce(nullif(btrim(new.company_name), ''), 'Not supplied'),
      'Contact: ' || coalesce(nullif(btrim(new.name), ''), 'Not supplied'),
      'Email: ' || coalesce(nullif(btrim(new.email), ''), 'Not supplied'),
      'Phone / WhatsApp: ' || coalesce(nullif(btrim(new.whatsapp), ''), 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Request: ' || _request,
      case when nullif(btrim(new.message), '') is not null then E'\nBuyer notes:\n' || left(btrim(new.message), 2500) else null end
    );
  else
    return new;
  end if;

  insert into public.crm_notifications (
    notification_type,
    source_type,
    source_id,
    title,
    body,
    severity,
    dedupe_key,
    metadata
  ) values (
    'new_lead',
    _source_type,
    new.id,
    'New ' || case when _source_type = 'inquiry' then 'buyer RFQ' else 'catalogue request' end,
    left(_body, 4000),
    'attention',
    'new-lead:' || _source_type || ':' || new.id::text,
    jsonb_build_object(
      'name', new.name,
      'company', case when _source_type = 'inquiry' then new.company else new.company_name end,
      'email', new.email,
      'request', _request,
      'country', _country,
      'inquiry_ref', case when _source_type = 'inquiry' then new.inquiry_ref else null end,
      'inquiry_items', _items,
      'created_at', new.created_at
    )
  )
  on conflict (dedupe_key) do update
  set title = excluded.title,
      body = excluded.body,
      metadata = excluded.metadata,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.crm_new_public_lead_notification() from public, anon, authenticated;
grant execute on function public.crm_new_public_lead_notification() to service_role;

commit;
