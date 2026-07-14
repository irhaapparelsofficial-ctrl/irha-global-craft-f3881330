-- Prevent planning-only automation tasks from being presented as completed artifacts.
-- A task may be ready_for_review only after an executor has written a real result.

DO $$
DECLARE
  v_definition text;
  v_occurrences integer;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_automation_planning_cycle'
    AND pg_get_function_identity_arguments(p.oid) = '_trigger_source text';

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'create_automation_planning_cycle(text) not found';
  END IF;

  v_occurrences := regexp_count(v_definition, '''ready_for_review''');

  -- This guard makes the migration fail safely if the upstream function changes.
  IF v_occurrences <> 5 THEN
    RAISE EXCEPTION
      'expected 5 planner ready_for_review literals, found %',
      v_occurrences;
  END IF;

  EXECUTE replace(v_definition, '''ready_for_review''', '''draft''');
END
$$;

UPDATE public.automation_tasks
SET status = 'draft',
    payload = jsonb_set(payload, '{planning_only}', 'true'::jsonb, true),
    updated_at = now()
WHERE status = 'ready_for_review'
  AND result = '{}'::jsonb
  AND approved_at IS NULL
  AND executed_at IS NULL
  AND action IN (
    'discover_and_verify',
    'create_localized_drafts',
    'prepare_listing_updates',
    'create_social_drafts',
    'create_canva_reel'
  );

UPDATE public.automation_runs r
SET summary = coalesce(r.summary, '{}'::jsonb) || jsonb_build_object(
      'planning_only', true,
      'artifacts_generated', false
    )
WHERE EXISTS (
  SELECT 1
  FROM public.automation_tasks t
  WHERE t.run_id = r.id
    AND t.status = 'draft'
    AND t.payload ->> 'planning_only' = 'true'
);
