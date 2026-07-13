-- Phase 6.1 derived production status refresh.
-- Source only. Apply after 20260713213000_production_operations_control.sql.

CREATE OR REPLACE FUNCTION public.production_refresh_job_status_internal(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _critical_shortages integer := 0;
  _total_shortages integer := 0;
  _blocked_operations integer := 0;
  _blocked_tasks integer := 0;
  _overdue_operations integer := 0;
  _overdue_tasks integer := 0;
  _operation_count integer := 0;
  _completed_operations integer := 0;
  _target_date date;
  _risk text := 'clear';
  _progress integer := 0;
BEGIN
  IF _job_id IS NULL THEN RETURN; END IF;

  SELECT internal_target_date INTO _target_date
  FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT
    count(*) FILTER (WHERE critical AND (procurement_status='blocked' OR available_quantity < required_quantity)),
    count(*) FILTER (WHERE available_quantity < required_quantity)
  INTO _critical_shortages, _total_shortages
  FROM public.production_material_requirements
  WHERE production_job_id=_job_id;

  SELECT
    count(*),
    count(*) FILTER (WHERE status IN ('completed','skipped')),
    count(*) FILTER (WHERE status='blocked'),
    count(*) FILTER (WHERE status NOT IN ('completed','skipped') AND planned_end < now())
  INTO _operation_count, _completed_operations, _blocked_operations, _overdue_operations
  FROM public.production_operations
  WHERE production_job_id=_job_id;

  SELECT
    count(*) FILTER (WHERE status='blocked'),
    count(*) FILTER (WHERE status NOT IN ('done','cancelled') AND due_at < now())
  INTO _blocked_tasks, _overdue_tasks
  FROM public.production_tasks
  WHERE production_job_id=_job_id;

  IF _critical_shortages > 0 OR _blocked_operations > 0 OR _blocked_tasks > 0 THEN
    _risk := 'blocked';
  ELSIF _total_shortages > 0 OR _overdue_operations > 0 OR _overdue_tasks > 0
    OR (_target_date IS NOT NULL AND _target_date <= current_date + 2) THEN
    _risk := 'attention';
  END IF;

  IF _operation_count > 0 THEN
    _progress := round((_completed_operations::numeric / _operation_count::numeric) * 100)::integer;
  END IF;

  UPDATE public.production_jobs
  SET risk_level=_risk,
      completion_percent=greatest(0,least(100,_progress))
  WHERE id=_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.production_refresh_job_status_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.production_refresh_job_status_internal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.production_child_refresh_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _job_id uuid;
BEGIN
  _job_id := COALESCE(NEW.production_job_id, OLD.production_job_id);
  PERFORM public.production_refresh_job_status_internal(_job_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.production_child_refresh_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_production_material_refresh_job ON public.production_material_requirements;
CREATE TRIGGER trg_production_material_refresh_job
  AFTER INSERT OR UPDATE OR DELETE ON public.production_material_requirements
  FOR EACH ROW EXECUTE FUNCTION public.production_child_refresh_trigger();

DROP TRIGGER IF EXISTS trg_production_operation_refresh_job ON public.production_operations;
CREATE TRIGGER trg_production_operation_refresh_job
  AFTER INSERT OR UPDATE OR DELETE ON public.production_operations
  FOR EACH ROW EXECUTE FUNCTION public.production_child_refresh_trigger();

DROP TRIGGER IF EXISTS trg_production_task_refresh_job ON public.production_tasks;
CREATE TRIGGER trg_production_task_refresh_job
  AFTER INSERT OR UPDATE OR DELETE ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.production_child_refresh_trigger();

CREATE OR REPLACE FUNCTION public.production_refresh_job_status(_job_id uuid)
RETURNS public.production_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _job public.production_jobs;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE='42501';
  END IF;
  PERFORM public.production_refresh_job_status_internal(_job_id);
  SELECT * INTO _job FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  RETURN _job;
END;
$$;

REVOKE ALL ON FUNCTION public.production_refresh_job_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_refresh_job_status(uuid) TO authenticated, service_role;
