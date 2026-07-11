-- Irha Apparels sample and production workflow
-- Prepared for the final owner-approved backend activation batch.

CREATE TABLE IF NOT EXISTS public.production_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('sample', 'order')),
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('inquiry', 'catalogue', 'prospect', 'manual')),
  source_id UUID,
  buyer_name TEXT NOT NULL,
  company_name TEXT,
  product_name TEXT NOT NULL,
  quantity_text TEXT NOT NULL,
  specification_reference TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'briefing' CHECK (stage IN (
    'briefing', 'spec_locked', 'material_sourcing', 'cutting', 'printing_embroidery',
    'stitching', 'finishing', 'qc', 'packing', 'ready_to_ship', 'shipped',
    'buyer_approved', 'completed', 'on_hold', 'cancelled'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  internal_target_date DATE,
  buyer_target_text TEXT,
  sample_status TEXT NOT NULL DEFAULT 'not_required' CHECK (sample_status IN (
    'not_required', 'requested', 'spec_pending', 'in_development', 'qc', 'sent', 'approved', 'rejected', 'cancelled'
  )),
  buyer_approval_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (buyer_approval_status IN (
    'not_requested', 'pending', 'approved', 'changes_requested', 'rejected'
  )),
  qc_status TEXT NOT NULL DEFAULT 'not_started' CHECK (qc_status IN (
    'not_started', 'pending', 'passed', 'failed', 'rework'
  )),
  shipping_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (shipping_status IN (
    'not_ready', 'ready', 'booked', 'shipped', 'delivered', 'exception'
  )),
  courier_name TEXT,
  tracking_number TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  owner_approved_at TIMESTAMPTZ,
  owner_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_notification_status TEXT NOT NULL DEFAULT 'not_prepared' CHECK (buyer_notification_status IN (
    'not_prepared', 'draft', 'approved', 'sent', 'failed'
  )),
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
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'stage_changed', 'note_added', 'qc_updated', 'buyer_approval_updated',
    'sample_updated', 'shipping_updated', 'owner_approved', 'notification_recorded'
  )),
  from_value TEXT,
  to_value TEXT,
  note TEXT,
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

DO $$ BEGIN
  CREATE POLICY "Admins manage production jobs" ON public.production_jobs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage production job events" ON public.production_job_events
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_production_jobs_updated ON public.production_jobs;
CREATE TRIGGER trg_production_jobs_updated
  BEFORE UPDATE ON public.production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS production_jobs_stage_priority_idx
  ON public.production_jobs (stage, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS production_jobs_target_idx
  ON public.production_jobs (internal_target_date, stage)
  WHERE stage NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS production_jobs_source_idx
  ON public.production_jobs (source_type, source_id);
CREATE INDEX IF NOT EXISTS production_job_events_job_idx
  ON public.production_job_events (production_job_id, created_at DESC);

COMMENT ON TABLE public.production_jobs IS
  'Internal sample and production workflow. Buyer-facing commitments and notifications remain owner-approved.';
COMMENT ON TABLE public.production_job_events IS
  'Append-only audit history for sample, production, QC, approval and shipping status changes.';
