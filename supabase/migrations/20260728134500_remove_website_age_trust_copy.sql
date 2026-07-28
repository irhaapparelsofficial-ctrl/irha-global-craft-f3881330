begin;

update public.faqs
set question = 'How can a buyer verify Irha Apparels before making a commitment?',
    answer = 'Buyers can verify the relevant team, exact product and customization scope, program-specific evidence, written quotation and approval path before making a commercial commitment.',
    updated_at = now()
where locale = 'en' and lower(coalesce(answer, '')) like '%website is newly built%';

update public.admin_ai_knowledge
set content = 'Irha Apparels is a B2B custom apparel manufacturer based in Sialkot, Pakistan. Buyer verification should focus on the relevant team, exact program scope, written quotation and program-specific evidence.',
    instructions = jsonb_set(coalesce(instructions, '{}'::jsonb), '{reply_rule}', to_jsonb('Use requirement-led program verification instead of website-age claims whenever trust or company history is discussed.'::text), true),
    updated_at = now()
where knowledge_key = 'company.identity' and lower(concat_ws(' ', content, instructions::text)) like '%newly built%';

update public.admin_ai_knowledge
set content = 'For first-contact and follow-up messaging, use requirement-led OEM, ODM and private-label positioning. Offer an appointment-based live factory call as an optional verification step, subject to availability and viewing scope. Do not use cheap or lowest-price positioning, and do not make website-age claims.',
    updated_at = now()
where knowledge_key = 'outreach.positioning' and lower(concat_ws(' ', content, instructions::text)) like '%newly built%';

update public.ai_business_rules
set rules = jsonb_set(rules, '{company,websiteState}', to_jsonb('Website age is not used as a buyer-trust claim; verification is based on the exact program and written scope.'::text), true),
    updated_at = now()
where id = 'default' and status = 'approved' and lower(rules::text) like '%newly built%';

