-- Phase 6.2: QC inspections, defect/rework control, sample decisions and private evidence.
-- Repository source only. Apply during the single final owner-approved backend activation.

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS quality_risk text NOT NULL DEFAULT 'attention' CHECK (quality_risk IN ('clear','attention','blocked')),
  ADD COLUMN IF NOT EXISTS quality_release_status text NOT NULL DEFAULT 'not_ready' CHECK (quality_release_status IN ('not_ready','ready_for_owner_review','approved','rejected')),
  ADD COLUMN IF NOT EXISTS quality_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.production_qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  operation_id uuid REFERENCES public.production_operations(id) ON DELETE SET NULL,
  inspection_number text NOT NULL UNIQUE,
  inspection_type text NOT NULL CHECK (inspection_type IN ('incoming','inline','final','sample','pre_shipment')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','passed','conditional','rework_required','failed','closed')),
  inspected_quantity integer NOT NULL DEFAULT 0 CHECK (inspected_quantity >= 0),
  passed_quantity integer NOT NULL DEFAULT 0 CHECK (passed_quantity >= 0),
  failed_quantity integer NOT NULL DEFAULT 0 CHECK (failed_quantity >= 0),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  measurement_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspector_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  notes text,
  owner_review_status text NOT NULL DEFAULT 'not_required' CHECK (owner_review_status IN ('not_required','pending','approved','rejected')),
  owner_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_reviewed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_qc_inspection_counts CHECK (passed_quantity + failed_quantity <= inspected_quantity),
  CONSTRAINT production_qc_checklist_object CHECK (jsonb_typeof(checklist) = 'object'),
  CONSTRAINT production_qc_measurement_object CHECK (jsonb_typeof(measurement_summary) = 'object')
);

