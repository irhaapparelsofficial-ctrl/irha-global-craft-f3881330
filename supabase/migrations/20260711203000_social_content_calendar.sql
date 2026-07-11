-- Irha Social Content & Calendar Engine v1
-- Admin-only content campaigns, approval-based calendar items and exact delivery attempts.

CREATE TABLE IF NOT EXISTS public.social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
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
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  call_to_action TEXT,
  product_url TEXT,
  image_url TEXT,
  video_url TEXT,
  carousel_outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  reel_script TEXT,
  creative_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  creative_status TEXT NOT NULL DEFAULT 'brief_ready' CHECK (creative_status IN ('brief_ready','asset_required','asset_attached','runtime_not_connected','ready')),
  scheduled_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','approved','scheduled','ready','publishing','published','verified_only','manual_required','failed','rejected','cancelled'
  )),
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL,
  external_post_id TEXT,
  external_post_url TEXT,
  connector_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  published_at TIMESTAMPTZ,
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

DO $$ BEGIN
  CREATE POLICY "Admins manage social campaigns" ON public.social_campaigns
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage social calendar" ON public.social_calendar_items
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins read social delivery attempts" ON public.social_delivery_attempts
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins write social delivery attempts" ON public.social_delivery_attempts
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_social_campaigns_updated ON public.social_campaigns;
CREATE TRIGGER trg_social_campaigns_updated
  BEFORE UPDATE ON public.social_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_social_calendar_items_updated ON public.social_calendar_items;
CREATE TRIGGER trg_social_calendar_items_updated
  BEFORE UPDATE ON public.social_calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
