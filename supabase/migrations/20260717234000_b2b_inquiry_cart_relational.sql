begin;

-- Global B2B RFQ data model. Public callers still enter through the rate-limited
-- public-lead-gateway Edge Function; direct browser writes remain unavailable.
create sequence if not exists public.irha_inquiry_reference_seq;

create or replace function public.next_irha_inquiry_ref()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'IRHA-' || to_char(current_date, 'YYYY') || '-' ||
         lpad(nextval('public.irha_inquiry_reference_seq')::text, 6, '0')
$$;

revoke all on function public.next_irha_inquiry_ref() from public, anon, authenticated;
grant execute on function public.next_irha_inquiry_ref() to service_role;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  company_name text not null,
  contact_name text,
  official_email text not null unique,
  company_size text check (
    company_size is null or company_size in ('1-10', '11-50', '51-200', '201-500', '501+')
  ),
  country text,
  website text,
  phone text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (official_email = lower(btrim(official_email))),
  check (char_length(btrim(company_name)) between 2 and 160)
);

create index if not exists profiles_country_idx on public.profiles(country);
create index if not exists profiles_company_name_idx on public.profiles(lower(company_name));

alter table public.profiles enable row level security;
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
  on public.profiles
  for all
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')))
  with check ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.profiles from anon;
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

alter table public.inquiries
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists tech_pack_paths text[] not null default '{}'::text[];

alter table public.inquiries
  alter column inquiry_ref set default public.next_irha_inquiry_ref();

create unique index if not exists inquiries_inquiry_ref_unique_idx
  on public.inquiries(inquiry_ref)
  where inquiry_ref is not null;

create index if not exists inquiries_profile_created_idx
  on public.inquiries(profile_id, created_at desc);

create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  category_slug text,
  target_quantity integer not null check (target_quantity > 0 and target_quantity <= 10000000),
  size_breakdown text,
  buyer_notes text,
  created_at timestamptz not null default now(),
  check (char_length(btrim(product_slug)) between 1 and 180),
  check (char_length(btrim(product_name)) between 1 and 240)
);

create index if not exists inquiry_items_inquiry_idx
  on public.inquiry_items(inquiry_id, created_at);
create index if not exists inquiry_items_product_idx
  on public.inquiry_items(product_id)
  where product_id is not null;

alter table public.inquiry_items enable row level security;
drop policy if exists inquiry_items_admin_all on public.inquiry_items;
create policy inquiry_items_admin_all
  on public.inquiry_items
  for all
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')))
  with check ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.inquiry_items from anon;
grant select, insert, update, delete on table public.inquiry_items to authenticated;
grant all on table public.inquiry_items to service_role;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- Accept the new corporate reference format while retaining legacy IRQ references.
create or replace function public.validate_public_inquiry_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip text;
  v_ua text;
  v_fingerprint text;
begin
  new.name := btrim(regexp_replace(coalesce(new.name, ''), '[[:cntrl:]]', ' ', 'g'));
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone := nullif(btrim(coalesce(new.phone, '')), '');
  new.company := nullif(btrim(coalesce(new.company, '')), '');
  new.country := nullif(btrim(coalesce(new.country, '')), '');
  new.message := nullif(left(coalesce(new.message, ''), 12000), '');
  new.source := nullif(left(btrim(coalesce(new.source, '')), 240), '');

  if char_length(new.name) < 2 or char_length(new.name) > 100 then
    raise exception 'invalid_name';
  end if;
  if new.email is null and new.phone is null then
    raise exception 'contact_required';
  end if;
  if new.email is not null and new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email';
  end if;

  if new.inquiry_ref is null
     or new.inquiry_ref !~ '^(IRHA-[0-9]{4}-[0-9]{6}|IRQ-[A-Z0-9-]{6,70})$' then
    new.inquiry_ref := public.next_irha_inquiry_ref();
  end if;

  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;

  v_ip := coalesce(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    split_part(coalesce(v_headers->>'x-forwarded-for', 'unknown'), ',', 1),
    'unknown'
  );
  v_ua := left(coalesce(v_headers->>'user-agent', 'unknown'), 300);
  v_fingerprint := md5(v_ip || '|' || v_ua);
  if not public.consume_public_submission_limit(v_fingerprint, 'submit_inquiry', 900, 6) then
    raise exception 'rate_limit_exceeded';
  end if;
  return new;
end;
$$;

