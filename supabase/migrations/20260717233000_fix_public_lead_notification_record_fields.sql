-- Shared trigger functions must never reference relation-specific NEW fields
-- outside the matching TG_TABLE_NAME branch. PostgreSQL resolves NEW fields
-- against the active trigger relation before CASE can short-circuit.

begin;

create or replace function public.crm_new_public_lead_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _source_type text;
  _source_id uuid;
  _name text;
  _email text;
  _company text;
  _inquiry_ref text;
  _created_at timestamptz;
  _request text;
  _country text;
  _body text;
  _items jsonb := '[]'::jsonb;
  _item_summary text;
begin
  if tg_table_name = 'inquiries' then
    _source_type := 'inquiry';
    _source_id := new.id;
    _name := nullif(btrim(new.name), '');
    _email := nullif(btrim(new.email), '');
    _company := nullif(btrim(new.company), '');
    _inquiry_ref := nullif(btrim(new.inquiry_ref), '');
    _created_at := new.created_at;
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
    ) into _item_summary
    from jsonb_array_elements(_items) with ordinality as source(item, row_number);

    _body := concat_ws(
      E'\n',
      'Inquiry ID: ' || coalesce(_inquiry_ref, _source_id::text),
      'Company: ' || coalesce(_company, 'Not supplied'),
      'Contact: ' || coalesce(_name, 'Not supplied'),
      'Email: ' || coalesce(_email, 'Not supplied'),
      'Phone / WhatsApp: ' || coalesce(nullif(btrim(new.phone), ''), 'Not supplied'),
      'Country: ' || coalesce(_country, 'Not supplied'),
      'Request: ' || _request,
      'Summary: ' || coalesce(nullif(btrim(new.quantity), ''), 'Not supplied'),
      case when _item_summary is not null then E'\nRequested styles:\n' || _item_summary else null end,
      case when nullif(btrim(new.message), '') is not null then E'\nBuyer notes:\n' || left(btrim(new.message), 2500) else null end
    );
  elsif tg_table_name = 'catalogue_leads' then
    _source_type := 'catalogue';
    _source_id := new.id;
    _name := nullif(btrim(new.name), '');
    _email := nullif(btrim(new.email), '');
    _company := nullif(btrim(new.company_name), '');
    _inquiry_ref := null;
    _created_at := new.created_at;
    _request := coalesce(nullif(btrim(new.category_interest), ''), 'Catalogue request');
    _country := nullif(btrim(new.country), '');
    _items := '[]'::jsonb;

    _body := concat_ws(
      E'\n',
      'Company: ' || coalesce(_company, 'Not supplied'),
      'Contact: ' || coalesce(_name, 'Not supplied'),
      'Email: ' || coalesce(_email, 'Not supplied'),
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
    _source_id,
    'New ' || case when _source_type = 'inquiry' then 'buyer RFQ' else 'catalogue request' end,
    left(_body, 4000),
    'attention',
    'new-lead:' || _source_type || ':' || _source_id::text,
    jsonb_build_object(
      'name', _name,
      'company', _company,
      'email', _email,
      'request', _request,
      'country', _country,
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
$$;

revoke all on function public.crm_new_public_lead_notification() from public, anon, authenticated;
grant execute on function public.crm_new_public_lead_notification() to service_role;

commit;
