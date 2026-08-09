-- IRHA GP-2 — accepted-conversion measurement observers.
-- Transactional only: no pg_net/HTTP/cron side effects.

create or replace function public.gp2_measurement_path(p_context jsonb, p_fallback text)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_path text;
begin
  v_path := coalesce(
    p_context #>> '{measurement,current_path}',
    p_context ->> 'source_page',
    p_context ->> 'page',
    p_fallback,
    '/'
  );
  v_path := split_part(split_part(v_path, '?', 1), '#', 1);
  if v_path !~ '^/' then return p_fallback; end if;
  if v_path <> '/' then v_path := regexp_replace(v_path, '/+$', ''); end if;
  return coalesce(nullif(v_path, ''), '/');
end;
$$;

create or replace function public.gp2_safe_dimension(p_value text, p_max integer default 160)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_value text;
begin
  v_value := left(nullif(regexp_replace(coalesce(p_value, ''), '[[:cntrl:]]+', ' ', 'g'), ''), greatest(1, least(coalesce(p_max, 160), 500)));
  if v_value is null then return null; end if;
  if position('@' in v_value) > 0 then return null; end if;
  if v_value ~ '(\+?[0-9][0-9 .()\-]{6,}[0-9])' then return null; end if;
  return nullif(btrim(regexp_replace(v_value, '[[:space:]]+', ' ', 'g')), '');
end;
$$;

revoke all on function public.gp2_measurement_path(jsonb,text) from public, anon, authenticated;
revoke all on function public.gp2_safe_dimension(text,integer) from public, anon, authenticated;
grant execute on function public.gp2_measurement_path(jsonb,text) to service_role;
grant execute on function public.gp2_safe_dimension(text,integer) to service_role;

create or replace function public.gp2_record_inquiry_measurement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event text;
  v_path text;
  v_landing_path text;
  v_has_items boolean := false;
begin
  begin
    v_has_items := jsonb_typeof(new.lead_context -> 'inquiry_items') = 'array'
      and jsonb_array_length(new.lead_context -> 'inquiry_items') > 0;
  exception when others then
    v_has_items := false;
  end;

  v_event := case
    when lower(coalesce(new.intent, '')) in ('rfq','quote') or lower(coalesce(new.source, '')) like '%quote%' then 'rfq_submit'
    when v_has_items or nullif(trim(coalesce(new.category, '')), '') is not null then 'product_inquiry_submit'
    else 'general_inquiry_submit'
  end;
  v_path := public.gp2_measurement_path(new.lead_context, '/inquiry');
  v_landing_path := split_part(split_part(coalesce(new.lead_context #>> '{measurement,landing_path}', v_path), '?', 1), '#', 1);
  if v_landing_path !~ '^/' then v_landing_path := v_path; end if;
  if v_landing_path <> '/' then v_landing_path := regexp_replace(v_landing_path, '/+$', ''); end if;

  insert into public.commercial_measurement_events (
    event_name, canonical_path, landing_path, source, medium, campaign, content, term,
    lead_kind, lead_reference, evidence
  ) values (
    v_event,
    v_path,
    coalesce(nullif(v_landing_path, ''), v_path),
    public.gp2_safe_dimension(coalesce(new.lead_context #>> '{measurement,source}', new.source), 120),
    public.gp2_safe_dimension(new.lead_context #>> '{measurement,medium}', 80),
    public.gp2_safe_dimension(new.lead_context #>> '{measurement,campaign}', 160),
    public.gp2_safe_dimension(new.lead_context #>> '{measurement,content}', 160),
    public.gp2_safe_dimension(new.lead_context #>> '{measurement,term}', 160),
    'inquiry',
    left(coalesce(new.inquiry_ref, new.id::text), 120),
    jsonb_build_object('measurement_origin','crm_acceptance','pii_included',false)
  );
  return new;
end;
$$;

revoke all on function public.gp2_record_inquiry_measurement() from public, anon, authenticated;

drop trigger if exists trg_gp2_record_inquiry_measurement on public.inquiries;
create trigger trg_gp2_record_inquiry_measurement
after insert on public.inquiries
for each row execute function public.gp2_record_inquiry_measurement();

create or replace function public.gp2_record_catalogue_measurement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.commercial_measurement_events (
    event_name, canonical_path, landing_path, source, medium, campaign,
    lead_kind, lead_reference, evidence
  ) values (
    'general_inquiry_submit',
    '/catalogues',
    '/catalogues',
    public.gp2_safe_dimension(new.utm_source, 120),
    public.gp2_safe_dimension(new.utm_medium, 80),
    public.gp2_safe_dimension(new.utm_campaign, 160),
    'catalogue_request',
    left(new.id::text, 120),
    jsonb_build_object('measurement_origin','crm_acceptance','pii_included',false)
  );
  return new;
end;
$$;

revoke all on function public.gp2_record_catalogue_measurement() from public, anon, authenticated;

drop trigger if exists trg_gp2_record_catalogue_measurement on public.catalogue_leads;
create trigger trg_gp2_record_catalogue_measurement
after insert on public.catalogue_leads
for each row execute function public.gp2_record_catalogue_measurement();

comment on function public.gp2_record_inquiry_measurement() is
  'GP-2 accepted-conversion observer. Inserts only non-PII measurement context after the inquiry row exists.';
