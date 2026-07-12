-- Irha Apparels guarded automation control center
-- Creates daily planning infrastructure for lead discovery, SEO, listings and social drafts.
-- External sends, public posts, external listing changes and commercial commitments stay approval-controlled.

CREATE TABLE IF NOT EXISTS public.automation_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  daily_run_time TIME NOT NULL DEFAULT '08:30',
  leads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  lead_markets TEXT[] NOT NULL DEFAULT ARRAY[
    'Germany','Austria','Switzerland','United Kingdom','United States','Canada','Australia','United Arab Emirates'
  ]::TEXT[],
  lead_product_focus TEXT[] NOT NULL DEFAULT ARRAY[
    'Bavarian & Trachten','Premium Leather','Sportswear','Streetwear & Activewear','Leisurewear & Nightwear'
  ]::TEXT[],
  lead_buyer_types TEXT[] NOT NULL DEFAULT ARRAY[
    'wholesaler','importer','distributor','retailer','private-label brand'
  ]::TEXT[],
  daily_lead_candidate_limit INTEGER NOT NULL DEFAULT 20 CHECK (daily_lead_candidate_limit BETWEEN 1 AND 100),
  lead_auto_import BOOLEAN NOT NULL DEFAULT FALSE,
  seo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  seo_locales TEXT[] NOT NULL DEFAULT ARRAY['de-DE','de-AT','de-CH','fr-FR','es-ES','it-IT','nl-NL','ar-AE']::TEXT[],
  daily_seo_draft_limit INTEGER NOT NULL DEFAULT 2 CHECK (daily_seo_draft_limit BETWEEN 1 AND 10),
  seo_auto_publish BOOLEAN NOT NULL DEFAULT FALSE,
  listings_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_listing_task_limit INTEGER NOT NULL DEFAULT 3 CHECK (daily_listing_task_limit BETWEEN 1 AND 20),
  external_listing_publish BOOLEAN NOT NULL DEFAULT FALSE,
  social_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  social_platforms TEXT[] NOT NULL DEFAULT ARRAY['instagram','facebook','linkedin','tiktok']::TEXT[],
  daily_social_draft_limit INTEGER NOT NULL DEFAULT 2 CHECK (daily_social_draft_limit BETWEEN 1 AND 12),
  weekly_reel_target INTEGER NOT NULL DEFAULT 3 CHECK (weekly_reel_target BETWEEN 0 AND 14),
  canva_handoff_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  social_auto_publish BOOLEAN NOT NULL DEFAULT FALSE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT automation_settings_singleton CHECK (id = 'default')
);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual','cron','system')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','partial','failed','skipped')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modules JSONB NOT NULL DEFAULT '{}'::JSONB,
  summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  business_rules_version INTEGER,
  external_execution BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT automation_runs_modules_object CHECK (jsonb_typeof(modules) = 'object'),
  CONSTRAINT automation_runs_summary_object CHECK (jsonb_typeof(summary) = 'object')
);

CREATE TABLE IF NOT EXISTS public.automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('leads','seo','listings','social','creative','system')),
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready_for_review','approved','executed','blocked','failed','cancelled')),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  external_action BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  scheduled_for TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT automation_tasks_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT automation_tasks_result_object CHECK (jsonb_typeof(result) = 'object')
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_tasks TO authenticated;
GRANT ALL ON public.automation_settings TO service_role;
GRANT ALL ON public.automation_runs TO service_role;
GRANT ALL ON public.automation_tasks TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage automation settings" ON public.automation_settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage automation runs" ON public.automation_runs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage automation tasks" ON public.automation_tasks
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.automation_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_automation_settings_updated ON public.automation_settings;
CREATE TRIGGER trg_automation_settings_updated
  BEFORE UPDATE ON public.automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_automation_tasks_updated ON public.automation_tasks;
CREATE TRIGGER trg_automation_tasks_updated
  BEFORE UPDATE ON public.automation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS automation_runs_status_started_idx
  ON public.automation_runs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS automation_tasks_review_idx
  ON public.automation_tasks (status, module, scheduled_for, created_at DESC);
CREATE INDEX IF NOT EXISTS automation_tasks_run_idx
  ON public.automation_tasks (run_id, created_at DESC);

-- Make the rate-limit audit table explicitly readable by admins while keeping public access blocked.
GRANT SELECT ON public.public_submission_events TO authenticated;
GRANT ALL ON public.public_submission_events TO service_role;
DO $$ BEGIN
  CREATE POLICY "Admins read public submission events" ON public.public_submission_events
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Harden legacy queue helpers. They are backend/trigger helpers, not public RPC endpoints.
ALTER FUNCTION public.delete_email(TEXT, BIGINT) SET search_path = 'pg_catalog';
ALTER FUNCTION public.enqueue_email(TEXT, JSONB) SET search_path = 'pg_catalog';
ALTER FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) SET search_path = 'pg_catalog';
ALTER FUNCTION public.read_email_batch(TEXT, INTEGER, INTEGER) SET search_path = 'pg_catalog';
ALTER FUNCTION public.email_queue_dispatch() SET search_path = 'pg_catalog';
ALTER FUNCTION public.email_queue_wake() SET search_path = 'pg_catalog';
ALTER FUNCTION public.has_role(UUID, public.app_role) SET search_path = 'pg_catalog', 'public';
ALTER FUNCTION public.consume_public_submission_limit(TEXT, TEXT, INTEGER, INTEGER) SET search_path = 'pg_catalog', 'public';
ALTER FUNCTION public.validate_public_inquiry_insert() SET search_path = 'pg_catalog', 'public';
ALTER FUNCTION public.touch_updated_at() SET search_path = 'pg_catalog';

REVOKE ALL ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

COMMENT ON TABLE public.automation_settings IS
  'Owner-controlled daily automation schedule. Auto-import, auto-publish and external listing changes default to disabled.';
COMMENT ON TABLE public.automation_runs IS
  'Audit record for each manual or scheduled planning cycle.';
COMMENT ON TABLE public.automation_tasks IS
  'Approval-aware tasks created by lead, SEO, listing, social and creative automation.';
