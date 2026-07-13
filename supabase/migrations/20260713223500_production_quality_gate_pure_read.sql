-- Phase 6.2 follow-up: keep quality readiness checks idempotent and side-effect free.
-- Source only. Apply after 20260713223000_production_quality_sample_evidence.sql.

CREATE OR REPLACE FUNCTION public.production_quality_gate_readiness(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
    AND (
      inspection_type='final'
      OR (_job.job_type='sample' AND inspection_type='sample')
    )
    AND status IN ('passed','conditional');

  SELECT count(*) FILTER (WHERE severity='critical' AND status NOT IN ('accepted','closed')),
         count(*) FILTER (WHERE severity='major' AND status NOT IN ('accepted','closed'))
  INTO _open_critical,_open_major
  FROM public.production_defects
  WHERE production_job_id=_job_id;

  SELECT count(*) INTO _unverified_rework
  FROM public.production_rework_actions action
  JOIN public.production_defects defect ON defect.id=action.defect_id
  WHERE defect.production_job_id=_job_id
    AND defect.severity IN ('critical','major')
    AND action.status NOT IN ('verified','cancelled');

  SELECT buyer_decision INTO _latest_buyer_decision
  FROM public.production_sample_approvals
  WHERE production_job_id=_job_id
  ORDER BY round_no DESC
  LIMIT 1;

  IF _passed_final=0 THEN
    _missing := array_append(
      _missing,
      CASE WHEN _job.job_type='sample' THEN 'passed sample/final inspection' ELSE 'passed final inspection' END
    );
  END IF;
  IF _open_critical>0 THEN _blockers := array_append(_blockers,_open_critical || ' open critical defect(s)'); END IF;
  IF _open_major>0 THEN _blockers := array_append(_blockers,_open_major || ' open major defect(s)'); END IF;
  IF _unverified_rework>0 THEN _blockers := array_append(_blockers,_unverified_rework || ' serious rework action(s) not verified'); END IF;
  IF _latest_buyer_decision IN ('changes_requested','rejected') THEN
    _blockers := array_append(_blockers,'latest buyer sample decision requires changes');
  END IF;

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

COMMENT ON FUNCTION public.production_quality_gate_readiness(uuid) IS
  'Pure admin-only readiness calculation. It creates no event, message, approval or external action.';
