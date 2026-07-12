-- Buyer CRM foundation
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS quotation_url text,
  ADD COLUMN IF NOT EXISTS pi_url text,
  ADD COLUMN IF NOT EXISTS sample_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS crm_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.catalogue_leads
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS quotation_url text,
  ADD COLUMN IF NOT EXISTS pi_url text,
  ADD COLUMN IF NOT EXISTS sample_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS crm_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.b2b_leads
  ADD COLUMN IF NOT EXISTS crm_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS quotation_url text,
  ADD COLUMN IF NOT EXISTS pi_url text,
  ADD COLUMN IF NOT EXISTS sample_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS crm_history jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_priority_check CHECK (priority IN ('low','normal','high','urgent')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.catalogue_leads ADD CONSTRAINT catalogue_leads_priority_check CHECK (priority IN ('low','normal','high','urgent')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.b2b_leads ADD CONSTRAINT b2b_leads_priority_check CHECK (priority IN ('low','normal','high','urgent')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_sample_status_check CHECK (sample_status IN ('not_requested','requested','in_development','sent','approved','rejected')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.catalogue_leads ADD CONSTRAINT catalogue_leads_sample_status_check CHECK (sample_status IN ('not_requested','requested','in_development','sent','approved','rejected')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.b2b_leads ADD CONSTRAINT b2b_leads_sample_status_check CHECK (sample_status IN ('not_requested','requested','in_development','sent','approved','rejected')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.b2b_leads ADD CONSTRAINT b2b_leads_crm_status_check CHECK (crm_status IN ('new','read','unqualified','qualified','contacted','replied','sample_requested','quote_requested','quotation_sent','negotiation','follow_up','won','lost','spam')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS inquiries_crm_status_priority_idx ON public.inquiries (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_follow_up_idx ON public.inquiries (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS catalogue_leads_crm_status_priority_idx ON public.catalogue_leads (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS catalogue_leads_follow_up_idx ON public.catalogue_leads (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS b2b_leads_crm_status_priority_idx ON public.b2b_leads (crm_status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS b2b_leads_follow_up_idx ON public.b2b_leads (follow_up_at) WHERE follow_up_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_inquiries_crm_updated ON public.inquiries;
CREATE TRIGGER trg_inquiries_crm_updated BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- AI Command Center foundation
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'plan' CHECK (mode IN ('plan','operate')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','planned','partial','completed','failed','cancelled')),
  reply TEXT,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','running','completed','failed','rejected','skipped')),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
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
DO $$ BEGIN ALTER TABLE public.ai_actions DROP CONSTRAINT IF EXISTS ai_actions_action_type_check; ALTER TABLE public.ai_actions ADD CONSTRAINT ai_actions_action_type_check CHECK (action_type IN ('social_content_pack','social_publish','lead_campaign_plan','listing_task','buyer_reply_draft','seo_localization_plan','weekly_growth_plan','outreach_campaign_plan')); END $$;

CREATE TABLE IF NOT EXISTS public.business_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  account_name TEXT,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','pending_verification','active','needs_attention','paused','rejected')),
  verification_level TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_level IN ('unverified','self_reported','verified')),
  owner TEXT, next_action TEXT, notes TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS business_listings_platform_url_uidx ON public.business_listings (lower(platform), coalesce(profile_url, ''));
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
DO $$ BEGIN CREATE POLICY "Admins manage AI runs" ON public.ai_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage AI actions" ON public.ai_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage business listings" ON public.business_listings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS trg_ai_runs_updated ON public.ai_runs; CREATE TRIGGER trg_ai_runs_updated BEFORE UPDATE ON public.ai_runs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_ai_actions_updated ON public.ai_actions; CREATE TRIGGER trg_ai_actions_updated BEFORE UPDATE ON public.ai_actions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_business_listings_updated ON public.business_listings; CREATE TRIGGER trg_business_listings_updated BEFORE UPDATE ON public.business_listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Lead acquisition engine
CREATE TABLE IF NOT EXISTS public.lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, market TEXT NOT NULL,
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
  last_run_at TIMESTAMPTZ, error TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lead_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lead_campaigns(id) ON DELETE CASCADE,
  query TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'firecrawl',
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
  company_name TEXT NOT NULL, website TEXT, website_domain TEXT,
  country TEXT, city TEXT, email TEXT, phone TEXT, whatsapp TEXT,
  linkedin_url TEXT, instagram_url TEXT, facebook_url TEXT,
  buyer_type TEXT, product_fit TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT NOT NULL, source_title TEXT, source_query TEXT,
  source_provider TEXT NOT NULL DEFAULT 'firecrawl',
  source_excerpt TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','needs_review','verified','rejected','duplicate','imported')),
  verification_score INTEGER NOT NULL DEFAULT 0 CHECK (verification_score BETWEEN 0 AND 100),
  duplicate_reason TEXT, duplicate_of UUID,
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
DO $$ BEGIN CREATE POLICY "Admins manage lead campaigns" ON public.lead_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage lead search runs" ON public.lead_search_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage lead candidates" ON public.lead_candidates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS trg_lead_campaigns_updated ON public.lead_campaigns; CREATE TRIGGER trg_lead_campaigns_updated BEFORE UPDATE ON public.lead_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_lead_candidates_updated ON public.lead_candidates; CREATE TRIGGER trg_lead_candidates_updated BEFORE UPDATE ON public.lead_candidates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Outreach engine
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, product_focus TEXT[] NOT NULL DEFAULT '{}',
  target_market TEXT, objective TEXT NOT NULL,
  language_mode TEXT NOT NULL DEFAULT 'auto',
  call_to_action TEXT NOT NULL DEFAULT 'Reply with your product requirements or request a live factory video call.',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','sending','active','paused','completed','failed','cancelled')),
  selected_lead_count INTEGER NOT NULL DEFAULT 0,
  draft_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.b2b_leads(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL DEFAULT 0 CHECK (sequence_number BETWEEN 0 AND 10),
  parent_message_id UUID REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL, recipient_company TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  subject TEXT NOT NULL, body_text TEXT NOT NULL,
  personalization_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sending','sent','failed','rejected','suppressed','replied','unsubscribed','duplicate')),
  idempotency_key TEXT NOT NULL UNIQUE,
  unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  gmail_message_id TEXT, gmail_thread_id TEXT, gmail_history_id TEXT,
  connector_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ, sent_at TIMESTAMPTZ, replied_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id, sequence_number)
);
CREATE TABLE IF NOT EXISTS public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.outreach_messages(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('draft_generated','approved','send_started','sent','send_failed','reply_detected','unsubscribed','suppressed','rejected','status_sync')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_leads
  ADD COLUMN IF NOT EXISTS outreach_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_outreach_status TEXT,
  ADD COLUMN IF NOT EXISTS last_gmail_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS outreach_campaigns_status_idx ON public.outreach_campaigns (status, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_campaign_status_idx ON public.outreach_messages (campaign_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_lead_idx ON public.outreach_messages (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_gmail_thread_idx ON public.outreach_messages (gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_events_campaign_idx ON public.outreach_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_events_message_idx ON public.outreach_events (message_id, created_at DESC);
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_events TO authenticated;
GRANT ALL ON public.outreach_campaigns, public.outreach_messages, public.outreach_events TO service_role;
DO $$ BEGIN CREATE POLICY "Admins manage outreach campaigns" ON public.outreach_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage outreach messages" ON public.outreach_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage outreach events" ON public.outreach_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.suppressed_emails, public.email_send_log TO authenticated;
DO $$ BEGIN CREATE POLICY "Admins read suppressed emails" ON public.suppressed_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins read email send logs" ON public.email_send_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check; ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check CHECK (status IN ('pending','sent','suppressed','failed','bounced','complained','dlq','rate_limited')); END $$;
DROP TRIGGER IF EXISTS trg_outreach_campaigns_updated ON public.outreach_campaigns; CREATE TRIGGER trg_outreach_campaigns_updated BEFORE UPDATE ON public.outreach_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_outreach_messages_updated ON public.outreach_messages; CREATE TRIGGER trg_outreach_messages_updated BEFORE UPDATE ON public.outreach_messages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Social content calendar
CREATE TABLE IF NOT EXISTS public.social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, objective TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_focus TEXT[] NOT NULL DEFAULT '{}',
  target_markets TEXT[] NOT NULL DEFAULT '{}',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'English',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','active','completed','failed','cancelled')),
  item_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  published_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.social_calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.social_campaigns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok')),
  content_type TEXT NOT NULL DEFAULT 'single_image' CHECK (content_type IN ('text','single_image','carousel','reel')),
  language TEXT NOT NULL DEFAULT 'English',
  title TEXT NOT NULL, caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  call_to_action TEXT, product_url TEXT, image_url TEXT, video_url TEXT,
  carousel_outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  reel_script TEXT,
  creative_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  creative_status TEXT NOT NULL DEFAULT 'brief_ready' CHECK (creative_status IN ('brief_ready','asset_required','asset_attached','runtime_not_connected','ready')),
  scheduled_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','ready','publishing','published','verified_only','manual_required','failed','rejected','cancelled')),
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL,
  external_post_id TEXT, external_post_url TEXT,
  connector_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT, published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
CREATE TABLE IF NOT EXISTS public.social_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.social_calendar_items(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.social_campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started','published','verified_only','manual_required','failed','skipped')),
  request_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_campaigns_status_idx ON public.social_campaigns (status, created_at DESC);
CREATE INDEX IF NOT EXISTS social_calendar_due_idx ON public.social_calendar_items (status, scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS social_calendar_campaign_idx ON public.social_calendar_items (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_calendar_platform_idx ON public.social_calendar_items (platform, status, scheduled_at);
CREATE INDEX IF NOT EXISTS social_delivery_item_idx ON public.social_delivery_attempts (item_id, created_at DESC);
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_delivery_attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_calendar_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_delivery_attempts TO authenticated;
GRANT ALL ON public.social_campaigns, public.social_calendar_items, public.social_delivery_attempts TO service_role;
DO $$ BEGIN CREATE POLICY "Admins manage social campaigns" ON public.social_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage social calendar" ON public.social_calendar_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins read social delivery attempts" ON public.social_delivery_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins write social delivery attempts" ON public.social_delivery_attempts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS trg_social_campaigns_updated ON public.social_campaigns; CREATE TRIGGER trg_social_campaigns_updated BEFORE UPDATE ON public.social_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_social_calendar_items_updated ON public.social_calendar_items; CREATE TRIGGER trg_social_calendar_items_updated BEFORE UPDATE ON public.social_calendar_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DO $$ BEGIN ALTER TABLE public.social_calendar_items ADD CONSTRAINT social_calendar_v1_supported_delivery_check CHECK (content_type IN ('text','single_image') OR status IN ('draft','rejected','cancelled','manual_required')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Multilingual SEO
CREATE TABLE IF NOT EXISTS public.seo_locales (
  locale TEXT PRIMARY KEY,
  language_name TEXT NOT NULL, native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr','rtl')),
  target_markets TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','retired')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  requires_native_review BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.seo_keyword_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL REFERENCES public.seo_locales(locale) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  search_intent TEXT NOT NULL CHECK (search_intent IN ('commercial','transactional','informational','navigational')),
  market TEXT,
  product_focus TEXT[] NOT NULL DEFAULT '{}',
  seed_keywords TEXT[] NOT NULL DEFAULT '{}',
  primary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','rejected','archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.seo_localized_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL REFERENCES public.seo_locales(locale) ON DELETE RESTRICT,
  base_route TEXT NOT NULL, slug TEXT NOT NULL, path TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'commercial_landing' CHECK (page_type IN ('commercial_landing','capability','category','buyer_guide','country_landing')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ai_reviewed','approved','published','rejected','archived')),
  source_title TEXT, source_summary TEXT,
  seo_title TEXT NOT NULL, seo_description TEXT NOT NULL,
  h1 TEXT NOT NULL, eyebrow TEXT, intro TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta JSONB NOT NULL DEFAULT '{}'::jsonb,
  keyword_cluster_ids UUID[] NOT NULL DEFAULT '{}',
  internal_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  json_ld JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score INTEGER NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  native_review_status TEXT NOT NULL DEFAULT 'required' CHECK (native_review_status IN ('required','pending','approved','rejected','not_required')),
  noindex BOOLEAN NOT NULL DEFAULT true,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ, published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (locale, slug), UNIQUE (path)
);
CREATE INDEX IF NOT EXISTS seo_locales_status_priority_idx ON public.seo_locales (status, priority DESC);
CREATE INDEX IF NOT EXISTS seo_keyword_clusters_locale_status_idx ON public.seo_keyword_clusters (locale, status, created_at DESC);
CREATE INDEX IF NOT EXISTS seo_localized_pages_locale_status_idx ON public.seo_localized_pages (locale, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS seo_localized_pages_base_route_idx ON public.seo_localized_pages (base_route, status);
CREATE INDEX IF NOT EXISTS seo_localized_pages_published_idx ON public.seo_localized_pages (published_at DESC) WHERE status = 'published' AND noindex = false;
ALTER TABLE public.seo_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_localized_pages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.seo_locales TO anon, authenticated;
GRANT SELECT ON public.seo_localized_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_locales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_keyword_clusters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_localized_pages TO authenticated;
GRANT ALL ON public.seo_locales, public.seo_keyword_clusters, public.seo_localized_pages TO service_role;
DO $$ BEGIN CREATE POLICY "Public reads active SEO locales" ON public.seo_locales FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage SEO locales" ON public.seo_locales FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage keyword clusters" ON public.seo_keyword_clusters FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public reads published localized pages" ON public.seo_localized_pages FOR SELECT TO anon, authenticated USING ((status = 'published' AND noindex = false) OR public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage localized pages" ON public.seo_localized_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS trg_seo_locales_updated ON public.seo_locales; CREATE TRIGGER trg_seo_locales_updated BEFORE UPDATE ON public.seo_locales FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_seo_keyword_clusters_updated ON public.seo_keyword_clusters; CREATE TRIGGER trg_seo_keyword_clusters_updated BEFORE UPDATE ON public.seo_keyword_clusters FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_seo_localized_pages_updated ON public.seo_localized_pages; CREATE TRIGGER trg_seo_localized_pages_updated BEFORE UPDATE ON public.seo_localized_pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seo_locales (locale, language_name, native_name, direction, target_markets, status, priority, requires_native_review) VALUES
  ('de-DE','German','Deutsch','ltr',ARRAY['Germany'],'active',100,true),
  ('de-AT','German (Austria)','Deutsch (Österreich)','ltr',ARRAY['Austria'],'active',100,true),
  ('de-CH','German (Switzerland)','Deutsch (Schweiz)','ltr',ARRAY['Switzerland'],'active',95,true),
  ('fr-FR','French','Français','ltr',ARRAY['France'],'active',85,true),
  ('es-ES','Spanish','Español','ltr',ARRAY['Spain'],'active',80,true),
  ('it-IT','Italian','Italiano','ltr',ARRAY['Italy'],'active',75,true),
  ('nl-NL','Dutch','Nederlands','ltr',ARRAY['Netherlands'],'active',75,true),
  ('ar-AE','Arabic (UAE)','العربية','rtl',ARRAY['United Arab Emirates'],'active',75,true)
ON CONFLICT (locale) DO NOTHING;

-- Rate limit RPC (function already exists in DB, this is idempotent)
CREATE TABLE IF NOT EXISTS public.public_submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submit_inquiry','submit_catalogue','create_upload')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS public_submission_events_lookup_idx ON public.public_submission_events (fingerprint_hash, action, created_at DESC);
CREATE INDEX IF NOT EXISTS public_submission_events_created_idx ON public.public_submission_events (created_at DESC);
ALTER TABLE public.public_submission_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_submission_events FROM anon, authenticated;
GRANT ALL ON public.public_submission_events TO service_role;

-- AI Business Rules master
CREATE TABLE IF NOT EXISTS public.ai_business_rules (
  id TEXT PRIMARY KEY DEFAULT 'default',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_business_rules_singleton CHECK (id = 'default'),
  CONSTRAINT ai_business_rules_object_check CHECK (jsonb_typeof(rules) = 'object')
);
ALTER TABLE public.ai_business_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_business_rules TO authenticated;
GRANT ALL ON public.ai_business_rules TO service_role;
DO $$ BEGIN CREATE POLICY "Admins manage AI business rules" ON public.ai_business_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS trg_ai_business_rules_updated ON public.ai_business_rules; CREATE TRIGGER trg_ai_business_rules_updated BEFORE UPDATE ON public.ai_business_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS ai_business_rules_status_idx ON public.ai_business_rules (status, updated_at DESC);

-- Sample & production workflow
CREATE TABLE IF NOT EXISTS public.production_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('sample','order')),
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('inquiry','catalogue','prospect','manual')),
  source_id UUID,
  buyer_name TEXT NOT NULL, company_name TEXT,
  product_name TEXT NOT NULL,
  quantity_text TEXT NOT NULL,
  specification_reference TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'briefing' CHECK (stage IN ('briefing','spec_locked','material_sourcing','cutting','printing_embroidery','stitching','finishing','qc','packing','ready_to_ship','shipped','buyer_approved','completed','on_hold','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  internal_target_date DATE, buyer_target_text TEXT,
  sample_status TEXT NOT NULL DEFAULT 'not_required' CHECK (sample_status IN ('not_required','requested','spec_pending','in_development','qc','sent','approved','rejected','cancelled')),
  buyer_approval_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (buyer_approval_status IN ('not_requested','pending','approved','changes_requested','rejected')),
  qc_status TEXT NOT NULL DEFAULT 'not_started' CHECK (qc_status IN ('not_started','pending','passed','failed','rework')),
  shipping_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (shipping_status IN ('not_ready','ready','booked','shipped','delivered','exception')),
  courier_name TEXT, tracking_number TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  owner_approved_at TIMESTAMPTZ,
  owner_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_notification_status TEXT NOT NULL DEFAULT 'not_prepared' CHECK (buyer_notification_status IN ('not_prepared','draft','approved','sent','failed')),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT production_jobs_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE TABLE IF NOT EXISTS public.production_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','stage_changed','note_added','qc_updated','buyer_approval_updated','sample_updated','shipping_updated','owner_approved','notification_recorded')),
  from_value TEXT, to_value TEXT, note TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT production_job_events_evidence_object CHECK (jsonb_typeof(evidence) = 'object')
);
ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_job_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_job_events TO authenticated;
GRANT ALL ON public.production_jobs TO service_role;
GRANT ALL ON public.production_job_events TO service_role;
DO $$ BEGIN CREATE POLICY "Admins manage production jobs" ON public.production_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage production job events" ON public.production_job_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS trg_production_jobs_updated ON public.production_jobs; CREATE TRIGGER trg_production_jobs_updated BEFORE UPDATE ON public.production_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS production_jobs_stage_priority_idx ON public.production_jobs (stage, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS production_jobs_target_idx ON public.production_jobs (internal_target_date, stage) WHERE stage NOT IN ('completed','cancelled');
CREATE INDEX IF NOT EXISTS production_jobs_source_idx ON public.production_jobs (source_type, source_id);
CREATE INDEX IF NOT EXISTS production_job_events_job_idx ON public.production_job_events (production_job_id, created_at DESC);