create or replace function public.submit_b2b_inquiry(_payload jsonb)
returns table(inquiry_id uuid, inquiry_ref text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _name text;
  _email text;
  _company text;
  _country text;
  _phone text;
  _company_size text;
  _profile_id uuid;
  _inquiry_id uuid;
  _existing_id uuid;
  _reference text;
  _item jsonb;
  _items jsonb := '[]'::jsonb;
  _files jsonb := '[]'::jsonb;
  _lead_context jsonb := '{}'::jsonb;
  _quantity integer;
  _product_id uuid;
  _requested_product_id uuid;
  _path text;
  _paths text[] := '{}'::text[];
  _file_size bigint;
begin
  if jsonb_typeof(_payload) <> 'object' then
    raise exception 'invalid_payload';
  end if;

  _name := btrim(coalesce(_payload->>'name', ''));
  _email := lower(btrim(coalesce(_payload->>'email', '')));
  _company := btrim(coalesce(_payload->>'company', ''));
  _country := btrim(coalesce(_payload->>'country', ''));
  _phone := nullif(btrim(coalesce(_payload->>'phone', _payload->>'whatsapp', '')), '');
  _company_size := nullif(btrim(coalesce(_payload->>'company_size', '')), '');

  if char_length(_name) < 2 or char_length(_name) > 100 then
    raise exception 'invalid_name';
  end if;
  if char_length(_company) < 2 or char_length(_company) > 160 then
    raise exception 'invalid_company';
  end if;
  if char_length(_country) < 2 or char_length(_country) > 80 then
    raise exception 'invalid_country';
  end if;
  if _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email';
  end if;
  if _company_size is not null
     and _company_size not in ('1-10', '11-50', '51-200', '201-500', '501+') then
    raise exception 'invalid_company_size';
  end if;

  if jsonb_typeof(coalesce(_payload->'items', '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_items';
  end if;
  if jsonb_array_length(coalesce(_payload->'items', '[]'::jsonb)) > 50 then
    raise exception 'too_many_items';
  end if;

  for _item in
    select value from jsonb_array_elements(coalesce(_payload->'items', '[]'::jsonb))
  loop
    if jsonb_typeof(_item) <> 'object' then
      continue;
    end if;
    if btrim(coalesce(_item->>'slug', '')) = ''
       or btrim(coalesce(_item->>'name', '')) = '' then
      continue;
    end if;
    if coalesce(_item->>'target_quantity', '') !~ '^[0-9]{1,8}$' then
      raise exception 'invalid_item_quantity';
    end if;
    _quantity := (_item->>'target_quantity')::integer;
    if _quantity < 1 or _quantity > 10000000 then
      raise exception 'invalid_item_quantity';
    end if;

    _items := _items || jsonb_build_array(jsonb_build_object(
      'product_id', case
        when coalesce(_item->>'product_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then _item->>'product_id'
        else null
      end,
      'slug', left(btrim(_item->>'slug'), 180),
      'name', left(btrim(_item->>'name'), 240),
      'category_slug', nullif(left(btrim(coalesce(_item->>'category_slug', '')), 180), ''),
      'target_quantity', _quantity,
      'size_breakdown', nullif(left(btrim(coalesce(_item->>'size_breakdown', '')), 1000), ''),
      'notes', nullif(left(btrim(coalesce(_item->>'notes', '')), 2000), '')
    ));
  end loop;

  if jsonb_array_length(_items) < 1 then
    raise exception 'inquiry_item_required';
  end if;

  if jsonb_typeof(coalesce(_payload->'files', '[]'::jsonb)) = 'array' then
    for _item in
      select value from jsonb_array_elements(coalesce(_payload->'files', '[]'::jsonb))
      limit 5
    loop
      _path := btrim(coalesce(_item->>'path', ''));
      _file_size := case
        when coalesce(_item->>'size', '') ~ '^[0-9]{1,12}$' then (_item->>'size')::bigint
        else 0
      end;
      if _path ~ '^requests/tech-pack/[0-9]{4}-[0-9]{2}/[0-9a-f-]{36}\.(pdf|ai|eps|zip|png|jpg|jpeg)$'
         and _file_size between 1 and 26214400 then
        _paths := array_append(_paths, _path);
        _files := _files || jsonb_build_array(jsonb_build_object(
          'path', _path,
          'name', left(btrim(coalesce(_item->>'name', 'file')), 240),
          'size', _file_size,
          'mime', left(btrim(coalesce(_item->>'mime', '')), 120)
        ));
      end if;
    end loop;
  end if;

  _reference := case
    when coalesce(_payload->>'inquiry_ref', '') ~ '^IRHA-[0-9]{4}-[0-9]{6}$'
      then _payload->>'inquiry_ref'
    else public.next_irha_inquiry_ref()
  end;

  select i.id into _existing_id
  from public.inquiries i
  where i.inquiry_ref = _reference
  limit 1;

  if _existing_id is not null then
    return query select _existing_id, _reference;
    return;
  end if;

  insert into public.profiles (
    company_name, contact_name, official_email, company_size, country, website, phone, metadata
  ) values (
    _company,
    _name,
    _email,
    _company_size,
    _country,
    nullif(left(btrim(coalesce(_payload->>'website', '')), 500), ''),
    _phone,
    jsonb_build_object('last_public_inquiry_at', now())
  )
  on conflict (official_email) do update
  set company_name = excluded.company_name,
      contact_name = excluded.contact_name,
      company_size = coalesce(excluded.company_size, public.profiles.company_size),
      country = excluded.country,
      website = coalesce(excluded.website, public.profiles.website),
      phone = coalesce(excluded.phone, public.profiles.phone),
      metadata = public.profiles.metadata || excluded.metadata,
      updated_at = now()
  returning id into _profile_id;

  _lead_context := case
    when jsonb_typeof(_payload->'lead_context') = 'object' then _payload->'lead_context'
    else '{}'::jsonb
  end;
  _lead_context := _lead_context || jsonb_build_object(
    'inquiry_items', _items,
    'uploaded_files', _files,
    'relational_submission', true,
    'profile_id', _profile_id
  );

  insert into public.inquiries (
    profile_id,
    name,
    email,
    company,
    country,
    phone,
    category,
    quantity,
    message,
    source,
    intent,
    lead_context,
    inquiry_ref,
    tech_pack_paths
  ) values (
    _profile_id,
    _name,
    _email,
    _company,
    _country,
    _phone,
    nullif(left(btrim(coalesce(_payload->>'category', '')), 180), ''),
    jsonb_array_length(_items)::text || ' styles',
    nullif(left(coalesce(_payload->>'message', ''), 12000), ''),
    left(coalesce(nullif(btrim(_payload->>'source'), ''), 'inquiry-cart'), 240),
    'rfq',
    _lead_context,
    _reference,
    _paths
  )
  returning id, public.inquiries.inquiry_ref into _inquiry_id, _reference;

  for _item in select value from jsonb_array_elements(_items)
  loop
    _product_id := null;
    _requested_product_id := null;

    if coalesce(_item->>'product_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      _requested_product_id := (_item->>'product_id')::uuid;
      select p.id into _product_id
      from public.products p
      where p.id = _requested_product_id
      limit 1;
    end if;

    if _product_id is null then
      select p.id into _product_id
      from public.products p
      where p.slug = _item->>'slug'
      order by p.created_at asc nulls last
      limit 1;
    end if;

    insert into public.inquiry_items (
      inquiry_id,
      product_id,
      product_slug,
      product_name,
      category_slug,
      target_quantity,
      size_breakdown,
      buyer_notes
    ) values (
      _inquiry_id,
      _product_id,
      _item->>'slug',
      _item->>'name',
      nullif(_item->>'category_slug', ''),
      (_item->>'target_quantity')::integer,
      nullif(_item->>'size_breakdown', ''),
      nullif(_item->>'notes', '')
    );
  end loop;

  return query select _inquiry_id, _reference;
end;
$$;

revoke all on function public.submit_b2b_inquiry(jsonb) from public, anon, authenticated;
grant execute on function public.submit_b2b_inquiry(jsonb) to service_role;

-- Private, signed-upload-only storage for buyer tech packs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tech_packs',
  'tech_packs',
  false,
  26214400,
  array[
    'application/pdf',
    'application/postscript',
    'application/illustrator',
    'application/vnd.adobe.illustrator',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  external_id text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) in ('object', 'array')),
  signature_valid boolean not null default false,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists webhook_events_provider_external_unique_idx
  on public.webhook_events(provider, external_id)
  where external_id is not null;
create index if not exists webhook_events_provider_created_idx
  on public.webhook_events(provider, created_at desc);

alter table public.webhook_events enable row level security;
drop policy if exists webhook_events_admin_read on public.webhook_events;
create policy webhook_events_admin_read
  on public.webhook_events
  for select
  to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on table public.webhook_events from anon;
grant select on table public.webhook_events to authenticated;
grant all on table public.webhook_events to service_role;

-- Detailed admin alert payload for new inquiry and catalogue records.
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
  _reference text;
  _body text;
  _item_summary text;
begin
  if tg_table_name = 'inquiries' then
    _source_type := 'inquiry';
    _display := coalesce(nullif(btrim(new.company), ''), nullif(btrim(new.name), ''), 'New buyer');
    _request := coalesce(nullif(btrim(new.category), ''), nullif(btrim(new.intent), ''), 'General inquiry');
    _country := nullif(btrim(new.country), '');
    _reference := coalesce(nullif(btrim(new.inquiry_ref), ''), new.id::text);

    select string_agg(
      coalesce(value->>'name', value->>'slug', 'Product') || ' × ' || coalesce(value->>'target_quantity', '—') ||
      case when nullif(value->>'size_breakdown', '') is not null then ' · ' || value->>'size_breakdown' else '' end,
      E'\n'
    ) into _item_summary
    from jsonb_array_elements(
      case when jsonb_typeof(new.lead_context->'inquiry_items') = 'array'
        then new.lead_context->'inquiry_items'
        else '[]'::jsonb
      end
    );

    _body := concat_ws(E'\n',
      'Reference: ' || _reference,
      'Company: ' || coalesce(new.company, '—'),
      'Contact: ' || coalesce(new.name, '—'),
      'Email: ' || coalesce(new.email, '—'),
      'Phone: ' || coalesce(new.phone, '—'),
      'Country: ' || coalesce(new.country, '—'),
      'Request: ' || _request,
      'Quantity: ' || coalesce(new.quantity, '—'),
      case when _item_summary is not null then E'Items:\n' || _item_summary else null end,
      case when cardinality(coalesce(new.tech_pack_paths, '{}'::text[])) > 0
        then 'Tech packs: ' || cardinality(new.tech_pack_paths)::text
        else null
      end,
      case when nullif(btrim(coalesce(new.message, '')), '') is not null then E'Notes:\n' || left(new.message, 3000) else null end
    );
  elsif tg_table_name = 'catalogue_leads' then
    _source_type := 'catalogue';
    _display := coalesce(nullif(btrim(new.company_name), ''), nullif(btrim(new.name), ''), 'New catalogue buyer');
    _request := coalesce(nullif(btrim(new.category_interest), ''), 'Catalogue request');
    _country := nullif(btrim(new.country), '');
    _reference := new.id::text;
    _body := concat_ws(E'\n',
      'Reference: ' || _reference,
      'Company: ' || coalesce(new.company_name, '—'),
      'Contact: ' || coalesce(new.name, '—'),
      'Email: ' || coalesce(new.email, '—'),
      'Phone: ' || coalesce(new.whatsapp, '—'),
      'Country: ' || coalesce(new.country, '—'),
      'Request: ' || _request,
      case when nullif(btrim(coalesce(new.message, '')), '') is not null then E'Notes:\n' || left(new.message, 3000) else null end
    );
  else
    return new;
  end if;

  insert into public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  ) values (
    'new_lead',
    _source_type,
    new.id,
    'New ' || case when _source_type = 'inquiry' then 'buyer inquiry · ' || _reference else 'catalogue request' end,
    _body,
    'attention',
    'new-lead:' || _source_type || ':' || new.id::text,
    jsonb_build_object(
      'name', new.name,
      'company', _display,
      'request', _request,
      'country', _country,
      'reference', _reference,
      'created_at', new.created_at
    )
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

-- Re-enable the buyer confirmation explicitly requested for RFQ submissions.
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
  _items := case
    when jsonb_typeof(new.lead_context->'inquiry_items') = 'array'
      then new.lead_context->'inquiry_items'
    else '[]'::jsonb
  end;

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
        'request_type', case when jsonb_array_length(_items) > 0 then 'multi-item manufacturing inquiry' else coalesce(nullif(btrim(new.intent), ''), 'manufacturing inquiry') end,
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

drop trigger if exists inquiries_buyer_confirmation_outbox on public.inquiries;
create trigger inquiries_buyer_confirmation_outbox
after insert on public.inquiries
for each row execute function public.notification_enqueue_buyer_confirmation();

-- Ensure the owner-notification pipeline resolves to the requested mailbox.
create or replace function public.notification_owner_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select lower(u.email)
      from auth.users u
      join public.user_roles r on r.user_id = u.id
      where r.role = 'admin'
        and lower(u.email) = 'irhaapparelsofficial@gmail.com'
      limit 1
    ),
    'irhaapparelsofficial@gmail.com'
  )
$$;

revoke all on function public.notification_owner_email() from public, anon, authenticated;
grant execute on function public.notification_owner_email() to service_role;

commit;