update public.social_calendar_items
set caption = case when caption is null then null else regexp_replace(caption, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi') end,
    reel_script = case when reel_script is null then null else regexp_replace(reel_script, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi') end,
    carousel_outline = case when carousel_outline is null then null else regexp_replace(carousel_outline::text, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi')::jsonb end,
    creative_brief = case when creative_brief is null then null else regexp_replace(creative_brief::text, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi')::jsonb end,
    updated_at = now()
where status = 'draft' and lower(concat_ws(' ', caption, reel_script, carousel_outline::text, creative_brief::text)) like '%website is newly built%';

update public.seo_localized_pages
set source_summary = case when source_summary is null then null else replace(replace(replace(source_summary, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.') end,
    seo_description = case when seo_description is null then null else replace(replace(replace(seo_description, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.') end,
    intro = case when intro is null then null else replace(replace(replace(intro, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.') end,
    sections = case when sections is null then null else replace(replace(replace(sections::text, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.')::jsonb end,
    faqs = case when faqs is null then null else replace(replace(replace(faqs::text, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.')::jsonb end,
    cta = case when cta is null then null else replace(replace(replace(cta::text, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.')::jsonb end,
    updated_at = now()
where status = 'draft' and locale in ('de-DE', 'de-AT')
  and path in ('/intl/de-DE/products/bavarian-trachten-wear', '/intl/de-AT/products/bavarian-trachten-wear');

CREATE OR REPLACE FUNCTION public.admin_ai_live_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
with
latest_health as (
  select overall_status, components, metrics, blockers, checked_at
  from public.operations_health_snapshots
  order by checked_at desc
  limit 1
),
latest_operation as (
  select action, trigger_source, status, started_at, completed_at, duration_ms, error
  from public.operations_runs
  order by started_at desc
  limit 1
),
latest_campaign as (
  select id, name, market, product_focus, status, discovered_count, verified_count, imported_count, last_run_at, error, created_at
  from public.lead_campaigns
  order by created_at desc
  limit 1
),
lead_candidate_counts as (
  select coalesce(jsonb_object_agg(verification_status, total), '{}'::jsonb) value
  from (select verification_status, count(*) total from public.lead_candidates group by verification_status) x
),
lead_campaign_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.lead_campaigns group by status) x
),
outreach_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.outreach_messages group by status) x
),
social_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.social_calendar_items group by status) x
),
seo_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.seo_localized_pages group by status) x
),
production_counts as (
  select coalesce(jsonb_object_agg(stage, total), '{}'::jsonb) value
  from (select stage, count(*) total from public.production_jobs group by stage) x
),
quotation_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.crm_quotations group by status) x
),
sample_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.crm_samples group by status) x
),
cms_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (select status, count(*) total from public.cms_documents group by status) x
),
social_accounts as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'platform', platform,
    'display_name', display_name,
    'enabled', enabled,
    'verification_status', verification_status,
    'capabilities', capabilities,
    'last_verified_at', last_verified_at,
    'connection_note', connection_note
  ) order by platform), '[]'::jsonb) value
  from public.social_platform_accounts
),
recent_operations as (
  select coalesce(jsonb_agg(to_jsonb(x) order by started_at desc), '[]'::jsonb) value
  from (
    select action, status, trigger_source, started_at, completed_at, duration_ms, error
    from public.operations_runs
    order by started_at desc
    limit 8
  ) x
),
rules as (
  select version, status, approved_at
  from public.ai_business_rules
  where id = 'default'
),
control as (
  select id, enabled, timezone, heartbeat_interval_minutes, stale_run_minutes,
         email_queue_enabled, email_provider_ready, lead_discovery_enabled,
         social_drafts_enabled, public_smoke_tests_enabled, last_heartbeat_at,
         last_daily_run_at, last_email_run_at, last_success_at, last_error
  from public.operations_control where id = 'default'
)
select jsonb_build_object(
  'checked_at', now(),
  'timezone', coalesce((select timezone from control), 'Asia/Karachi'),
  'source_policy', 'Live aggregate database evidence only; no buyer PII.',
  'company', jsonb_build_object(
    'legal_name', 'Irha Apparels',
    'location', 'Sialkot, Pakistan',
    'business_model', 'B2B custom apparel manufacturing, OEM and private label',
    'website_state', 'Requirement-led B2B manufacturer; buyer verification through exact program scope',
    'business_rules_version', (select version from rules),
    'business_rules_status', (select status from rules),
    'business_rules_approved_at', (select approved_at from rules)
  ),
  'catalogue', jsonb_build_object(
    'published_products', (select count(*) from public.products where is_published),
    'draft_products', (select count(*) from public.products where not is_published),
    'published_categories', (select count(*) from public.categories where is_published),
    'media_assets', (select count(*) from public.media_assets),
    'verified_media_assets', (select count(*) from public.media_assets where verification_status = 'verified'),
    'social_approved_media_assets', (select count(*) from public.media_assets where social_approved)
  ),
  'crm', jsonb_build_object(
    'total_buyer_records', (select count(*) from public.b2b_leads) + (select count(*) from public.catalogue_leads) + (select count(*) from public.inquiries),
    'b2b_leads', (select count(*) from public.b2b_leads),
    'catalogue_leads', (select count(*) from public.catalogue_leads),
    'inquiries', (select count(*) from public.inquiries),
    'high_priority_b2b_leads', (select count(*) from public.b2b_leads where priority = 'high'),
    'open_tasks', (select count(*) from public.crm_tasks where status in ('open','pending','in_progress')),
    'overdue_tasks', (select count(*) from public.crm_tasks where status in ('open','pending','in_progress') and due_at < now()),
    'overdue_followups',
      (select count(*) from public.b2b_leads where follow_up_at < now() and coalesce(crm_status,'') not in ('won','lost','closed')) +
      (select count(*) from public.catalogue_leads where follow_up_at < now() and coalesce(status,'') not in ('won','lost','closed')) +
      (select count(*) from public.inquiries where follow_up_at < now() and coalesce(status,'') not in ('won','lost','closed')),
    'quotation_statuses', (select value from quotation_counts),
    'sample_statuses', (select value from sample_counts)
  ),
  'lead_engine', jsonb_build_object(
    'campaign_statuses', (select value from lead_campaign_counts),
    'candidate_statuses', (select value from lead_candidate_counts),
    'latest_campaign', (select to_jsonb(latest_campaign) from latest_campaign),
    'automatic_crm_import', false,
    'automatic_outreach', false,
    'external_credits_used_by_scheduled_worker', 0
  ),
  'outreach', jsonb_build_object(
    'message_statuses', (select value from outreach_counts),
    'owner_approval_required', true,
    'automatic_send_enabled', coalesce((select email_queue_enabled and email_provider_ready from control), false)
  ),
  'social', jsonb_build_object(
    'item_statuses', (select value from social_counts),
    'accounts', (select value from social_accounts),
    'owner_approval_required', true,
    'scheduled_draft_generation', coalesce((select social_drafts_enabled from control), false)
  ),
  'seo', jsonb_build_object(
    'localized_page_statuses', (select value from seo_counts),
    'owner_or_native_review_required_before_publish', true
  ),
  'website_and_content', jsonb_build_object(
    'cms_document_statuses', (select value from cms_counts),
    'public_smoke_tests_enabled', coalesce((select public_smoke_tests_enabled from control), false),
    'latest_health', (select to_jsonb(latest_health) from latest_health)
  ),
  'production', jsonb_build_object(
    'job_stage_counts', (select value from production_counts),
    'physical_milestones_require_evidence', true,
    'owner_approval_required_for_commitments', true
  ),
  'operations', jsonb_build_object(
    'control', (select to_jsonb(control) from control),
    'latest_run', (select to_jsonb(latest_operation) from latest_operation),
    'recent_runs', (select value from recent_operations)
  ),
  'recorded_blockers', coalesce((select blockers from latest_health), '[]'::jsonb)
);
$function$


select public.refresh_admin_ai_snapshot_cache();

do $$
begin
  if exists (
    select 1 from public.faqs where lower(coalesce(answer, '')) like '%website is newly built%'
    union all select 1 from public.admin_ai_knowledge where is_active and lower(concat_ws(' ', content, instructions::text)) like '%newly built%'
    union all select 1 from public.ai_business_rules where status = 'approved' and lower(rules::text) like '%newly built%'
    union all select 1 from public.social_calendar_items where status = 'draft' and lower(concat_ws(' ', caption, reel_script, carousel_outline::text, creative_brief::text)) like '%website is newly built%'
    union all select 1 from public.seo_localized_pages where status = 'draft' and locale in ('de-DE', 'de-AT') and lower(concat_ws(' ', source_summary, seo_description, intro, sections::text, faqs::text, cta::text)) similar to '%(website neu aufgebaut|website ist neu aufgebaut|website wurde neu aufgebaut)%'
    union all select 1 from public.admin_ai_snapshot_cache where id = 'default' and lower(snapshot::text) like '%newly built%'
  ) then raise exception 'website-age trust copy remains after migration';
  end if;
end
$$;

commit;
