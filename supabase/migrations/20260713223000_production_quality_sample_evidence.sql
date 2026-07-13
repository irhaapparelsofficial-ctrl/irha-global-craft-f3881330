-- Phase 6.2: QC inspections, defects/rework, sample approvals and private production evidence.
-- Source only. Apply during the final owner-approved backend activation batch.

CREATE TABLE IF NOT EXISTS public.production_qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  inspection_number text NOT NULL UNIQUE,
  inspection_type text NOT NULL CHECK (inspection_type IN ('incoming','inline','final','sample','packing')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','passed','conditional','failed','cancelled')),
  reference_standard text NOT NULL CHECK (char_length(btrim(reference_standard)) BETWEEN 2 AND 500),
  lot_size_text text,
  sample_size integer CHECK (sample_size IS NULL OR sample_size > 0),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  inspector_name text,
  result_summary text,
  owner_reviewed_at timestamptz,
  owner_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_qc_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.production_qc_inspections(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  category text NOT NULL CHECK (category IN ('material','measurement','workmanship','color','printing','embroidery','labeling','packing','function','other')),
  requirement text NOT NULL CHECK (char_length(btrim(requirement)) BETWEEN 2 AND 1000),
  tolerance_text text,
  required boolean NOT NULL DEFAULT true,
  result text NOT NULL DEFAULT 'not_checked' CHECK (result IN ('not_checked','pass','fail','na')),
  measurement_value text,
  notes text,
  inspected_at timestamptz,
  inspected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS public.production_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES public.production_qc_inspections(id) ON DELETE SET NULL,
  checkpoint_id uuid REFERENCES public.production_qc_checkpoints(id) ON DELETE SET NULL,
  defect_code text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('material','measurement','workmanship','color','printing','embroidery','labeling','packing','function','other')),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 2000),
  severity text NOT NULL CHECK (severity IN ('critical','major','minor')),
  quantity_affected integer NOT NULL DEFAULT 1 CHECK (quantity_affected > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','rework','in_review','accepted','closed')),
  root_cause text,
  corrective_action text,
  owner_acceptance_note text,
  due_at timestamptz,
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_rework_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id uuid NOT NULL REFERENCES public.production_defects(id) ON DELETE CASCADE,
  action_text text NOT NULL CHECK (char_length(btrim(action_text)) BETWEEN 2 AND 2000),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','verification','verified','rejected','cancelled')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  verification_note text,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_sample_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  round_no integer NOT NULL CHECK (round_no > 0),
  sample_type text NOT NULL CHECK (sample_type IN ('development','fit','size_set','pre_production','sales','shipment','other')),
  sample_reference text NOT NULL CHECK (char_length(btrim(sample_reference)) BETWEEN 2 AND 500),
  workflow_status text NOT NULL DEFAULT 'preparing' CHECK (workflow_status IN ('preparing','internal_review','ready_for_buyer','sent','feedback_received','closed','cancelled')),
  internal_decision text NOT NULL DEFAULT 'pending' CHECK (internal_decision IN ('pending','approved','changes_requested','rejected')),
  buyer_decision text NOT NULL DEFAULT 'not_requested' CHECK (buyer_decision IN ('not_requested','pending','approved','changes_requested','rejected')),
  due_at timestamptz,
  submitted_at timestamptz,
  sent_at timestamptz,
  buyer_feedback_at timestamptz,
  buyer_evidence_note text,
  buyer_evidence_file_id uuid,
  decision_recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_job_id, round_no)
);

CREATE TABLE IF NOT EXISTS public.production_evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('job','inspection','checkpoint','defect','rework','sample')),
  entity_id uuid,
  category text NOT NULL CHECK (category IN ('qc_photo','measurement_report','sample_photo','buyer_feedback','rework_proof','packing_photo','qc_certificate','tech_reference','other')),
  bucket text NOT NULL DEFAULT 'production-private-evidence',
  object_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  checksum_sha256 text CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$'),
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_sample_approvals
  DROP CONSTRAINT IF EXISTS production_sample_approvals_buyer_evidence_file_fk;
