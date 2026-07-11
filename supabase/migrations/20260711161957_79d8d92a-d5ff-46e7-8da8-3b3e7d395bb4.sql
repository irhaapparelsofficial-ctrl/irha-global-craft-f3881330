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

UPDATE public.b2b_leads
SET crm_status = CASE lead_status::text
  WHEN 'Pitched' THEN 'contacted'
  WHEN 'Warm' THEN 'qualified'
  WHEN 'Replied' THEN 'replied'
  WHEN 'Rejected' THEN 'lost'
  ELSE 'new'
END
WHERE crm_status = 'new';

DO $$ BEGIN
  ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_priority_check
    CHECK (priority IN ('low','normal','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.catalogue_leads ADD CONSTRAINT catalogue_leads_priority_check
    CHECK (priority IN ('low','normal','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.b2b_leads ADD CONSTRAINT b2b_leads_priority_check
    CHECK (priority IN ('low','normal','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_sample_status_check
    CHECK (sample_status IN ('not_requested','requested','in_development','sent','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.catalogue_leads ADD CONSTRAINT catalogue_leads_sample_status_check
    CHECK (sample_status IN ('not_requested','requested','in_development','sent','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.b2b_leads ADD CONSTRAINT b2b_leads_sample_status_check
    CHECK (sample_status IN ('not_requested','requested','in_development','sent','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.b2b_leads ADD CONSTRAINT b2b_leads_crm_status_check
    CHECK (crm_status IN (
      'new','read','unqualified','qualified','contacted','replied',
      'sample_requested','quote_requested','quotation_sent','negotiation',
      'follow_up','won','lost','spam'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS inquiries_crm_status_priority_idx
  ON public.inquiries (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_follow_up_idx
  ON public.inquiries (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS catalogue_leads_crm_status_priority_idx
  ON public.catalogue_leads (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS catalogue_leads_follow_up_idx
  ON public.catalogue_leads (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS b2b_leads_crm_status_priority_idx
  ON public.b2b_leads (crm_status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS b2b_leads_follow_up_idx
  ON public.b2b_leads (follow_up_at) WHERE follow_up_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_inquiries_crm_updated ON public.inquiries;
CREATE TRIGGER trg_inquiries_crm_updated
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();