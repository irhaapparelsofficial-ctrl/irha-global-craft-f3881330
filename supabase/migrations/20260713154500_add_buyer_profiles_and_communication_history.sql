-- Canonical buyer profile editing and unified communication history.
-- Admin-only, owner-Supabase backed, and no external messages are sent.

begin;

create or replace function public.crm_normalize_phone(_value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(regexp_replace(coalesce(_value, ''), '[^0-9]', '', 'g'), '');
$$;

revoke all on function public.crm_normalize_phone(text) from public, anon, authenticated;
grant execute on function public.crm_normalize_phone(text) to service_role;

create table if not exists public.crm_buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('inquiry','catalogue','prospect')),
  source_id uuid not null,
  display_name text,
  company_name text,
  country text,
  email text,
  phone text,
  whatsapp text,
  website text,
  buyer_type text,
  product_interest text,
  quantity text,
  address text,
  preferred_language text,
  timezone text,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create table if not exists public.crm_communications (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('inquiry','catalogue','prospect')),
  source_id uuid not null,
  channel text not null check (channel in ('email','whatsapp','phone','video_call','in_person','website','website_chat','other')),
  direction text not null check (direction in ('inbound','outbound','internal')),
  status text not null default 'logged' check (status in ('logged','draft','sent','received','failed','cancelled')),
  subject text,
  summary text not null,
  occurred_at timestamptz not null default now(),
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists crm_buyer_profiles_email_idx on public.crm_buyer_profiles (lower(email)) where email is not null;
create index if not exists crm_buyer_profiles_phone_idx on public.crm_buyer_profiles ((public.crm_normalize_phone(coalesce(whatsapp, phone)))) where coalesce(whatsapp, phone) is not null;
create index if not exists crm_communications_source_time_idx on public.crm_communications (source_type, source_id, occurred_at desc);

alter table public.crm_buyer_profiles enable row level security;
alter table public.crm_communications enable row level security;

drop policy if exists crm_buyer_profiles_admin_all on public.crm_buyer_profiles;
create policy crm_buyer_profiles_admin_all
on public.crm_buyer_profiles
for all
to authenticated
using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

drop policy if exists crm_communications_admin_all on public.crm_communications;
create policy crm_communications_admin_all
on public.crm_communications
for all
to authenticated
using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

revoke all on table public.crm_buyer_profiles from anon;
revoke all on table public.crm_communications from anon;
grant select, insert, update, delete on table public.crm_buyer_profiles to authenticated;
grant select, insert, update, delete on table public.crm_communications to authenticated;
grant all on table public.crm_buyer_profiles to service_role;
grant all on table public.crm_communications to service_role;

drop trigger if exists crm_buyer_profiles_touch_updated_at on public.crm_buyer_profiles;
create trigger crm_buyer_profiles_touch_updated_at
before update on public.crm_buyer_profiles
for each row execute function public.touch_updated_at();