ALTER TABLE public.production_sample_approvals
  ADD CONSTRAINT production_sample_approvals_buyer_evidence_file_fk
  FOREIGN KEY (buyer_evidence_file_id) REFERENCES public.production_evidence_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS production_qc_inspections_job_status_idx ON public.production_qc_inspections (production_job_id, inspection_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS production_qc_checkpoints_inspection_idx ON public.production_qc_checkpoints (inspection_id, sequence_no);
CREATE INDEX IF NOT EXISTS production_defects_job_status_idx ON public.production_defects (production_job_id, severity, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS production_defects_inspection_idx ON public.production_defects (inspection_id, severity, status);
CREATE INDEX IF NOT EXISTS production_rework_defect_idx ON public.production_rework_actions (defect_id, status, due_at);
CREATE INDEX IF NOT EXISTS production_samples_job_round_idx ON public.production_sample_approvals (production_job_id, round_no DESC);
CREATE INDEX IF NOT EXISTS production_evidence_job_entity_idx ON public.production_evidence_files (production_job_id, entity_type, entity_id, category, created_at DESC);

ALTER TABLE public.production_qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_qc_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_rework_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_sample_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_evidence_files ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE _table text;
BEGIN
  FOREACH _table IN ARRAY ARRAY[
    'production_qc_inspections','production_qc_checkpoints','production_defects',
    'production_rework_actions','production_sample_approvals','production_evidence_files'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=_table AND policyname=_table || '_admin_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        _table || '_admin_all', _table
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON public.production_qc_inspections, public.production_qc_checkpoints, public.production_defects,
  public.production_rework_actions, public.production_sample_approvals, public.production_evidence_files FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_qc_inspections, public.production_qc_checkpoints,
  public.production_defects, public.production_rework_actions, public.production_sample_approvals TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.production_evidence_files TO authenticated;
GRANT ALL ON public.production_qc_inspections, public.production_qc_checkpoints, public.production_defects,
  public.production_rework_actions, public.production_sample_approvals, public.production_evidence_files TO service_role;

CREATE OR REPLACE FUNCTION public.production_quality_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;
  IF TG_OP='INSERT' THEN NEW.created_by := COALESCE(NEW.created_by, auth.uid()); END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE _table text;
BEGIN
  FOREACH _table IN ARRAY ARRAY[
    'production_qc_inspections','production_qc_checkpoints','production_defects',
    'production_rework_actions','production_sample_approvals'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', _table || '_before_write', _table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.production_quality_before_write()',
      _table || '_before_write', _table
    );
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.production_quality_before_write() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.production_job_events DROP CONSTRAINT IF EXISTS production_job_events_event_type_check;
ALTER TABLE public.production_job_events ADD CONSTRAINT production_job_events_event_type_check CHECK (event_type IN (
  'created','stage_changed','note_added','qc_updated','buyer_approval_updated','sample_updated','shipping_updated',
  'owner_approved','notification_recorded','production_released','material_updated','operation_updated','task_updated','risk_changed',
  'inspection_created','inspection_completed','defect_recorded','defect_updated','rework_updated','sample_approval_updated',
  'evidence_uploaded','evidence_removed','quality_gate_checked'
));

CREATE OR REPLACE FUNCTION public.production_inspection_readiness(_inspection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inspection public.production_qc_inspections;
  _checkpoint_count integer;
  _unchecked_required integer;
  _failed_required integer;
  _open_critical integer;
  _open_major integer;
  _open_minor integer;
  _missing text[] := ARRAY[]::text[];
  _blockers text[] := ARRAY[]::text[];
  _suggested text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _inspection FROM public.production_qc_inspections WHERE id=_inspection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'inspection not found'; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE required AND result='not_checked'),
         count(*) FILTER (WHERE required AND result='fail')
  INTO _checkpoint_count, _unchecked_required, _failed_required
  FROM public.production_qc_checkpoints WHERE inspection_id=_inspection_id;

  SELECT count(*) FILTER (WHERE severity='critical' AND status NOT IN ('accepted','closed')),
         count(*) FILTER (WHERE severity='major' AND status NOT IN ('accepted','closed')),
         count(*) FILTER (WHERE severity='minor' AND status NOT IN ('accepted','closed'))
  INTO _open_critical, _open_major, _open_minor
  FROM public.production_defects WHERE inspection_id=_inspection_id;

  IF _checkpoint_count=0 THEN _missing := array_append(_missing,'inspection checkpoints'); END IF;
  IF _unchecked_required>0 THEN _missing := array_append(_missing,_unchecked_required || ' required checkpoint(s) not checked'); END IF;
  IF _failed_required>0 THEN _blockers := array_append(_blockers,_failed_required || ' required checkpoint(s) failed'); END IF;
  IF _open_critical>0 THEN _blockers := array_append(_blockers,_open_critical || ' open critical defect(s)'); END IF;
  IF _open_major>0 THEN _blockers := array_append(_blockers,_open_major || ' open major defect(s)'); END IF;

  _suggested := CASE
    WHEN cardinality(_missing)>0 OR cardinality(_blockers)>0 THEN 'failed'
    WHEN _open_minor>0 OR EXISTS (
      SELECT 1 FROM public.production_qc_checkpoints WHERE inspection_id=_inspection_id AND NOT required AND result='fail'
    ) THEN 'conditional'
    ELSE 'passed'
  END;

  RETURN jsonb_build_object(
    'complete', cardinality(_missing)=0,
    'passable', cardinality(_missing)=0 AND cardinality(_blockers)=0,
    'missing', to_jsonb(_missing),
    'blockers', to_jsonb(_blockers),
    'suggested_status', _suggested,
    'checkpoint_count', _checkpoint_count,
    'unchecked_required', _unchecked_required,
    'failed_required', _failed_required,
    'open_critical', _open_critical,
    'open_major', _open_major,
    'open_minor', _open_minor
  );
END;
$$;

REVOKE ALL ON FUNCTION public.production_inspection_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_inspection_readiness(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_finalize_inspection(_inspection_id uuid, _owner_note text DEFAULT NULL)
RETURNS public.production_qc_inspections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inspection public.production_qc_inspections;
  _readiness jsonb;
  _status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _inspection FROM public.production_qc_inspections WHERE id=_inspection_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inspection not found'; END IF;
  IF _inspection.status='cancelled' THEN RAISE EXCEPTION 'cancelled inspection cannot be finalized'; END IF;

  _readiness := public.production_inspection_readiness(_inspection_id);
  IF NOT COALESCE((_readiness->>'complete')::boolean,false) THEN
    RAISE EXCEPTION 'required inspection checks are incomplete: %', _readiness->'missing';
  END IF;
  _status := COALESCE(_readiness->>'suggested_status','failed');

  UPDATE public.production_qc_inspections
  SET status=_status,
      completed_at=now(),
      owner_reviewed_at=now(),
      owner_reviewed_by=auth.uid(),
      result_summary=NULLIF(btrim(_owner_note),'')
  WHERE id=_inspection_id
  RETURNING * INTO _inspection;

  UPDATE public.production_jobs
  SET qc_status=CASE WHEN _status='passed' THEN 'passed' WHEN _status='conditional' THEN 'rework' ELSE 'failed' END
  WHERE id=_inspection.production_job_id;

  INSERT INTO public.production_job_events(production_job_id,event_type,from_value,to_value,note,evidence,created_by)
  VALUES (
    _inspection.production_job_id,'inspection_completed','in_progress',_status,
    'Owner finalized QC inspection. No buyer notification sent.',
    jsonb_build_object('inspection_id',_inspection.id,'inspection_number',_inspection.inspection_number,'readiness',_readiness,'buyer_notification_sent',false),
    auth.uid()
  );
  RETURN _inspection;
END;
$$;

REVOKE ALL ON FUNCTION public.production_finalize_inspection(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_finalize_inspection(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_record_sample_buyer_decision(
  _sample_id uuid,
  _decision text,
  _evidence_note text,
  _evidence_file_id uuid DEFAULT NULL
)
RETURNS public.production_sample_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sample public.production_sample_approvals;
  _file public.production_evidence_files;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;
  IF _decision NOT IN ('approved','changes_requested','rejected') THEN RAISE EXCEPTION 'invalid buyer decision'; END IF;
  IF char_length(btrim(COALESCE(_evidence_note,''))) < 5 AND _evidence_file_id IS NULL THEN
    RAISE EXCEPTION 'buyer decision evidence note or private evidence file required';
  END IF;

  SELECT * INTO _sample FROM public.production_sample_approvals WHERE id=_sample_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'sample approval record not found'; END IF;
  IF _sample.workflow_status IN ('cancelled') THEN RAISE EXCEPTION 'cancelled sample cannot receive a buyer decision'; END IF;

  IF _evidence_file_id IS NOT NULL THEN
    SELECT * INTO _file FROM public.production_evidence_files WHERE id=_evidence_file_id;
    IF NOT FOUND OR _file.production_job_id<>_sample.production_job_id OR _file.category<>'buyer_feedback' THEN
      RAISE EXCEPTION 'buyer feedback evidence file does not match this production job';
    END IF;
  END IF;

  UPDATE public.production_sample_approvals
  SET buyer_decision=_decision,
      buyer_evidence_note=NULLIF(btrim(_evidence_note),''),
      buyer_evidence_file_id=_evidence_file_id,
      buyer_feedback_at=now(),
      decision_recorded_by=auth.uid(),
      workflow_status=CASE WHEN _decision='approved' THEN 'closed' ELSE 'feedback_received' END
  WHERE id=_sample_id
  RETURNING * INTO _sample;

  UPDATE public.production_jobs
  SET buyer_approval_status=_decision,
      sample_status=CASE WHEN _decision='approved' THEN 'approved' WHEN _decision='changes_requested' THEN 'rejected' ELSE 'rejected' END
  WHERE id=_sample.production_job_id;

  INSERT INTO public.production_job_events(production_job_id,event_type,from_value,to_value,note,evidence,created_by)
  VALUES (
    _sample.production_job_id,'sample_approval_updated','pending',_decision,
    'Owner recorded buyer sample decision from retained evidence. No message was sent.',
    jsonb_build_object('sample_id',_sample.id,'round_no',_sample.round_no,'evidence_file_id',_evidence_file_id,'buyer_notification_sent',false),
    auth.uid()
  );
  RETURN _sample;
END;
$$;

REVOKE ALL ON FUNCTION public.production_record_sample_buyer_decision(uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_record_sample_buyer_decision(uuid,text,text,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_quality_gate_readiness(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.production_jobs;
  _passed_final integer;
  _open_critical integer;
  _open_major integer;
  _unverified_rework integer;
  _latest_buyer_decision text;
  _missing text[] := ARRAY[]::text[];
  _blockers text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _job FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;

  SELECT count(*) INTO _passed_final
  FROM public.production_qc_inspections
  WHERE production_job_id=_job_id
    AND inspection_type IN ('final',CASE WHEN _job.job_type='sample' THEN 'sample' ELSE 'final' END)
    AND status IN ('passed','conditional');

  SELECT count(*) FILTER (WHERE severity='critical' AND status NOT IN ('accepted','closed')),
         count(*) FILTER (WHERE severity='major' AND status NOT IN ('accepted','closed'))
  INTO _open_critical,_open_major
  FROM public.production_defects WHERE production_job_id=_job_id;

  SELECT count(*) INTO _unverified_rework
  FROM public.production_rework_actions action
  JOIN public.production_defects defect ON defect.id=action.defect_id
  WHERE defect.production_job_id=_job_id
    AND defect.severity IN ('critical','major')
    AND action.status NOT IN ('verified','cancelled');

  SELECT buyer_decision INTO _latest_buyer_decision
  FROM public.production_sample_approvals
  WHERE production_job_id=_job_id
  ORDER BY round_no DESC LIMIT 1;

  IF _passed_final=0 THEN _missing := array_append(_missing,CASE WHEN _job.job_type='sample' THEN 'passed sample/final inspection' ELSE 'passed final inspection' END); END IF;
  IF _open_critical>0 THEN _blockers := array_append(_blockers,_open_critical || ' open critical defect(s)'); END IF;
  IF _open_major>0 THEN _blockers := array_append(_blockers,_open_major || ' open major defect(s)'); END IF;
  IF _unverified_rework>0 THEN _blockers := array_append(_blockers,_unverified_rework || ' serious rework action(s) not verified'); END IF;
  IF _latest_buyer_decision IN ('changes_requested','rejected') THEN _blockers := array_append(_blockers,'latest buyer sample decision requires changes'); END IF;

  INSERT INTO public.production_job_events(production_job_id,event_type,note,evidence,created_by)
  VALUES (
    _job_id,'quality_gate_checked','Internal quality gate checked. No buyer notification sent.',
    jsonb_build_object('missing',_missing,'blockers',_blockers,'latest_buyer_decision',_latest_buyer_decision,'buyer_notification_sent',false),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'ready', cardinality(_missing)=0 AND cardinality(_blockers)=0,
    'missing', to_jsonb(_missing),
    'blockers', to_jsonb(_blockers),
    'passed_final_inspections', _passed_final,
    'open_critical', _open_critical,
    'open_major', _open_major,
    'unverified_rework', _unverified_rework,
    'latest_buyer_decision', _latest_buyer_decision,
    'buyer_approval_confirmed', _latest_buyer_decision='approved'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.production_quality_gate_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_quality_gate_readiness(uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.production_quality_summary
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
  job.stage,
  job.qc_status,
  job.sample_status,
  job.buyer_approval_status,
  COALESCE(inspection.inspection_count,0) AS inspection_count,
  COALESCE(inspection.failed_inspections,0) AS failed_inspections,
  COALESCE(defect.open_defects,0) AS open_defects,
  COALESCE(defect.open_critical,0) AS open_critical,
  COALESCE(defect.open_major,0) AS open_major,
  COALESCE(defect.open_minor,0) AS open_minor,
  COALESCE(rework.pending_rework,0) AS pending_rework,
  COALESCE(sample.sample_rounds,0) AS sample_rounds,
  sample.latest_buyer_decision,
  COALESCE(evidence.file_count,0) AS evidence_file_count,
  job.updated_at
FROM public.production_jobs job
LEFT JOIN LATERAL (
  SELECT count(*) AS inspection_count,
         count(*) FILTER (WHERE status='failed') AS failed_inspections
  FROM public.production_qc_inspections value WHERE value.production_job_id=job.id
) inspection ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE status NOT IN ('accepted','closed')) AS open_defects,
         count(*) FILTER (WHERE severity='critical' AND status NOT IN ('accepted','closed')) AS open_critical,
         count(*) FILTER (WHERE severity='major' AND status NOT IN ('accepted','closed')) AS open_major,
         count(*) FILTER (WHERE severity='minor' AND status NOT IN ('accepted','closed')) AS open_minor
  FROM public.production_defects value WHERE value.production_job_id=job.id
) defect ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE action.status NOT IN ('verified','cancelled')) AS pending_rework
  FROM public.production_rework_actions action
  JOIN public.production_defects defect_value ON defect_value.id=action.defect_id
  WHERE defect_value.production_job_id=job.id
) rework ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS sample_rounds,
         (array_agg(value.buyer_decision ORDER BY value.round_no DESC))[1] AS latest_buyer_decision
  FROM public.production_sample_approvals value WHERE value.production_job_id=job.id
) sample ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS file_count FROM public.production_evidence_files value WHERE value.production_job_id=job.id
) evidence ON true
WHERE public.has_role(auth.uid(),'admin');

GRANT SELECT ON public.production_quality_summary TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'production-private-evidence','production-private-evidence',false,52428800,
  ARRAY[
    'image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public=false,
  file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='production_private_evidence_admin_select') THEN
    CREATE POLICY production_private_evidence_admin_select ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id='production-private-evidence' AND public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='production_private_evidence_admin_insert') THEN
    CREATE POLICY production_private_evidence_admin_insert ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id='production-private-evidence' AND public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='production_private_evidence_admin_delete') THEN
    CREATE POLICY production_private_evidence_admin_delete ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id='production-private-evidence' AND public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

COMMENT ON TABLE public.production_qc_inspections IS 'Internal QC inspections. Final status is derived from recorded checkpoints and defects.';
COMMENT ON TABLE public.production_defects IS 'Internal defect and corrective-action evidence. Open major/critical defects block quality readiness.';
COMMENT ON TABLE public.production_sample_approvals IS 'Sample rounds and evidence-backed owner recording of buyer decisions.';
COMMENT ON TABLE public.production_evidence_files IS 'Private production evidence metadata. Files remain in a non-public bucket and use short signed URLs.';
