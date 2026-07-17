begin;

-- Normalize numeric RFQ quantities to strings in the outbox payload so the
-- existing defensive email renderer displays the buyer's exact quantity.
create or replace function public.notification_enqueue_buyer_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _email text;
  _name text;
  _reference text;
  _items jsonb;
begin
  _email := lower(nullif(btrim(new.email), ''));
  _name := coalesce(nullif(btrim(new.name), ''), 'Buyer');
  _reference := coalesce(nullif(btrim(new.inquiry_ref), ''), new.id::text);

  select coalesce(
    jsonb_agg(
      case
        when jsonb_typeof(item) = 'object' and item ? 'target_quantity'
          then jsonb_set(
            item,
            '{target_quantity}',
            to_jsonb(coalesce(item->>'target_quantity', '')),
            true
          )
        else item
      end
      order by ordinal
    ),
    '[]'::jsonb
  )
  into _items
  from jsonb_array_elements(
    case
      when jsonb_typeof(new.lead_context->'inquiry_items') = 'array'
        then new.lead_context->'inquiry_items'
      else '[]'::jsonb
    end
  ) with ordinality as source(item, ordinal);

  if _email is not null then
    insert into public.notification_outbox (
      notification_id, dedupe_key, event_key, channel, recipient, payload
    ) values (
      null,
      'email-buyer:inquiry:' || new.id::text,
      'buyer-confirmation:inquiry:' || new.id::text,
      'email',
      _email,
      jsonb_build_object(
        'template', 'buyer_confirmation',
        'subject', 'We received your Irha Apparels RFQ · ' || _reference,
        'name', _name,
        'company', new.company,
        'reference', _reference,
        'request_type', 'multi-item manufacturing inquiry',
        'category', nullif(btrim(new.category), ''),
        'quantity', nullif(btrim(new.quantity), ''),
        'items', _items,
        'message', left(coalesce(new.message, ''), 4000),
        'reply_to', 'info@irhaapparels.com'
      )
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.notification_enqueue_buyer_confirmation() from public, anon, authenticated;
grant execute on function public.notification_enqueue_buyer_confirmation() to service_role;

commit;