create or replace function public.crm_get_buyer_profile(_source_type text, _source_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _native jsonb;
  _profile public.crm_buyer_profiles%rowtype;
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if not public.crm_source_exists(_source_type, _source_id) then
    raise exception 'Buyer record not found';
  end if;

  if _source_type = 'inquiry' then
    select jsonb_build_object(
      'display_name', name,
      'company_name', company,
      'country', country,
      'email', email,
      'phone', phone,
      'whatsapp', lead_context->>'whatsapp',
      'website', lead_context->>'website',
      'buyer_type', lead_context->>'buyer_type',
      'product_interest', coalesce(lead_context->>'product_name', category),
      'quantity', quantity,
      'address', lead_context->>'address',
      'preferred_language', lead_context->>'preferred_language',
      'timezone', lead_context->>'timezone',
      'linkedin_url', lead_context->>'linkedin_url',
      'instagram_url', lead_context->>'instagram_url',
      'facebook_url', lead_context->>'facebook_url'
    ) into _native
    from public.inquiries where id = _source_id;
  elsif _source_type = 'catalogue' then
    select jsonb_build_object(
      'display_name', name,
      'company_name', company_name,
      'country', country,
      'email', email,
      'phone', null,
      'whatsapp', whatsapp,
      'website', null,
      'buyer_type', null,
      'product_interest', category_interest,
      'quantity', null,
      'address', null,
      'preferred_language', language,
      'timezone', null,
      'linkedin_url', null,
      'instagram_url', null,
      'facebook_url', null
    ) into _native
    from public.catalogue_leads where id = _source_id;
  else
    select jsonb_build_object(
      'display_name', company_name,
      'company_name', company_name,
      'country', country,
      'email', email,
      'phone', phone,
      'whatsapp', whatsapp,
      'website', website,
      'buyer_type', buyer_type,
      'product_interest', apparel_segment,
      'quantity', null,
      'address', verification_evidence->>'address',
      'preferred_language', verification_evidence->>'preferred_language',
      'timezone', verification_evidence->>'timezone',
      'linkedin_url', linkedin_url,
      'instagram_url', instagram_url,
      'facebook_url', facebook_url
    ) into _native
    from public.b2b_leads where id = _source_id;
  end if;

  select * into _profile
  from public.crm_buyer_profiles
  where source_type = _source_type and source_id = _source_id;

  return jsonb_build_object(
    'source_type', _source_type,
    'source_id', _source_id,
    'display_name', coalesce(_profile.display_name, _native->>'display_name'),
    'company_name', coalesce(_profile.company_name, _native->>'company_name'),
    'country', coalesce(_profile.country, _native->>'country'),
    'email', coalesce(_profile.email, _native->>'email'),
    'phone', coalesce(_profile.phone, _native->>'phone'),
    'whatsapp', coalesce(_profile.whatsapp, _native->>'whatsapp'),
    'website', coalesce(_profile.website, _native->>'website'),
    'buyer_type', coalesce(_profile.buyer_type, _native->>'buyer_type'),
    'product_interest', coalesce(_profile.product_interest, _native->>'product_interest'),
    'quantity', coalesce(_profile.quantity, _native->>'quantity'),
    'address', coalesce(_profile.address, _native->>'address'),
    'preferred_language', coalesce(_profile.preferred_language, _native->>'preferred_language'),
    'timezone', coalesce(_profile.timezone, _native->>'timezone'),
    'linkedin_url', coalesce(_profile.linkedin_url, _native->>'linkedin_url'),
    'instagram_url', coalesce(_profile.instagram_url, _native->>'instagram_url'),
    'facebook_url', coalesce(_profile.facebook_url, _native->>'facebook_url'),
    'profile_updated_at', _profile.updated_at
  );
end;
$$;

revoke all on function public.crm_get_buyer_profile(text, uuid) from public, anon;
grant execute on function public.crm_get_buyer_profile(text, uuid) to authenticated, service_role;

create or replace function public.crm_save_buyer_profile(
  _source_type text,
  _source_id uuid,
  _display_name text default null,
  _company_name text default null,
  _country text default null,
  _email text default null,
  _phone text default null,
  _whatsapp text default null,
  _website text default null,
  _buyer_type text default null,
  _product_interest text default null,
  _quantity text default null,
  _address text default null,
  _preferred_language text default null,
  _timezone text default null,
  _linkedin_url text default null,
  _instagram_url text default null,
  _facebook_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _name text := nullif(btrim(coalesce(_display_name, '')), '');
  _company text := nullif(btrim(coalesce(_company_name, '')), '');
  _clean_email text := lower(nullif(btrim(coalesce(_email, '')), ''));
  _clean_website text := nullif(btrim(coalesce(_website, '')), '');
  _clean_linkedin text := nullif(btrim(coalesce(_linkedin_url, '')), '');
  _clean_instagram text := nullif(btrim(coalesce(_instagram_url, '')), '');
  _clean_facebook text := nullif(btrim(coalesce(_facebook_url, '')), '');
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if not public.crm_source_exists(_source_type, _source_id) then
    raise exception 'Buyer record not found';
  end if;

  if _source_type in ('inquiry','catalogue') and _name is null then
    raise exception 'Contact name is required';
  end if;

  if _source_type = 'prospect' and coalesce(_company, _name) is null then
    raise exception 'Company name is required';
  end if;

  if _clean_email is not null and _clean_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email address is not valid';
  end if;

  if _clean_website is not null and _clean_website !~* '^https?://' then raise exception 'Website must start with http:// or https://'; end if;
  if _clean_linkedin is not null and _clean_linkedin !~* '^https?://' then raise exception 'LinkedIn URL must start with http:// or https://'; end if;
  if _clean_instagram is not null and _clean_instagram !~* '^https?://' then raise exception 'Instagram URL must start with http:// or https://'; end if;
  if _clean_facebook is not null and _clean_facebook !~* '^https?://' then raise exception 'Facebook URL must start with http:// or https://'; end if;

  if _source_type = 'inquiry' then
    update public.inquiries
    set name = _name,
        company = _company,
        country = nullif(btrim(coalesce(_country, '')), ''),
        email = _clean_email,
        phone = nullif(btrim(coalesce(_phone, '')), ''),
        category = nullif(btrim(coalesce(_product_interest, '')), ''),
        quantity = nullif(btrim(coalesce(_quantity, '')), ''),
        updated_at = now()
    where id = _source_id;
  elsif _source_type = 'catalogue' then
    update public.catalogue_leads
    set name = _name,
        company_name = _company,
        country = nullif(btrim(coalesce(_country, '')), ''),
        email = _clean_email,
        whatsapp = nullif(btrim(coalesce(_whatsapp, '')), ''),
        category_interest = nullif(btrim(coalesce(_product_interest, '')), ''),
        language = coalesce(nullif(btrim(coalesce(_preferred_language, '')), ''), language),
        updated_at = now()
    where id = _source_id;
  else
    update public.b2b_leads
    set company_name = coalesce(_company, _name),
        country = coalesce(nullif(btrim(coalesce(_country, '')), ''), country),
        email = _clean_email,
        phone = nullif(btrim(coalesce(_phone, '')), ''),
        whatsapp = nullif(btrim(coalesce(_whatsapp, '')), ''),
        website = _clean_website,
        buyer_type = nullif(btrim(coalesce(_buyer_type, '')), ''),
        apparel_segment = nullif(btrim(coalesce(_product_interest, '')), ''),
        linkedin_url = _clean_linkedin,
        instagram_url = _clean_instagram,
        facebook_url = _clean_facebook,
        updated_at = now()
    where id = _source_id;
  end if;

  insert into public.crm_buyer_profiles (
    source_type, source_id, display_name, company_name, country, email, phone, whatsapp, website,
    buyer_type, product_interest, quantity, address, preferred_language, timezone,
    linkedin_url, instagram_url, facebook_url, created_by, updated_by
  ) values (
    _source_type,
    _source_id,
    _name,
    _company,
    nullif(btrim(coalesce(_country, '')), ''),
    _clean_email,
    nullif(btrim(coalesce(_phone, '')), ''),
    nullif(btrim(coalesce(_whatsapp, '')), ''),
    _clean_website,
    nullif(btrim(coalesce(_buyer_type, '')), ''),
    nullif(btrim(coalesce(_product_interest, '')), ''),
    nullif(btrim(coalesce(_quantity, '')), ''),
    nullif(btrim(coalesce(_address, '')), ''),
    nullif(btrim(coalesce(_preferred_language, '')), ''),
    nullif(btrim(coalesce(_timezone, '')), ''),
    _clean_linkedin,
    _clean_instagram,
    _clean_facebook,
    _actor,
    _actor
  )
  on conflict (source_type, source_id) do update set
    display_name = excluded.display_name,
    company_name = excluded.company_name,
    country = excluded.country,
    email = excluded.email,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    website = excluded.website,
    buyer_type = excluded.buyer_type,
    product_interest = excluded.product_interest,
    quantity = excluded.quantity,
    address = excluded.address,
    preferred_language = excluded.preferred_language,
    timezone = excluded.timezone,
    linkedin_url = excluded.linkedin_url,
    instagram_url = excluded.instagram_url,
    facebook_url = excluded.facebook_url,
    updated_by = _actor,
    updated_at = now();

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values (
    _source_type,
    _source_id,
    'record_updated',
    'Buyer profile updated',
    jsonb_build_object('email', _clean_email, 'company_name', _company, 'country', nullif(btrim(coalesce(_country, '')), '')),
    _actor
  );

  return public.crm_get_buyer_profile(_source_type, _source_id);
end;
$$;

revoke all on function public.crm_save_buyer_profile(text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.crm_save_buyer_profile(text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated, service_role;

create or replace function public.crm_log_communication(
  _source_type text,
  _source_id uuid,
  _channel text,
  _direction text,
  _summary text,
  _subject text default null,
  _occurred_at timestamptz default now(),
  _status text default 'logged',
  _external_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _row public.crm_communications%rowtype;
  _clean_summary text := nullif(btrim(coalesce(_summary, '')), '');
  _clean_url text := nullif(btrim(coalesce(_external_url, '')), '');
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  if not public.crm_source_exists(_source_type, _source_id) then raise exception 'Buyer record not found'; end if;
  if _channel not in ('email','whatsapp','phone','video_call','in_person','website','website_chat','other') then raise exception 'Unsupported communication channel'; end if;
  if _direction not in ('inbound','outbound','internal') then raise exception 'Unsupported communication direction'; end if;
  if _status not in ('logged','draft','sent','received','failed','cancelled') then raise exception 'Unsupported communication status'; end if;
  if _clean_summary is null or char_length(_clean_summary) > 5000 then raise exception 'Communication summary is required and must be under 5000 characters'; end if;
  if _clean_url is not null and _clean_url !~* '^https?://' then raise exception 'External link must start with http:// or https://'; end if;

  insert into public.crm_communications (
    source_type, source_id, channel, direction, status, subject, summary, occurred_at, external_url, created_by
  ) values (
    _source_type,
    _source_id,
    _channel,
    _direction,
    _status,
    nullif(btrim(coalesce(_subject, '')), ''),
    _clean_summary,
    coalesce(_occurred_at, now()),
    _clean_url,
    _actor
  ) returning * into _row;

  insert into public.crm_activity_events (source_type, source_id, event_type, summary, metadata, actor_id)
  values (
    _source_type,
    _source_id,
    'record_updated',
    'Communication logged: ' || replace(_channel, '_', ' '),
    jsonb_build_object('communication_id', _row.id, 'channel', _channel, 'direction', _direction, 'occurred_at', _row.occurred_at),
    _actor
  );

  return to_jsonb(_row);
end;
$$;

revoke all on function public.crm_log_communication(text, uuid, text, text, text, text, timestamptz, text, text) from public, anon;
grant execute on function public.crm_log_communication(text, uuid, text, text, text, text, timestamptz, text, text) to authenticated, service_role;

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
  _safe_limit integer := greatest(1, least(coalesce(_limit, 200), 500));
begin
  if _actor is null or not public.has_role(_actor, 'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  _profile := public.crm_get_buyer_profile(_source_type, _source_id);
  _email := lower(nullif(btrim(coalesce(_profile->>'email', '')), ''));
  _phone := public.crm_normalize_phone(coalesce(_profile->>'whatsapp', _profile->>'phone'));

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
        where (
          (_source_type = 'prospect' and g.linked_lead_id = _source_id)
          or (_email is not null and (lower(g.sender_email) = _email or lower(g.recipient_email) = _email))
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
           or (_email is not null and lower(o.recipient_email) = _email)

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
        where _email is not null
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
           or (_phone is not null and public.crm_normalize_phone(coalesce(wc.phone_e164, wc.wa_id)) = _phone)

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

revoke all on function public.crm_get_buyer_communication_history(text, uuid, integer) from public, anon;
grant execute on function public.crm_get_buyer_communication_history(text, uuid, integer) to authenticated, service_role;

commit;