CREATE TABLE IF NOT EXISTS public.production_qc_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  inspection_id uuid NOT NULL REFERENCES public.production_qc_inspections(id) ON DELETE CASCADE,
  defect_code text,
  defect_category text NOT NULL DEFAULT 'workmanship',
  description text NOT NULL,
  location text,
  severity text NOT NULL CHECK (severity IN ('minor','major','critical')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  root_cause text,
  corrective_action text,
  rework_status text NOT NULL DEFAULT 'open' CHECK (rework_status IN ('open','assigned','in_progress','verified','closed','waived')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_sample_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  sample_round integer NOT NULL DEFAULT 1 CHECK (sample_round > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','internal_review','buyer_review','approved','changes_requested','rejected','archived')),
  decision_source text NOT NULL DEFAULT 'internal' CHECK (decision_source IN ('internal','buyer')),
  decision_reference text,
  approved_specification_reference text,
  decision_at timestamptz,
  notes text,
  owner_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_job_id, sample_round)
);

CREATE TABLE IF NOT EXISTS public.production_evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES public.production_qc_inspections(id) ON DELETE SET NULL,
  defect_id uuid REFERENCES public.production_qc_defects(id) ON DELETE SET NULL,
  sample_approval_id uuid REFERENCES public.production_sample_approvals(id) ON DELETE SET NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN ('inspection_photo','defect_photo','measurement_sheet','tech_pack','sample_photo','buyer_approval','shipping_document','other')),
  storage_bucket text NOT NULL DEFAULT 'production-evidence' CHECK (storage_bucket = 'production-evidence'),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  checksum_sha256 text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  evidence_note text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_qc_job_time_idx ON public.production_qc_inspections (production_job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS production_qc_status_idx ON public.production_qc_inspections (status, inspection_type, created_at DESC);
CREATE INDEX IF NOT EXISTS production_defect_job_status_idx ON public.production_qc_defects (production_job_id, rework_status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS production_defect_inspection_idx ON public.production_qc_defects (inspection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS production_sample_job_round_idx ON public.production_sample_approvals (production_job_id, sample_round DESC);
CREATE INDEX IF NOT EXISTS production_evidence_job_time_idx ON public.production_evidence_files (production_job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS production_evidence_link_idx ON public.production_evidence_files (inspection_id, defect_id, sample_approval_id);

ALTER TABLE public.production_qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_qc_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_sample_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_evidence_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY production_qc_admin_all ON public.production_qc_inspections
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_defects_admin_all ON public.production_qc_defects
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_samples_admin_all ON public.production_sample_approvals
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_evidence_admin_read ON public.production_evidence_files
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_evidence_admin_insert ON public.production_evidence_files
    FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND uploaded_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_qc_inspections, public.production_qc_defects, public.production_sample_approvals TO authenticated;
GRANT SELECT, INSERT ON public.production_evidence_files TO authenticated;
GRANT ALL ON public.production_qc_inspections, public.production_qc_defects, public.production_sample_approvals, public.production_evidence_files TO service_role;
REVOKE ALL ON public.production_qc_inspections, public.production_qc_defects, public.production_sample_approvals, public.production_evidence_files FROM anon;

DROP TRIGGER IF EXISTS trg_production_qc_updated ON public.production_qc_inspections;
CREATE TRIGGER trg_production_qc_updated BEFORE UPDATE ON public.production_qc_inspections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_production_defects_updated ON public.production_qc_defects;
CREATE TRIGGER trg_production_defects_updated BEFORE UPDATE ON public.production_qc_defects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_production_samples_updated ON public.production_sample_approvals;
CREATE TRIGGER trg_production_samples_updated BEFORE UPDATE ON public.production_sample_approvals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-evidence',
  'production-evidence',
  false,
  20971520,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY production_evidence_objects_admin_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'production-evidence' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_evidence_objects_admin_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'production-evidence' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_evidence_objects_admin_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'production-evidence' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'production-evidence' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_evidence_objects_admin_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'production-evidence' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.production_create_qc_inspection(
  _job_id uuid,
  _inspection_type text,
  _status text,
  _inspected_quantity integer,
  _passed_quantity integer,
  _failed_quantity integer,
  _notes text DEFAULT NULL
)
RETURNS public.production_qc_inspections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.production_qc_inspections;
  _number text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _inspection_type NOT IN ('incoming','inline','final','sample','pre_shipment') THEN RAISE EXCEPTION 'invalid inspection type'; END IF;
  IF _status NOT IN ('draft','in_progress','passed','conditional','rework_required','failed','closed') THEN RAISE EXCEPTION 'invalid inspection status'; END IF;
  IF _inspected_quantity < 0 OR _passed_quantity < 0 OR _failed_quantity < 0 OR _passed_quantity + _failed_quantity > _inspected_quantity THEN RAISE EXCEPTION 'invalid inspection quantities'; END IF;
  IF _status IN ('passed','conditional','rework_required','failed','closed') AND _inspected_quantity = 0 THEN RAISE EXCEPTION 'completed inspection requires inspected quantity'; END IF;
  PERFORM 1 FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;

  _number := 'QC-' || to_char(clock_timestamp(),'YYYYMMDD-HH24MISS-MS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  INSERT INTO public.production_qc_inspections(
    production_job_id,inspection_number,inspection_type,status,inspected_quantity,passed_quantity,failed_quantity,inspector_id,inspected_at,notes,owner_review_status,created_by
  ) VALUES (
    _job_id,_number,_inspection_type,_status,_inspected_quantity,_passed_quantity,_failed_quantity,auth.uid(),
    CASE WHEN _status='draft' THEN NULL ELSE now() END,NULLIF(btrim(_notes),''),
    CASE WHEN _status IN ('conditional','rework_required','failed') THEN 'pending' ELSE 'not_required' END,auth.uid()
  ) RETURNING * INTO _row;

  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_job_id,'qc_updated',_status,'QC inspection recorded. No buyer notification sent.',jsonb_build_object('inspection_id',_row.id,'inspection_number',_number,'inspection_type',_inspection_type,'buyer_notification_sent',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_add_qc_defect(
  _inspection_id uuid,
  _severity text,
  _quantity integer,
  _category text,
  _description text,
  _location text DEFAULT NULL,
  _due_at timestamptz DEFAULT NULL
)
RETURNS public.production_qc_defects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inspection public.production_qc_inspections;
  _row public.production_qc_defects;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _severity NOT IN ('minor','major','critical') THEN RAISE EXCEPTION 'invalid defect severity'; END IF;
  IF _quantity <= 0 OR char_length(btrim(COALESCE(_description,''))) < 3 THEN RAISE EXCEPTION 'valid defect quantity and description required'; END IF;
  SELECT * INTO _inspection FROM public.production_qc_inspections WHERE id=_inspection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'inspection not found'; END IF;

  INSERT INTO public.production_qc_defects(production_job_id,inspection_id,defect_category,description,location,severity,quantity,due_at,created_by)
  VALUES (_inspection.production_job_id,_inspection.id,COALESCE(NULLIF(btrim(_category),''),'workmanship'),btrim(_description),NULLIF(btrim(_location),''),_severity,_quantity,_due_at,auth.uid())
  RETURNING * INTO _row;

  UPDATE public.production_qc_inspections
  SET status=CASE WHEN _severity='critical' THEN 'failed' ELSE 'rework_required' END,
      owner_review_status='pending'
  WHERE id=_inspection.id AND status NOT IN ('closed','failed');

  UPDATE public.production_jobs SET qc_status=CASE WHEN _severity='critical' THEN 'failed' ELSE 'rework' END, quality_risk=CASE WHEN _severity='critical' THEN 'blocked' ELSE 'attention' END, quality_release_status='not_ready' WHERE id=_inspection.production_job_id;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_inspection.production_job_id,'qc_updated',_severity,'QC defect recorded. No buyer notification sent.',jsonb_build_object('inspection_id',_inspection.id,'defect_id',_row.id,'severity',_severity,'quantity',_quantity,'buyer_notification_sent',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_set_rework_status(
  _defect_id uuid,
  _status text,
  _root_cause text DEFAULT NULL,
  _corrective_action text DEFAULT NULL
)
RETURNS public.production_qc_defects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.production_qc_defects;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('open','assigned','in_progress','verified','closed','waived') THEN RAISE EXCEPTION 'invalid rework status'; END IF;
  IF _status IN ('verified','closed') AND (char_length(btrim(COALESCE(_root_cause,''))) < 3 OR char_length(btrim(COALESCE(_corrective_action,''))) < 3) THEN RAISE EXCEPTION 'root cause and corrective action required before verification'; END IF;
  UPDATE public.production_qc_defects
  SET rework_status=_status,
      root_cause=COALESCE(NULLIF(btrim(_root_cause),''),root_cause),
      corrective_action=COALESCE(NULLIF(btrim(_corrective_action),''),corrective_action),
      verified_by=CASE WHEN _status IN ('verified','closed') THEN auth.uid() ELSE verified_by END,
      verified_at=CASE WHEN _status IN ('verified','closed') THEN now() ELSE verified_at END
  WHERE id=_defect_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'defect not found'; END IF;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.production_job_id,'qc_updated',_status,'Rework status updated internally. No buyer notification sent.',jsonb_build_object('defect_id',_row.id,'buyer_notification_sent',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_record_sample_decision(
  _job_id uuid,
  _sample_round integer,
  _status text,
  _decision_source text,
  _decision_reference text DEFAULT NULL,
  _approved_specification_reference text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS public.production_sample_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.production_sample_approvals;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _sample_round <= 0 THEN RAISE EXCEPTION 'valid sample round required'; END IF;
  IF _status NOT IN ('draft','internal_review','buyer_review','approved','changes_requested','rejected','archived') THEN RAISE EXCEPTION 'invalid sample status'; END IF;
  IF _decision_source NOT IN ('internal','buyer') THEN RAISE EXCEPTION 'invalid decision source'; END IF;
  IF _status='approved' AND char_length(btrim(COALESCE(_approved_specification_reference,''))) < 3 THEN RAISE EXCEPTION 'approved specification reference required'; END IF;
  PERFORM 1 FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;

  INSERT INTO public.production_sample_approvals(
    production_job_id,sample_round,status,decision_source,decision_reference,approved_specification_reference,decision_at,notes,owner_approved_by,owner_approved_at,created_by
  ) VALUES (
    _job_id,_sample_round,_status,_decision_source,NULLIF(btrim(_decision_reference),''),NULLIF(btrim(_approved_specification_reference),''),
    CASE WHEN _status IN ('approved','changes_requested','rejected') THEN now() ELSE NULL END,NULLIF(btrim(_notes),''),
    CASE WHEN _status='approved' THEN auth.uid() ELSE NULL END,CASE WHEN _status='approved' THEN now() ELSE NULL END,auth.uid()
  )
  ON CONFLICT (production_job_id,sample_round) DO UPDATE SET
    status=EXCLUDED.status,decision_source=EXCLUDED.decision_source,decision_reference=EXCLUDED.decision_reference,
    approved_specification_reference=EXCLUDED.approved_specification_reference,decision_at=EXCLUDED.decision_at,notes=EXCLUDED.notes,
    owner_approved_by=EXCLUDED.owner_approved_by,owner_approved_at=EXCLUDED.owner_approved_at
  RETURNING * INTO _row;

  UPDATE public.production_jobs
  SET sample_status=CASE _status WHEN 'approved' THEN 'approved' WHEN 'changes_requested' THEN 'rejected' WHEN 'rejected' THEN 'rejected' WHEN 'buyer_review' THEN 'sent' ELSE sample_status END,
      buyer_approval_status=CASE _status WHEN 'approved' THEN 'approved' WHEN 'changes_requested' THEN 'changes_requested' WHEN 'rejected' THEN 'rejected' WHEN 'buyer_review' THEN 'pending' ELSE buyer_approval_status END
  WHERE id=_job_id;

  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_job_id,'sample_updated',_status,'Sample decision recorded from evidence. No automatic buyer notification sent.',jsonb_build_object('sample_approval_id',_row.id,'sample_round',_sample_round,'decision_source',_decision_source,'buyer_notification_sent',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_register_evidence(
  _job_id uuid,
  _evidence_type text,
  _storage_path text,
  _file_name text,
  _mime_type text,
  _size_bytes bigint,
  _inspection_id uuid DEFAULT NULL,
  _defect_id uuid DEFAULT NULL,
  _sample_approval_id uuid DEFAULT NULL,
  _evidence_note text DEFAULT NULL,
  _checksum_sha256 text DEFAULT NULL
)
RETURNS public.production_evidence_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.production_evidence_files;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _evidence_type NOT IN ('inspection_photo','defect_photo','measurement_sheet','tech_pack','sample_photo','buyer_approval','shipping_document','other') THEN RAISE EXCEPTION 'invalid evidence type'; END IF;
  IF _storage_path !~ ('^' || _job_id::text || '/[a-zA-Z0-9._/-]+$') OR _storage_path ~ '\.\.' THEN RAISE EXCEPTION 'invalid private storage path'; END IF;
  IF _size_bytes <= 0 OR _size_bytes > 20971520 THEN RAISE EXCEPTION 'invalid file size'; END IF;
  IF _mime_type NOT IN ('image/jpeg','image/png','image/webp','application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') THEN RAISE EXCEPTION 'unsupported file type'; END IF;
  PERFORM 1 FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  IF _inspection_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.production_qc_inspections WHERE id=_inspection_id AND production_job_id=_job_id) THEN RAISE EXCEPTION 'inspection does not belong to job'; END IF;
  IF _defect_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.production_qc_defects WHERE id=_defect_id AND production_job_id=_job_id) THEN RAISE EXCEPTION 'defect does not belong to job'; END IF;
  IF _sample_approval_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.production_sample_approvals WHERE id=_sample_approval_id AND production_job_id=_job_id) THEN RAISE EXCEPTION 'sample approval does not belong to job'; END IF;

  INSERT INTO public.production_evidence_files(
    production_job_id,inspection_id,defect_id,sample_approval_id,evidence_type,storage_path,file_name,mime_type,size_bytes,checksum_sha256,evidence_note,uploaded_by
  ) VALUES (
    _job_id,_inspection_id,_defect_id,_sample_approval_id,_evidence_type,_storage_path,btrim(_file_name),_mime_type,_size_bytes,NULLIF(btrim(_checksum_sha256),''),NULLIF(btrim(_evidence_note),''),auth.uid()
  ) RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_verify_evidence(_evidence_id uuid, _status text)
RETURNS public.production_evidence_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.production_evidence_files;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'invalid verification status'; END IF;
  UPDATE public.production_evidence_files SET verification_status=_status,verified_by=auth.uid(),verified_at=now() WHERE id=_evidence_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'evidence file not found'; END IF;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_qc_readiness(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.production_jobs;
  _blockers text[] := ARRAY[]::text[];
  _eligible_inspections integer;
  _open_critical integer;
  _open_major integer;
  _verified_evidence integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('ready',false,'blockers',jsonb_build_array('admin access required')); END IF;
  SELECT * INTO _job FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'blockers',jsonb_build_array('production job not found')); END IF;

  SELECT count(*) INTO _eligible_inspections FROM public.production_qc_inspections
  WHERE production_job_id=_job_id
    AND inspection_type IN (CASE WHEN _job.job_type='sample' THEN 'sample' ELSE 'final' END, 'pre_shipment')
    AND status IN ('passed','conditional','closed')
    AND inspected_quantity > 0
    AND passed_quantity + failed_quantity <= inspected_quantity;
  IF _eligible_inspections=0 THEN _blockers := array_append(_blockers,CASE WHEN _job.job_type='sample' THEN 'completed sample inspection' ELSE 'completed final or pre-shipment inspection' END); END IF;

  SELECT count(*) FILTER (WHERE severity='critical'), count(*) FILTER (WHERE severity='major')
  INTO _open_critical,_open_major
  FROM public.production_qc_defects
  WHERE production_job_id=_job_id AND rework_status NOT IN ('verified','closed','waived');
  IF _open_critical > 0 THEN _blockers := array_append(_blockers,_open_critical || ' open critical defect(s)'); END IF;
  IF _open_major > 0 THEN _blockers := array_append(_blockers,_open_major || ' open major defect(s)'); END IF;

  IF _job.job_type='sample' AND NOT EXISTS (
    SELECT 1 FROM public.production_sample_approvals WHERE production_job_id=_job_id AND status='approved' AND char_length(btrim(COALESCE(approved_specification_reference,''))) >= 3
  ) THEN _blockers := array_append(_blockers,'approved sample specification reference'); END IF;

  SELECT count(*) INTO _verified_evidence FROM public.production_evidence_files WHERE production_job_id=_job_id AND verification_status='verified';
  IF _verified_evidence=0 THEN _blockers := array_append(_blockers,'at least one verified private evidence file'); END IF;

  UPDATE public.production_jobs
  SET quality_risk=CASE WHEN _open_critical>0 THEN 'blocked' WHEN _open_major>0 OR cardinality(_blockers)>0 THEN 'attention' ELSE 'clear' END,
      quality_release_status=CASE WHEN cardinality(_blockers)=0 THEN 'ready_for_owner_review' ELSE 'not_ready' END
  WHERE id=_job_id;

  RETURN jsonb_build_object('ready',cardinality(_blockers)=0,'blockers',to_jsonb(_blockers),'verified_evidence',_verified_evidence,'open_critical',_open_critical,'open_major',_open_major);
END;
$$;

CREATE OR REPLACE FUNCTION public.production_owner_close_qc(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _check jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.production_jobs WHERE id=_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  _check := public.production_qc_readiness(_job_id);
  IF COALESCE((_check->>'ready')::boolean,false)=false THEN RAISE EXCEPTION 'QC release blocked: %',COALESCE(_check->'blockers','[]'::jsonb)::text; END IF;

  UPDATE public.production_jobs SET qc_status='passed',quality_risk='clear',quality_release_status='approved',quality_released_at=now(),quality_released_by=auth.uid() WHERE id=_job_id;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_job_id,'qc_updated','passed','Owner approved internal QC release from verified evidence. No buyer notification or shipment action executed.',jsonb_build_object('owner_approval',true,'buyer_notification_sent',false,'shipment_booked',false),auth.uid());
  RETURN jsonb_build_object('ok',true,'job_id',_job_id,'quality_release_status','approved','released_at',now());
END;
$$;

REVOKE ALL ON FUNCTION public.production_create_qc_inspection(uuid,text,text,integer,integer,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_add_qc_defect(uuid,text,integer,text,text,text,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_set_rework_status(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_record_sample_decision(uuid,integer,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_register_evidence(uuid,text,text,text,text,bigint,uuid,uuid,uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_verify_evidence(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_qc_readiness(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_owner_close_qc(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_create_qc_inspection(uuid,text,text,integer,integer,integer,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_add_qc_defect(uuid,text,integer,text,text,text,timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_set_rework_status(uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_record_sample_decision(uuid,integer,text,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_register_evidence(uuid,text,text,text,text,bigint,uuid,uuid,uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_verify_evidence(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_qc_readiness(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_owner_close_qc(uuid) TO authenticated, service_role;

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
  job.quality_risk,
  job.quality_release_status,
  job.quality_released_at,
  job.updated_at,
  COALESCE(inspection.inspection_count,0) AS inspection_count,
  COALESCE(inspection.passed_inspections,0) AS passed_inspections,
  COALESCE(defect.open_defects,0) AS open_defects,
  COALESCE(defect.open_major,0) AS open_major,
  COALESCE(defect.open_critical,0) AS open_critical,
  COALESCE(evidence.evidence_count,0) AS evidence_count,
  COALESCE(evidence.verified_evidence,0) AS verified_evidence,
  sample.latest_sample_status,
  sample.latest_sample_round,
  sample.approved_specification_reference
FROM public.production_jobs job
LEFT JOIN LATERAL (
  SELECT count(*) AS inspection_count,count(*) FILTER (WHERE status IN ('passed','conditional','closed')) AS passed_inspections
  FROM public.production_qc_inspections value WHERE value.production_job_id=job.id
) inspection ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE rework_status NOT IN ('verified','closed','waived')) AS open_defects,
         count(*) FILTER (WHERE rework_status NOT IN ('verified','closed','waived') AND severity='major') AS open_major,
         count(*) FILTER (WHERE rework_status NOT IN ('verified','closed','waived') AND severity='critical') AS open_critical
  FROM public.production_qc_defects value WHERE value.production_job_id=job.id
) defect ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS evidence_count,count(*) FILTER (WHERE verification_status='verified') AS verified_evidence
  FROM public.production_evidence_files value WHERE value.production_job_id=job.id
) evidence ON true
LEFT JOIN LATERAL (
  SELECT status AS latest_sample_status,sample_round AS latest_sample_round,approved_specification_reference
  FROM public.production_sample_approvals value WHERE value.production_job_id=job.id ORDER BY sample_round DESC,created_at DESC LIMIT 1
) sample ON true
WHERE public.has_role(auth.uid(),'admin');

GRANT SELECT ON public.production_quality_summary TO authenticated;
