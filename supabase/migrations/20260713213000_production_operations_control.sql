-- Phase 6.1: production control center, material plan, operations and internal tasks.
-- Source only. Apply in the final owner-approved backend activation batch.

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS order_reference text,
  ADD COLUMN IF NOT EXISTS production_plan_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS planned_start_date date,
  ADD COLUMN IF NOT EXISTS internal_ship_target date,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'attention',
  ADD COLUMN IF NOT EXISTS completion_percent integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.production_jobs
    ADD CONSTRAINT production_jobs_plan_status_check
    CHECK (production_plan_status IN ('draft','ready_for_release','released','on_hold','completed','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.production_jobs
    ADD CONSTRAINT production_jobs_risk_level_check
    CHECK (risk_level IN ('clear','attention','blocked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.production_jobs
    ADD CONSTRAINT production_jobs_completion_percent_check
    CHECK (completion_percent BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.production_material_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  material_code text,
  material_name text NOT NULL,
  material_category text NOT NULL DEFAULT 'other' CHECK (material_category IN (
    'fabric','leather','lining','thread','zipper','button','label','packaging','trim','print','embroidery','other'
  )),
  specification text,
  required_quantity numeric(14,3) NOT NULL CHECK (required_quantity > 0),
  available_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  unit text NOT NULL DEFAULT 'pcs',
  critical boolean NOT NULL DEFAULT true,
  procurement_status text NOT NULL DEFAULT 'not_ordered' CHECK (procurement_status IN (
    'not_ordered','quoted','ordered','partial','available','blocked'
  )),
  supplier_reference text,
  expected_date date,
  blocker_note text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_job_id, material_name, specification)
);

CREATE TABLE IF NOT EXISTS public.production_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  operation_code text,
  operation_name text NOT NULL,
  stage text NOT NULL CHECK (stage IN (
    'briefing','spec_locked','material_sourcing','cutting','printing_embroidery','stitching',
    'finishing','qc','packing','ready_to_ship','shipped','buyer_approved','completed'
  )),
  work_center text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned','ready','in_progress','blocked','qc_hold','completed','skipped'
  )),
  blocker_note text,
  evidence_required boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_job_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS public.production_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  operation_id uuid REFERENCES public.production_operations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done','cancelled')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  blocker_note text,
  evidence_required boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_material_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_operations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_tasks TO authenticated;
GRANT ALL ON public.production_material_requirements, public.production_operations, public.production_tasks TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage production materials" ON public.production_material_requirements
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage production operations" ON public.production_operations
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage production tasks" ON public.production_tasks
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_production_materials_updated ON public.production_material_requirements;
CREATE TRIGGER trg_production_materials_updated
  BEFORE UPDATE ON public.production_material_requirements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_production_operations_updated ON public.production_operations;
CREATE TRIGGER trg_production_operations_updated
  BEFORE UPDATE ON public.production_operations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_production_tasks_updated ON public.production_tasks;
CREATE TRIGGER trg_production_tasks_updated
  BEFORE UPDATE ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS production_materials_job_status_idx
  ON public.production_material_requirements (production_job_id, critical DESC, procurement_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS production_operations_job_sequence_idx
  ON public.production_operations (production_job_id, sequence_no);
CREATE INDEX IF NOT EXISTS production_operations_status_due_idx
  ON public.production_operations (status, planned_end)
  WHERE status NOT IN ('completed','skipped');
CREATE INDEX IF NOT EXISTS production_tasks_job_status_idx
  ON public.production_tasks (production_job_id, status, priority, due_at);
CREATE INDEX IF NOT EXISTS production_tasks_due_idx
  ON public.production_tasks (due_at, status)
  WHERE status NOT IN ('done','cancelled');

ALTER TABLE public.production_job_events
  DROP CONSTRAINT IF EXISTS production_job_events_event_type_check;
ALTER TABLE public.production_job_events
  ADD CONSTRAINT production_job_events_event_type_check CHECK (event_type IN (
    'created','stage_changed','note_added','qc_updated','buyer_approval_updated',
    'sample_updated','shipping_updated','owner_approved','notification_recorded',
    'production_released','material_updated','operation_updated','task_updated','risk_changed'
  ));

CREATE OR REPLACE VIEW public.production_control_summary
WITH (security_invoker=true)
AS
SELECT
  job.id AS production_job_id,
  job.job_number,
  job.job_type,
  job.buyer_name,
  job.company_name,
  job.product_name,
  job.quantity_text,
  job.specification_reference,
  job.stage,
  job.priority,
  job.internal_target_date,
  job.internal_ship_target,
  job.production_plan_status,
  job.risk_level,
  job.completion_percent,
  job.released_at,
  COALESCE(materials.material_count,0) AS material_count,
  COALESCE(materials.critical_shortages,0) AS critical_shortages,
  COALESCE(materials.total_shortages,0) AS total_shortages,
  COALESCE(operations.operation_count,0) AS operation_count,
  COALESCE(operations.completed_operations,0) AS completed_operations,
  COALESCE(operations.blocked_operations,0) AS blocked_operations,
  COALESCE(tasks.open_tasks,0) AS open_tasks,
  COALESCE(tasks.blocked_tasks,0) AS blocked_tasks,
  COALESCE(tasks.overdue_tasks,0) AS overdue_tasks,
  job.updated_at
FROM public.production_jobs job
LEFT JOIN LATERAL (
  SELECT
    count(*) AS material_count,
    count(*) FILTER (WHERE critical AND (procurement_status='blocked' OR available_quantity < required_quantity)) AS critical_shortages,
    count(*) FILTER (WHERE available_quantity < required_quantity) AS total_shortages
  FROM public.production_material_requirements material
  WHERE material.production_job_id=job.id
) materials ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) AS operation_count,
    count(*) FILTER (WHERE status IN ('completed','skipped')) AS completed_operations,
    count(*) FILTER (WHERE status='blocked') AS blocked_operations
  FROM public.production_operations operation
  WHERE operation.production_job_id=job.id
) operations ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE status NOT IN ('done','cancelled')) AS open_tasks,
    count(*) FILTER (WHERE status='blocked') AS blocked_tasks,
    count(*) FILTER (WHERE status NOT IN ('done','cancelled') AND due_at < now()) AS overdue_tasks
  FROM public.production_tasks task
  WHERE task.production_job_id=job.id
) tasks ON true
WHERE public.has_role(auth.uid(), 'admin');

