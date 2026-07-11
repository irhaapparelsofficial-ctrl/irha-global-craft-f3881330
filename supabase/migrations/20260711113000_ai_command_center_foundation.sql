-- Irha AI Command Center foundation
-- Adds admin-only AI runs/actions and a truthful business listings registry.

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'plan' CHECK (mode IN ('plan', 'operate')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'planned', 'partial', 'completed', 'failed', 'cancelled')),
  reply TEXT,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'social_content_pack',
    'social_publish',
    'lead_campaign_plan',
    'listing_task',
    'buyer_reply_draft',
    'seo_localization_plan',
    'weekly_growth_plan'
  )),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'running', 'completed', 'failed', 'rejected', 'skipped')),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  account_name TEXT,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'pending_verification',
    'active',
    'needs_attention',
    'paused',
    'rejected'
  )),
  verification_level TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'self_reported', 'verified')),
  owner TEXT,
  next_action TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS business_listings_platform_url_uidx
  ON public.business_listings (lower(platform), coalesce(profile_url, ''));
CREATE INDEX IF NOT EXISTS ai_runs_created_idx ON public.ai_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_actions_status_idx ON public.ai_actions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_actions_run_idx ON public.ai_actions (run_id, created_at);
CREATE INDEX IF NOT EXISTS business_listings_status_idx ON public.business_listings (status, updated_at DESC);

ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_listings TO authenticated;
GRANT ALL ON public.ai_runs, public.ai_actions, public.business_listings TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage AI runs" ON public.ai_runs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage AI actions" ON public.ai_actions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage business listings" ON public.business_listings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_ai_runs_updated ON public.ai_runs;
CREATE TRIGGER trg_ai_runs_updated
  BEFORE UPDATE ON public.ai_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ai_actions_updated ON public.ai_actions;
CREATE TRIGGER trg_ai_actions_updated
  BEFORE UPDATE ON public.ai_actions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_business_listings_updated ON public.business_listings;
CREATE TRIGGER trg_business_listings_updated
  BEFORE UPDATE ON public.business_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
