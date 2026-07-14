create or replace function public.admin_ai_live_snapshot()
returns jsonb
language sql
stable
set search_path = public
as $$
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
  select id, name, market, product_focus, status, discovered_count,
         verified_count, imported_count, last_run_at, error, created_at
  from public.lead_campaigns
  order by created_at desc
  limit 1
),
lead_candidate_counts as (
  select coalesce(jsonb_object_agg(verification_status, total), '{}'::jsonb) value
  from (
    select verification_status, count(*) total
    from public.lead_candidates
    group by verification_status
  ) x
),
lead_campaign_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.lead_campaigns
    group by status
  ) x
),
outreach_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.outreach_messages
    group by status
  ) x
),
social_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.social_calendar_items
    group by status
  ) x
),
seo_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.seo_localized_pages
    group by status
  ) x
),
production_counts as (
  select coalesce(jsonb_object_agg(stage, total), '{}'::jsonb) value
  from (
    select stage, count(*) total
    from public.production_jobs
    group by stage
  ) x
),
quotation_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.crm_quotations
    group by status
  ) x
),
sample_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.crm_samples
    group by status
  ) x
),
cms_counts as (
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) value
  from (
    select status, count(*) total
    from public.cms_documents
    group by status
  ) x
),
social_accounts as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'platform', platform,
        'display_name', display_name,
        'enabled', enabled,
        'verification_status', verification_status,
        'capabilities', capabilities,
        'last_verified_at', last_verified_at,
        'connection_note', connection_note
      ) order by platform
    ),
    '[]'::jsonb
  ) value
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
  from public.operations_control
  where id = 'default'
)
select jsonb_build_object(
  'checked_at', now(),
  'timezone', coalesce((select timezone from control), 'Asia/Karachi'),
  'source_policy', 'Live aggregate database evidence only; no buyer PII.',
  'company', jsonb_build_object(
    'legal_name', 'Irha Apparels',
    'location', 'Sialkot, Pakistan',
    'business_model', 'B2B custom apparel manufacturing, OEM and private label',
    'website_state', 'Experienced manufacturer; website newly built',
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
    'total_buyer_records',
      (select count(*) from public.b2b_leads) +
      (select count(*) from public.catalogue_leads) +
      (select count(*) from public.inquiries),
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
    'automatic_send_enabled',
      coalesce((select email_queue_enabled and email_provider_ready from control), false)
  ),
  'social', jsonb_build_object(
    'item_statuses', (select value from social_counts),
    'accounts', (select value from social_accounts),
    'owner_approval_required', true,
    'scheduled_draft_generation',
      coalesce((select social_drafts_enabled from control), false)
  ),
  'seo', jsonb_build_object(
    'localized_page_statuses', (select value from seo_counts),
    'owner_or_native_review_required_before_publish', true
  ),
  'website_and_content', jsonb_build_object(
    'cms_document_statuses', (select value from cms_counts),
    'public_smoke_tests_enabled',
      coalesce((select public_smoke_tests_enabled from control), false),
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
  'recorded_blockers',
    coalesce((select blockers from latest_health), '[]'::jsonb)
);
$$;

revoke all on function public.admin_ai_live_snapshot() from public, anon, authenticated;
grant execute on function public.admin_ai_live_snapshot() to service_role;

comment on function public.admin_ai_live_snapshot() is
  'PII-free live operational snapshot used by the private Irha Admin AI.';

create or replace function public.admin_ai_get_live_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  return public.admin_ai_live_snapshot();
end;
$$;

revoke all on function public.admin_ai_get_live_snapshot() from public, anon;
grant execute on function public.admin_ai_get_live_snapshot() to authenticated;

comment on function public.admin_ai_get_live_snapshot() is
  'Admin-authenticated, PII-free live business snapshot for the Admin AI UI.';

update public.operations_control
set social_drafts_enabled = true,
    updated_at = now(),
    last_error = null
where id = 'default';