GRANT SELECT ON public.production_control_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.production_release_readiness(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.production_jobs;
  _material_count integer;
  _critical_shortages integer;
  _operation_count integer;
  _blocked_operations integer;
  _blocked_tasks integer;
  _missing text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _job FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;

  SELECT count(*), count(*) FILTER (
    WHERE critical AND (procurement_status='blocked' OR available_quantity < required_quantity)
  ) INTO _material_count, _critical_shortages
  FROM public.production_material_requirements WHERE production_job_id=_job_id;

  SELECT count(*), count(*) FILTER (WHERE status='blocked')
  INTO _operation_count, _blocked_operations
  FROM public.production_operations WHERE production_job_id=_job_id;

  SELECT count(*) FILTER (WHERE status='blocked') INTO _blocked_tasks
  FROM public.production_tasks WHERE production_job_id=_job_id;

  IF char_length(btrim(COALESCE(_job.specification_reference,''))) < 2 THEN
    _missing := array_append(_missing,'approved specification reference');
  END IF;
  IF _material_count=0 THEN _missing := array_append(_missing,'material requirements'); END IF;
  IF _critical_shortages>0 THEN _missing := array_append(_missing,'critical material coverage'); END IF;
  IF _operation_count=0 THEN _missing := array_append(_missing,'production operations'); END IF;
  IF _blocked_operations>0 THEN _missing := array_append(_missing,'blocked operations'); END IF;
  IF _blocked_tasks>0 THEN _missing := array_append(_missing,'blocked tasks'); END IF;

  RETURN jsonb_build_object(
    'ready', cardinality(_missing)=0,
    'missing', to_jsonb(_missing),
    'material_count', _material_count,
    'critical_shortages', _critical_shortages,
    'operation_count', _operation_count,
    'blocked_operations', _blocked_operations,
    'blocked_tasks', _blocked_tasks
  );
END;
$$;

REVOKE ALL ON FUNCTION public.production_release_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_release_readiness(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_release_job(_job_id uuid, _owner_note text DEFAULT NULL)
RETURNS public.production_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.production_jobs;
  _readiness jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _job FROM public.production_jobs WHERE id=_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  IF _job.stage IN ('completed','cancelled') OR _job.production_plan_status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'closed production job cannot be released';
  END IF;

  _readiness := public.production_release_readiness(_job_id);
  IF NOT COALESCE((_readiness->>'ready')::boolean,false) THEN
    RAISE EXCEPTION 'production plan is not ready: %', array_to_string(ARRAY(SELECT jsonb_array_elements_text(_readiness->'missing')), ', ');
  END IF;

  UPDATE public.production_jobs
  SET production_plan_status='released',
      released_at=now(),
      released_by=auth.uid(),
      owner_approval_required=false,
      owner_approved_at=now(),
      owner_approved_by=auth.uid(),
      risk_level='clear'
  WHERE id=_job_id
  RETURNING * INTO _job;

  INSERT INTO public.production_job_events(
    production_job_id,event_type,from_value,to_value,note,evidence,created_by
  ) VALUES (
    _job_id,'production_released','draft','released',
    COALESCE(NULLIF(btrim(_owner_note),''),'Owner approved internal production release. No buyer notification sent.'),
    jsonb_build_object('readiness',_readiness,'buyer_notification_sent',false),auth.uid()
  );

  RETURN _job;
END;
$$;

REVOKE ALL ON FUNCTION public.production_release_job(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_release_job(uuid,text) TO authenticated, service_role;

COMMENT ON TABLE public.production_material_requirements IS
  'Internal BOM and material-availability plan for sample and production jobs.';
COMMENT ON TABLE public.production_operations IS
  'Sequenced internal work-center operations. Status changes do not notify buyers.';
COMMENT ON TABLE public.production_tasks IS
  'Internal production tasks, blockers and evidence requirements.';
COMMENT ON VIEW public.production_control_summary IS
  'Admin-only operational summary built from exact production, material, operation and task records.';
