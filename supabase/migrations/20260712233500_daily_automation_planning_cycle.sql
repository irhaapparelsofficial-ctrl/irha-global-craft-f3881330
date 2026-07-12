-- Guarded daily automation planning cycle.
-- This cron creates internal tasks only. It never sends outreach, publishes social posts,
-- changes external listings, publishes SEO pages or makes commercial commitments.

CREATE OR REPLACE FUNCTION public.create_automation_planning_cycle(
  _trigger_source TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_settings public.automation_settings%ROWTYPE;
  v_run_id UUID;
  v_local_now TIMESTAMP;
  v_local_date DATE;
  v_day_key TEXT;
  v_market TEXT;
  v_product TEXT;
  v_locale TEXT;
  v_platform TEXT;
  v_market_index INTEGER;
  v_product_index INTEGER;
  v_locale_index INTEGER;
  v_platform_index INTEGER;
  v_created INTEGER := 0;
  v_rows INTEGER := 0;
  v_is_reel_day BOOLEAN := FALSE;
  v_rules_version INTEGER;
BEGIN
  IF _trigger_source NOT IN ('manual','cron','system') THEN
    RAISE EXCEPTION 'invalid_trigger_source';
  END IF;

  IF current_user NOT IN ('postgres', 'service_role')
     AND COALESCE(auth.jwt()->>'role', '') <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_settings
  FROM public.automation_settings
  WHERE id = 'default'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'automation_settings_missing';
  END IF;

  IF NOT v_settings.enabled THEN
    INSERT INTO public.automation_runs (
      trigger_source, status, requested_by, modules, summary, external_execution, completed_at
    ) VALUES (
      _trigger_source,
      'skipped',
      auth.uid(),
      '{}'::JSONB,
      jsonb_build_object('reason', 'automation_disabled'),
      FALSE,
      now()
    ) RETURNING id INTO v_run_id;
    RETURN v_run_id;
  END IF;

  v_local_now := now() AT TIME ZONE v_settings.timezone;
  v_local_date := v_local_now::DATE;
  v_day_key := to_char(v_local_date, 'YYYY-MM-DD');

  IF array_length(v_settings.lead_markets, 1) IS NOT NULL THEN
    v_market_index := 1 + ((extract(doy FROM v_local_now)::INTEGER - 1) % array_length(v_settings.lead_markets, 1));
    v_market := v_settings.lead_markets[v_market_index];
  END IF;
  IF array_length(v_settings.lead_product_focus, 1) IS NOT NULL THEN
    v_product_index := 1 + ((extract(doy FROM v_local_now)::INTEGER - 1) % array_length(v_settings.lead_product_focus, 1));
    v_product := v_settings.lead_product_focus[v_product_index];
  END IF;
  IF array_length(v_settings.seo_locales, 1) IS NOT NULL THEN
    v_locale_index := 1 + ((extract(doy FROM v_local_now)::INTEGER - 1) % array_length(v_settings.seo_locales, 1));
    v_locale := v_settings.seo_locales[v_locale_index];
  END IF;
  IF array_length(v_settings.social_platforms, 1) IS NOT NULL THEN
    v_platform_index := 1 + ((extract(doy FROM v_local_now)::INTEGER - 1) % array_length(v_settings.social_platforms, 1));
    v_platform := v_settings.social_platforms[v_platform_index];
  END IF;

  v_is_reel_day := extract(isodow FROM v_local_now)::INTEGER IN (2, 4, 6)
    AND v_settings.weekly_reel_target > 0;

  SELECT version INTO v_rules_version
  FROM public.ai_business_rules
  WHERE id = 'default' AND status = 'approved';

  INSERT INTO public.automation_runs (
    trigger_source,
    status,
    requested_by,
    modules,
    business_rules_version,
    external_execution
  ) VALUES (
    _trigger_source,
    'running',
    auth.uid(),
    jsonb_build_object(
      'leads', v_settings.leads_enabled,
      'seo', v_settings.seo_enabled,
      'listings', v_settings.listings_enabled,
      'social', v_settings.social_enabled,
      'creative', v_settings.canva_handoff_enabled
    ),
    v_rules_version,
    FALSE
  ) RETURNING id INTO v_run_id;

  IF v_settings.leads_enabled THEN
    INSERT INTO public.automation_tasks (
      run_id, module, action, title, status, requires_approval, external_action,
      payload, idempotency_key
    ) VALUES (
      v_run_id,
      'leads',
      'discover_and_verify',
      format('Discover verified B2B buyers · %s · %s', COALESCE(v_market, 'Priority market'), COALESCE(v_product, 'Priority products')),
      'ready_for_review',
      FALSE,
      FALSE,
      jsonb_build_object(
        'market', v_market,
        'product_focus', ARRAY[v_product],
        'buyer_types', v_settings.lead_buyer_types,
        'candidate_limit', v_settings.daily_lead_candidate_limit,
        'auto_import', FALSE,
        'requirements', ARRAY['evidence_url','company_identity','duplicate_check','buyer_fit'],
        'external_execution', FALSE
      ),
      format('automation:%s:leads:%s:%s', v_day_key, COALESCE(v_market, 'none'), COALESCE(v_product, 'none'))
    ) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_created := v_created + v_rows;
  END IF;

  IF v_settings.seo_enabled THEN
    INSERT INTO public.automation_tasks (
      run_id, module, action, title, status, requires_approval, external_action,
      payload, idempotency_key
    ) VALUES (
      v_run_id,
      'seo',
      'create_localized_drafts',
      format('Prepare useful localized SEO drafts · %s · %s', COALESCE(v_locale, 'Priority locale'), COALESCE(v_product, 'Priority products')),
      'ready_for_review',
      FALSE,
      FALSE,
      jsonb_build_object(
        'locale', v_locale,
        'product_focus', ARRAY[v_product],
        'draft_limit', v_settings.daily_seo_draft_limit,
        'noindex', TRUE,
        'native_review_required', TRUE,
        'auto_publish', FALSE,
        'invented_metrics_allowed', FALSE
      ),
      format('automation:%s:seo:%s:%s', v_day_key, COALESCE(v_locale, 'none'), COALESCE(v_product, 'none'))
    ) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_created := v_created + v_rows;
  END IF;

  IF v_settings.listings_enabled THEN
    INSERT INTO public.automation_tasks (
      run_id, module, action, title, status, requires_approval, external_action,
      payload, idempotency_key
    ) VALUES (
      v_run_id,
      'listings',
      'prepare_listing_updates',
      'Prepare truthful B2B listing profiles and posts',
      'ready_for_review',
      TRUE,
      FALSE,
      jsonb_build_object(
        'task_limit', v_settings.daily_listing_task_limit,
        'priority_platforms', ARRAY['Fibre2Fashion','Europages','Kompass','WLW','Foursource'],
        'skip_platforms', ARRAY['Alibaba'],
        'internal_registry_only', TRUE,
        'external_platform_changed', FALSE,
        'verification_required', TRUE
      ),
      format('automation:%s:listings', v_day_key)
    ) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_created := v_created + v_rows;
  END IF;

  IF v_settings.social_enabled THEN
    INSERT INTO public.automation_tasks (
      run_id, module, action, title, status, requires_approval, external_action,
      payload, idempotency_key
    ) VALUES (
      v_run_id,
      'social',
      'create_social_drafts',
      format('Create daily B2B social drafts · %s · %s', COALESCE(v_platform, 'Priority channel'), COALESCE(v_product, 'Priority products')),
      'ready_for_review',
      FALSE,
      FALSE,
      jsonb_build_object(
        'platforms', v_settings.social_platforms,
        'primary_platform', v_platform,
        'product_focus', ARRAY[v_product],
        'draft_limit', v_settings.daily_social_draft_limit,
        'audience', ARRAY['wholesalers','importers','distributors','retailers','private-label brands'],
        'auto_publish', FALSE,
        'public_prices', FALSE,
        'use_verified_media_only', TRUE,
        'external_execution', FALSE
      ),
      format('automation:%s:social:%s:%s', v_day_key, COALESCE(v_platform, 'none'), COALESCE(v_product, 'none'))
    ) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_created := v_created + v_rows;
  END IF;

  IF v_settings.canva_handoff_enabled AND v_is_reel_day THEN
    INSERT INTO public.automation_tasks (
      run_id, module, action, title, status, requires_approval, external_action,
      payload, idempotency_key
    ) VALUES (
      v_run_id,
      'creative',
      'create_canva_reel',
      format('Create premium B2B Canva reel draft · %s', COALESCE(v_product, 'Priority product')),
      'ready_for_review',
      FALSE,
      FALSE,
      jsonb_build_object(
        'product_focus', ARRAY[v_product],
        'format', 'vertical_9_16',
        'duration_seconds', 10,
        'scenes', ARRAY['hero_reveal','texture_detail','construction_detail','rotating_product','branded_cta'],
        'use_verified_original_media_only', TRUE,
        'no_fake_factory_scene', TRUE,
        'no_public_publish', TRUE
      ),
      format('automation:%s:creative:reel:%s', v_day_key, COALESCE(v_product, 'none'))
    ) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_created := v_created + v_rows;
  END IF;

  UPDATE public.automation_runs
  SET status = 'completed',
      summary = jsonb_build_object(
        'tasks_created', v_created,
        'day', v_day_key,
        'market', v_market,
        'product_focus', v_product,
        'locale', v_locale,
        'primary_platform', v_platform,
        'reel_day', v_is_reel_day,
        'business_rules_approved', v_rules_version IS NOT NULL,
        'external_execution', FALSE
      ),
      completed_at = now()
  WHERE id = v_run_id;

  UPDATE public.automation_settings
  SET last_run_at = now(),
      next_run_at = ((v_local_date + 1) + daily_run_time) AT TIME ZONE timezone,
      updated_by = CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE updated_by END
  WHERE id = 'default';

  RETURN v_run_id;
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE public.automation_runs
    SET status = 'failed', error = left(SQLERRM, 4000), completed_at = now()
    WHERE id = v_run_id;
  END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_automation_planning_cycle(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_automation_planning_cycle(TEXT) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'irha-daily-automation-plan') THEN
    PERFORM cron.unschedule('irha-daily-automation-plan');
  END IF;

  PERFORM cron.schedule(
    'irha-daily-automation-plan',
    '30 3 * * *',
    $cron$SELECT public.create_automation_planning_cycle('cron');$cron$
  );
END;
$$;

COMMENT ON FUNCTION public.create_automation_planning_cycle(TEXT) IS
  'Creates duplicate-safe internal automation tasks. It never performs external sends, posts, listing changes or commercial commitments.';
