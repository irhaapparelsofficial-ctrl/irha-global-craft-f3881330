-- Irha Lead Acquisition Engine v1
-- Admin-only campaigns, evidence-backed candidates, verification and CRM import.

CREATE TABLE IF NOT EXISTS public.lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  product_focus TEXT[] NOT NULL DEFAULT '{}',
  buyer_types TEXT[] NOT NULL DEFAULT '{}',
  search_queries TEXT[] NOT NULL DEFAULT '{}',
  source_providers TEXT[] NOT NULL DEFAULT ARRAY['firecrawl']::text[],
  target_count INTEGER NOT NULL DEFAULT 25 CHECK (target_count BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed','failed','cancelled')),
  discovered_count INTEGER NOT NULL DEFAULT 0,
  reviewed_count INTEGER NOT NULL DEFAULT 0,
  verified_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  error TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lead_campaigns(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'firecrawl',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','skipped')),
  result_count INTEGER NOT NULL DEFAULT 0,
  response_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.lead_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lead_campaigns(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  website_domain TEXT,
  country TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  buyer_type TEXT,
  product_fit TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT NOT NULL,
  source_title TEXT,
  source_query TEXT,
  source_provider TEXT NOT NULL DEFAULT 'firecrawl',
  source_excerpt TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','needs_review','verified','rejected','duplicate','imported')),
  verification_score INTEGER NOT NULL DEFAULT 0 CHECK (verification_score BETWEEN 0 AND 100),
  duplicate_reason TEXT,
  duplicate_of UUID,
  imported_lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_leads
  ADD COLUMN IF NOT EXISTS lead_campaign_id UUID REFERENCES public.lead_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_type TEXT,
  ADD COLUMN IF NOT EXISTS website_domain TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS verification_score INTEGER,
  ADD COLUMN IF NOT EXISTS verification_evidence JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS lead_campaigns_status_idx ON public.lead_campaigns (status, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_search_runs_campaign_idx ON public.lead_search_runs (campaign_id, started_at DESC);
CREATE INDEX IF NOT EXISTS lead_candidates_campaign_status_idx ON public.lead_candidates (campaign_id, verification_status, verification_score DESC);
CREATE INDEX IF NOT EXISTS lead_candidates_domain_idx ON public.lead_candidates (website_domain) WHERE website_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_candidates_email_idx ON public.lead_candidates (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS b2b_leads_domain_idx ON public.b2b_leads (website_domain) WHERE website_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS b2b_leads_email_lower_idx ON public.b2b_leads (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_search_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_candidates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_search_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_candidates TO authenticated;
GRANT ALL ON public.lead_campaigns, public.lead_search_runs, public.lead_candidates TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage lead campaigns" ON public.lead_campaigns
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage lead search runs" ON public.lead_search_runs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage lead candidates" ON public.lead_candidates
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_lead_campaigns_updated ON public.lead_campaigns;
CREATE TRIGGER trg_lead_campaigns_updated
  BEFORE UPDATE ON public.lead_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_lead_candidates_updated ON public.lead_candidates;
CREATE TRIGGER trg_lead_candidates_updated
  BEFORE UPDATE ON public.lead_candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
