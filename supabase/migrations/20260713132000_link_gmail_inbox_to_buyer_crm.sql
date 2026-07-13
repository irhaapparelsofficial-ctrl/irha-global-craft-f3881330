-- Connect meaningful Gmail inbox items to the Buyer CRM.
-- Exact email matches are linked automatically.
-- New buyer records can be created only through the admin-guarded promotion RPC.
-- No email is sent or modified by this migration.

begin;

create or replace function public.gmail_match_inbox_item_to_lead()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_match_count integer;
  v_lead_id uuid;
begin
  if new.linked_lead_id is null and nullif(btrim(new.sender_email), '') is not null then
    select count(*)::integer, (array_agg(id order by updated_at desc))[1]
      into v_match_count, v_lead_id
    from public.b2b_leads
    where lower(btrim(email)) = lower(btrim(new.sender_email));

    if v_match_count = 1 then
      new.linked_lead_id := v_lead_id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.gmail_match_inbox_item_to_lead() from public, anon, authenticated;

drop trigger if exists gmail_match_inbox_item_to_lead_trigger on public.gmail_inbox_items;
create trigger gmail_match_inbox_item_to_lead_trigger
before insert or update of sender_email, linked_lead_id
on public.gmail_inbox_items
for each row
execute function public.gmail_match_inbox_item_to_lead();

create or replace function public.gmail_sync_linked_lead_reply()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.linked_lead_id is not null and new.category = 'buyer' then
    update public.b2b_leads
    set
      last_gmail_thread_id = case
        when new.received_at >= coalesce(last_reply_at, '-infinity'::timestamptz)
          then coalesce(new.gmail_thread_id, last_gmail_thread_id)
        else last_gmail_thread_id
      end,
      last_reply_at = greatest(coalesce(last_reply_at, '-infinity'::timestamptz), new.received_at),
      last_outreach_status = case
        when new.received_at >= coalesce(last_reply_at, '-infinity'::timestamptz)
          then 'replied'
        else last_outreach_status
      end,
      updated_at = now()
    where id = new.linked_lead_id;
  end if;

  return new;
end;
$$;

revoke all on function public.gmail_sync_linked_lead_reply() from public, anon, authenticated;

drop trigger if exists gmail_sync_linked_lead_reply_trigger on public.gmail_inbox_items;
create trigger gmail_sync_linked_lead_reply_trigger
after insert or update of linked_lead_id, gmail_thread_id, received_at, category
on public.gmail_inbox_items
for each row
execute function public.gmail_sync_linked_lead_reply();

create or replace function public.gmail_promote_inbox_item_to_lead(
  _gmail_item_id uuid,
  _company_name text,
  _country text,
  _buyer_type text default null,
  _priority text default 'normal'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item public.gmail_inbox_items%rowtype;
  v_existing_id uuid;
  v_existing_count integer;
  v_lead_id uuid;
  v_created boolean := false;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if nullif(btrim(_company_name), '') is null then
    raise exception 'Company name is required';
  end if;

  if nullif(btrim(_country), '') is null then
    raise exception 'Country is required';
  end if;

  if _priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;

  select * into v_item
  from public.gmail_inbox_items
  where id = _gmail_item_id
  for update;

  if not found then
    raise exception 'Gmail inbox item not found';
  end if;

  if v_item.linked_lead_id is not null then
    return jsonb_build_object('lead_id', v_item.linked_lead_id, 'created', false, 'linked', true);
  end if;

  if nullif(btrim(v_item.sender_email), '') is null then
    raise exception 'Sender email is required to create a buyer record';
  end if;

  select count(*)::integer, (array_agg(id order by updated_at desc))[1]
    into v_existing_count, v_existing_id
  from public.b2b_leads
  where lower(btrim(email)) = lower(btrim(v_item.sender_email));

  if v_existing_count = 1 then
    v_lead_id := v_existing_id;
  elsif v_existing_count > 1 then
    raise exception 'Multiple buyer records use this email; merge duplicates first';
  else
    insert into public.b2b_leads (
      company_name,
      country,
      email,
      buyer_type,
      lead_status,
      crm_status,
      priority,
      notes,
      source_url,
      source_provider,
      verification_evidence,
      last_gmail_thread_id,
      last_reply_at,
      last_outreach_status
    ) values (
      btrim(_company_name),
      btrim(_country),
      lower(btrim(v_item.sender_email)),
      nullif(btrim(_buyer_type), ''),
      'Replied'::public.lead_status,
      'replied',
      _priority,
      nullif(concat_ws(E'\n\n', v_item.subject, v_item.summary_roman_urdu), ''),
      v_item.gmail_url,
      'gmail',
      jsonb_build_object(
        'source', 'gmail_correspondence',
        'gmail_message_id', v_item.gmail_message_id,
        'gmail_thread_id', v_item.gmail_thread_id,
        'received_at', v_item.received_at
      ),
      v_item.gmail_thread_id,
      v_item.received_at,
      'replied'
    )
    returning id into v_lead_id;

    v_created := true;
  end if;

  update public.gmail_inbox_items
  set linked_lead_id = v_lead_id,
      category = 'buyer',
      updated_at = now()
  where id = v_item.id;

  return jsonb_build_object('lead_id', v_lead_id, 'created', v_created, 'linked', true);
end;
$$;

revoke all on function public.gmail_promote_inbox_item_to_lead(uuid, text, text, text, text) from public, anon;
grant execute on function public.gmail_promote_inbox_item_to_lead(uuid, text, text, text, text) to authenticated, service_role;

commit;
