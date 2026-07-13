-- Phase 6.4: delivery acceptance, commercial closeout, verified costs, repeat-order drafts and management reporting.
-- Repository source only. Apply during the single final owner-approved backend activation.

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS closeout_status text NOT NULL DEFAULT 'not_started' CHECK (closeout_status IN ('not_started','draft','review','approved','closed','reopened')),
  ADD COLUMN IF NOT EXISTS closeout_risk text NOT NULL DEFAULT 'attention' CHECK (closeout_risk IN ('clear','attention','blocked')),
  ADD COLUMN IF NOT EXISTS commercially_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS commercially_closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.production_order_closeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL UNIQUE REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.production_shipments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','closed','reopened')),
  base_currency text NOT NULL DEFAULT 'PKR' CHECK (base_currency ~ '^[A-Z]{3}$'),
  acceptance_status text NOT NULL DEFAULT 'pending' CHECK (acceptance_status IN ('pending','accepted','changes_requested','disputed','waived')),
  acceptance_reference text,
  accepted_at timestamptz,
  acceptance_notes text,
  invoice_number text,
  invoice_amount numeric(18,2) CHECK (invoice_amount IS NULL OR invoice_amount >= 0),
  invoice_currency text CHECK (invoice_currency IS NULL OR invoice_currency ~ '^[A-Z]{3}$'),
  invoice_exchange_rate_to_base numeric(18,6) NOT NULL DEFAULT 1 CHECK (invoice_exchange_rate_to_base > 0),
  payment_status text NOT NULL DEFAULT 'unknown' CHECK (payment_status IN ('unknown','not_invoiced','invoiced','part_paid','paid','overdue','disputed')),
  payment_reference text,
  payment_reviewed_at timestamptz,
  lessons_learned text,
  closeout_notes text,
  owner_review_status text NOT NULL DEFAULT 'pending' CHECK (owner_review_status IN ('pending','approved','rejected')),
  owner_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_reviewed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closeout_id uuid NOT NULL REFERENCES public.production_order_closeouts(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('material','labour','subcontract','packaging','quality','freight','duty_tax','bank_fee','overhead','claim','other')),
  description text NOT NULL,
  quantity numeric(18,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  exchange_rate_to_base numeric(18,6) NOT NULL DEFAULT 1 CHECK (exchange_rate_to_base > 0),
  amount_base numeric(18,2) GENERATED ALWAYS AS (round(quantity * unit_cost * exchange_rate_to_base, 2)) STORED,
  evidence_reference text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_closeout_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closeout_id uuid NOT NULL REFERENCES public.production_order_closeouts(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type IN ('delivery','quality','quantity','document','payment','claim','buyer_feedback','internal','other')),
  severity text NOT NULL CHECK (severity IN ('minor','major','critical')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','waived')),
  resolution text,
  owner_waiver_reason text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_repeat_order_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closeout_id uuid NOT NULL REFERENCES public.production_order_closeouts(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  source_type text,
  source_id uuid,
  buyer_name text NOT NULL,
  company_name text,
  product_name text NOT NULL,
  suggested_quantity_text text,
  reorder_cycle_days integer NOT NULL DEFAULT 120 CHECK (reorder_cycle_days BETWEEN 1 AND 1095),
  estimated_lead_time_days integer NOT NULL DEFAULT 30 CHECK (estimated_lead_time_days BETWEEN 0 AND 365),
  follow_up_due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high','normal','low','blocked')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','owner_approved','contact_prepared','contacted','won','lost','dismissed')),
  rationale text,
  outreach_draft text,
  owner_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_approved_at timestamptz,
  contacted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (closeout_id, product_name, follow_up_due_date)
);

CREATE TABLE IF NOT EXISTS public.production_closeout_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  closeout_id uuid NOT NULL REFERENCES public.production_order_closeouts(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','commercial_updated','acceptance_recorded','cost_added','cost_verified','issue_added','issue_resolved','owner_reviewed','closed','reopened','repeat_order_prepared','repeat_order_status')),
  from_value text,
  to_value text,
  note text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_closeout_job_status_idx ON public.production_order_closeouts (production_job_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS production_cost_closeout_status_idx ON public.production_cost_entries (closeout_id, verification_status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS production_closeout_issue_status_idx ON public.production_closeout_issues (closeout_id, status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS production_repeat_due_status_idx ON public.production_repeat_order_opportunities (follow_up_due_date, status, priority);
CREATE INDEX IF NOT EXISTS production_closeout_event_idx ON public.production_closeout_events (closeout_id, created_at DESC);

ALTER TABLE public.production_order_closeouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_closeout_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_repeat_order_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_closeout_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY production_closeout_admin_all ON public.production_order_closeouts
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_cost_admin_all ON public.production_cost_entries
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_closeout_issue_admin_all ON public.production_closeout_issues
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_repeat_admin_all ON public.production_repeat_order_opportunities
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_closeout_event_admin_read ON public.production_closeout_events
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_order_closeouts, public.production_cost_entries, public.production_closeout_issues, public.production_repeat_order_opportunities TO authenticated;
GRANT SELECT ON public.production_closeout_events TO authenticated;
GRANT ALL ON public.production_order_closeouts, public.production_cost_entries, public.production_closeout_issues, public.production_repeat_order_opportunities, public.production_closeout_events TO service_role;
REVOKE ALL ON public.production_order_closeouts, public.production_cost_entries, public.production_closeout_issues, public.production_repeat_order_opportunities, public.production_closeout_events FROM anon;

DROP TRIGGER IF EXISTS trg_production_closeouts_updated ON public.production_order_closeouts;
CREATE TRIGGER trg_production_closeouts_updated BEFORE UPDATE ON public.production_order_closeouts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_production_costs_updated ON public.production_cost_entries;
CREATE TRIGGER trg_production_costs_updated BEFORE UPDATE ON public.production_cost_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_production_closeout_issues_updated ON public.production_closeout_issues;
CREATE TRIGGER trg_production_closeout_issues_updated BEFORE UPDATE ON public.production_closeout_issues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_production_repeat_updated ON public.production_repeat_order_opportunities;
CREATE TRIGGER trg_production_repeat_updated BEFORE UPDATE ON public.production_repeat_order_opportunities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.production_ensure_closeout(_job_id uuid)
RETURNS public.production_order_closeouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_order_closeouts; _shipment_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  SELECT id INTO _shipment_id FROM public.production_shipments WHERE production_job_id=_job_id ORDER BY created_at DESC LIMIT 1;
  INSERT INTO public.production_order_closeouts(production_job_id,shipment_id,created_by)
  VALUES (_job_id,_shipment_id,auth.uid())
  ON CONFLICT (production_job_id) DO UPDATE SET shipment_id=COALESCE(public.production_order_closeouts.shipment_id,EXCLUDED.shipment_id)
  RETURNING * INTO _row;
  UPDATE public.production_jobs SET closeout_status=_row.status WHERE id=_job_id;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  SELECT _row.id,_job_id,'created',_row.status,'Closeout workspace prepared. No buyer communication sent.',jsonb_build_object('shipment_id',_shipment_id,'buyer_contacted',false),auth.uid()
  WHERE NOT EXISTS (SELECT 1 FROM public.production_closeout_events WHERE closeout_id=_row.id AND event_type='created');
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_update_closeout_commercial(
  _closeout_id uuid,
  _invoice_number text,
  _invoice_amount numeric,
  _invoice_currency text,
  _exchange_rate numeric,
  _payment_status text,
  _payment_reference text DEFAULT NULL,
  _lessons_learned text DEFAULT NULL,
  _closeout_notes text DEFAULT NULL
)
RETURNS public.production_order_closeouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_order_closeouts;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _invoice_amount <= 0 OR COALESCE(_invoice_number,'')='' THEN RAISE EXCEPTION 'invoice number and positive amount required'; END IF;
  IF upper(COALESCE(_invoice_currency,'')) !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'valid invoice currency required'; END IF;
  IF _exchange_rate <= 0 THEN RAISE EXCEPTION 'positive exchange rate required'; END IF;
  IF _payment_status NOT IN ('unknown','not_invoiced','invoiced','part_paid','paid','overdue','disputed') THEN RAISE EXCEPTION 'invalid payment status'; END IF;
  UPDATE public.production_order_closeouts SET
    invoice_number=btrim(_invoice_number), invoice_amount=_invoice_amount, invoice_currency=upper(_invoice_currency),
    invoice_exchange_rate_to_base=_exchange_rate, payment_status=_payment_status,
    payment_reference=NULLIF(btrim(_payment_reference),''), payment_reviewed_at=now(),
    lessons_learned=NULLIF(btrim(_lessons_learned),''), closeout_notes=NULLIF(btrim(_closeout_notes),''),
    status=CASE WHEN status IN ('closed','approved') THEN status ELSE 'review' END,
    owner_review_status=CASE WHEN status IN ('closed','approved') THEN owner_review_status ELSE 'pending' END
  WHERE id=_closeout_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'closeout not found'; END IF;
  UPDATE public.production_jobs SET closeout_status=_row.status, closeout_risk='attention' WHERE id=_row.production_job_id;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.id,_row.production_job_id,'commercial_updated',_payment_status,'Commercial closeout details updated. No payment or buyer action executed.',jsonb_build_object('invoice_number',_row.invoice_number,'currency',_row.invoice_currency,'payment_action_executed',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_record_delivery_acceptance(
  _closeout_id uuid,
  _status text,
  _reference text DEFAULT NULL,
  _accepted_at timestamptz DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS public.production_order_closeouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_order_closeouts;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('pending','accepted','changes_requested','disputed','waived') THEN RAISE EXCEPTION 'invalid acceptance status'; END IF;
  IF _status='accepted' AND (char_length(btrim(COALESCE(_reference,''))) < 3 OR _accepted_at IS NULL) THEN RAISE EXCEPTION 'accepted delivery requires reference and timestamp'; END IF;
  IF _status='waived' AND char_length(btrim(COALESCE(_notes,''))) < 6 THEN RAISE EXCEPTION 'owner waiver requires reason'; END IF;
  UPDATE public.production_order_closeouts SET
    acceptance_status=_status, acceptance_reference=NULLIF(btrim(_reference),''),
    accepted_at=CASE WHEN _status IN ('accepted','waived') THEN COALESCE(_accepted_at,now()) ELSE NULL END,
    acceptance_notes=NULLIF(btrim(_notes),''), status=CASE WHEN status='draft' THEN 'review' ELSE status END,
    owner_review_status=CASE WHEN status IN ('approved','closed') THEN owner_review_status ELSE 'pending' END
  WHERE id=_closeout_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'closeout not found'; END IF;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.id,_row.production_job_id,'acceptance_recorded',_status,'Delivery acceptance evidence recorded internally. No buyer message sent.',jsonb_build_object('reference',_row.acceptance_reference,'buyer_contacted',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_add_closeout_cost(
  _closeout_id uuid,
  _category text,
  _description text,
  _quantity numeric,
  _unit_cost numeric,
  _currency text,
  _exchange_rate numeric,
  _evidence_reference text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS public.production_cost_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _closeout public.production_order_closeouts; _row public.production_cost_entries;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _category NOT IN ('material','labour','subcontract','packaging','quality','freight','duty_tax','bank_fee','overhead','claim','other') THEN RAISE EXCEPTION 'invalid cost category'; END IF;
  IF char_length(btrim(COALESCE(_description,''))) < 3 OR _quantity <= 0 OR _unit_cost < 0 OR _exchange_rate <= 0 THEN RAISE EXCEPTION 'valid cost details required'; END IF;
  IF upper(COALESCE(_currency,'')) !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'valid currency required'; END IF;
  SELECT * INTO _closeout FROM public.production_order_closeouts WHERE id=_closeout_id;
  IF NOT FOUND OR _closeout.status='closed' THEN RAISE EXCEPTION 'open closeout required'; END IF;
  INSERT INTO public.production_cost_entries(closeout_id,production_job_id,category,description,quantity,unit_cost,currency,exchange_rate_to_base,evidence_reference,notes,created_by)
  VALUES (_closeout.id,_closeout.production_job_id,_category,btrim(_description),_quantity,_unit_cost,upper(_currency),_exchange_rate,NULLIF(btrim(_evidence_reference),''),NULLIF(btrim(_notes),''),auth.uid())
  RETURNING * INTO _row;
  UPDATE public.production_order_closeouts SET owner_review_status='pending',status=CASE WHEN status='approved' THEN 'review' ELSE status END WHERE id=_closeout.id;
  UPDATE public.production_jobs SET closeout_status='review',closeout_risk='attention' WHERE id=_closeout.production_job_id;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_closeout.id,_closeout.production_job_id,'cost_added',_category,'Cost entry added pending verification.',jsonb_build_object('cost_id',_row.id,'amount_base',_row.amount_base,'verification_status','pending'),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_verify_closeout_cost(_cost_id uuid,_status text,_note text DEFAULT NULL)
RETURNS public.production_cost_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_cost_entries;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'invalid verification status'; END IF;
  UPDATE public.production_cost_entries SET verification_status=_status,verified_by=auth.uid(),verified_at=now(),notes=COALESCE(NULLIF(btrim(_note),''),notes)
  WHERE id=_cost_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'cost entry not found'; END IF;
  UPDATE public.production_order_closeouts SET owner_review_status='pending',status=CASE WHEN status='approved' THEN 'review' ELSE status END WHERE id=_row.closeout_id;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.closeout_id,_row.production_job_id,'cost_verified',_status,'Cost evidence reviewed.',jsonb_build_object('cost_id',_row.id,'amount_base',_row.amount_base),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_add_closeout_issue(
  _closeout_id uuid,_issue_type text,_severity text,_title text,_description text DEFAULT NULL
)
RETURNS public.production_closeout_issues
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _closeout public.production_order_closeouts; _row public.production_closeout_issues;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _issue_type NOT IN ('delivery','quality','quantity','document','payment','claim','buyer_feedback','internal','other') OR _severity NOT IN ('minor','major','critical') THEN RAISE EXCEPTION 'invalid issue type or severity'; END IF;
  IF char_length(btrim(COALESCE(_title,''))) < 3 THEN RAISE EXCEPTION 'issue title required'; END IF;
  SELECT * INTO _closeout FROM public.production_order_closeouts WHERE id=_closeout_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'closeout not found'; END IF;
  INSERT INTO public.production_closeout_issues(closeout_id,production_job_id,issue_type,severity,title,description,created_by)
  VALUES (_closeout.id,_closeout.production_job_id,_issue_type,_severity,btrim(_title),NULLIF(btrim(_description),''),auth.uid()) RETURNING * INTO _row;
  UPDATE public.production_jobs SET closeout_risk=CASE WHEN _severity='critical' THEN 'blocked' ELSE 'attention' END,closeout_status='review' WHERE id=_closeout.production_job_id;
  UPDATE public.production_order_closeouts SET status='review',owner_review_status='pending' WHERE id=_closeout.id AND status<>'closed';
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_closeout.id,_closeout.production_job_id,'issue_added',_severity,'Closeout issue recorded.',jsonb_build_object('issue_id',_row.id,'issue_type',_issue_type),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_resolve_closeout_issue(_issue_id uuid,_status text,_resolution text)
RETURNS public.production_closeout_issues
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_closeout_issues;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('resolved','waived') OR char_length(btrim(COALESCE(_resolution,''))) < 5 THEN RAISE EXCEPTION 'resolution evidence required'; END IF;
  UPDATE public.production_closeout_issues SET status=_status,resolution=btrim(_resolution),owner_waiver_reason=CASE WHEN _status='waived' THEN btrim(_resolution) ELSE NULL END,resolved_by=auth.uid(),resolved_at=now()
  WHERE id=_issue_id AND status IN ('open','investigating') RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'open issue not found'; END IF;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.closeout_id,_row.production_job_id,'issue_resolved',_status,'Closeout issue resolution recorded.',jsonb_build_object('issue_id',_row.id,'resolution',_row.resolution),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_closeout_readiness(_closeout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _c public.production_order_closeouts; _shipment_status text; _delivery_evidence integer := 0;
  _verified_costs integer := 0; _unverified_costs integer := 0; _open_issues integer := 0; _critical_issues integer := 0;
  _missing text[] := ARRAY[]::text[]; _warnings text[] := ARRAY[]::text[];
  _revenue numeric := 0; _cost numeric := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO _c FROM public.production_order_closeouts WHERE id=_closeout_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'closeout not found'; END IF;
  SELECT status INTO _shipment_status FROM public.production_shipments WHERE id=_c.shipment_id;
  SELECT count(*) INTO _delivery_evidence FROM public.production_delivery_evidence WHERE shipment_id=_c.shipment_id AND verification_status='verified';
  SELECT count(*) FILTER (WHERE verification_status='verified'),count(*) FILTER (WHERE verification_status='pending') INTO _verified_costs,_unverified_costs FROM public.production_cost_entries WHERE closeout_id=_c.id;
  SELECT count(*) FILTER (WHERE status IN ('open','investigating')),count(*) FILTER (WHERE status IN ('open','investigating') AND severity='critical') INTO _open_issues,_critical_issues FROM public.production_closeout_issues WHERE closeout_id=_c.id;
  SELECT COALESCE(sum(amount_base),0) INTO _cost FROM public.production_cost_entries WHERE closeout_id=_c.id AND verification_status='verified';
  _revenue := COALESCE(_c.invoice_amount,0) * COALESCE(_c.invoice_exchange_rate_to_base,1);

  IF _shipment_status IS DISTINCT FROM 'delivered' THEN _missing := array_append(_missing,'delivered shipment status'); END IF;
  IF _delivery_evidence < 1 THEN _missing := array_append(_missing,'verified delivery evidence'); END IF;
  IF _c.acceptance_status NOT IN ('accepted','waived') THEN _missing := array_append(_missing,'buyer delivery acceptance or owner waiver'); END IF;
  IF _c.acceptance_status='accepted' AND (COALESCE(_c.acceptance_reference,'')='' OR _c.accepted_at IS NULL) THEN _missing := array_append(_missing,'acceptance reference and timestamp'); END IF;
  IF COALESCE(_c.invoice_number,'')='' OR COALESCE(_c.invoice_amount,0)<=0 OR COALESCE(_c.invoice_currency,'')='' THEN _missing := array_append(_missing,'complete invoice evidence'); END IF;
  IF _c.payment_status IN ('unknown','not_invoiced','disputed') THEN _missing := array_append(_missing,'reviewed payment status'); END IF;
  IF _verified_costs < 1 THEN _missing := array_append(_missing,'verified cost evidence'); END IF;
  IF _critical_issues > 0 THEN _missing := array_append(_missing,'resolve critical closeout issues'); END IF;
  IF _unverified_costs > 0 THEN _warnings := array_append(_warnings,'unverified cost entries remain'); END IF;
  IF _open_issues > 0 THEN _warnings := array_append(_warnings,'open non-critical closeout issues remain'); END IF;
  IF COALESCE(_c.lessons_learned,'')='' THEN _warnings := array_append(_warnings,'lessons learned not recorded'); END IF;
  IF _c.payment_status='overdue' THEN _warnings := array_append(_warnings,'payment is overdue'); END IF;
  IF _c.acceptance_status='waived' THEN _warnings := array_append(_warnings,'buyer acceptance was waived by owner'); END IF;

  RETURN jsonb_build_object(
    'ready',cardinality(_missing)=0,'missing',to_jsonb(_missing),'warnings',to_jsonb(_warnings),
    'shipment_status',_shipment_status,'verified_delivery_evidence_count',_delivery_evidence,
    'verified_cost_count',_verified_costs,'unverified_cost_count',_unverified_costs,
    'open_issue_count',_open_issues,'open_critical_issue_count',_critical_issues,
    'revenue_base',round(_revenue,2),'verified_cost_base',round(_cost,2),
    'contribution_margin_base',round(_revenue-_cost,2),
    'contribution_margin_percent',CASE WHEN _revenue>0 THEN round(((_revenue-_cost)/_revenue)*100,2) ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.production_owner_review_closeout(_closeout_id uuid,_approve boolean,_note text DEFAULT NULL)
RETURNS public.production_order_closeouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_order_closeouts; _readiness jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  _readiness := public.production_closeout_readiness(_closeout_id);
  IF _approve AND COALESCE((_readiness->>'ready')::boolean,false)=false THEN RAISE EXCEPTION 'closeout is not ready: %',_readiness->'missing'; END IF;
  UPDATE public.production_order_closeouts SET owner_review_status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,owner_reviewed_by=auth.uid(),owner_reviewed_at=now(),status=CASE WHEN _approve THEN 'approved' ELSE 'review' END,closeout_notes=COALESCE(NULLIF(btrim(_note),''),closeout_notes)
  WHERE id=_closeout_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'closeout not found'; END IF;
  UPDATE public.production_jobs SET closeout_status=_row.status,closeout_risk=CASE WHEN _approve THEN 'clear' ELSE 'attention' END WHERE id=_row.production_job_id;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.id,_row.production_job_id,'owner_reviewed',_row.owner_review_status,COALESCE(NULLIF(btrim(_note),''),'Owner closeout review recorded.'),_readiness,auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_close_order(_closeout_id uuid,_note text DEFAULT NULL)
RETURNS public.production_order_closeouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_order_closeouts; _readiness jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.production_order_closeouts WHERE id=_closeout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'closeout not found'; END IF;
  IF _row.owner_review_status<>'approved' OR _row.status<>'approved' THEN RAISE EXCEPTION 'owner-approved closeout required'; END IF;
  _readiness := public.production_closeout_readiness(_closeout_id);
  IF COALESCE((_readiness->>'ready')::boolean,false)=false THEN RAISE EXCEPTION 'closeout is not ready'; END IF;
  UPDATE public.production_order_closeouts SET status='closed',closed_by=auth.uid(),closed_at=now(),closeout_notes=COALESCE(NULLIF(btrim(_note),''),closeout_notes) WHERE id=_closeout_id RETURNING * INTO _row;
  UPDATE public.production_jobs SET closeout_status='closed',closeout_risk='clear',commercially_closed_at=now(),commercially_closed_by=auth.uid(),stage=CASE WHEN stage='cancelled' THEN stage ELSE 'completed' END WHERE id=_row.production_job_id;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.id,_row.production_job_id,'closed','closed',COALESCE(NULLIF(btrim(_note),''),'Internal commercial closeout completed. No buyer outreach sent.'),jsonb_build_object('buyer_contacted',false,'payment_executed',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_prepare_repeat_order(
  _closeout_id uuid,
  _cycle_days integer DEFAULT 120,
  _lead_time_days integer DEFAULT 30,
  _quantity_text text DEFAULT NULL,
  _rationale text DEFAULT NULL,
  _outreach_draft text DEFAULT NULL
)
RETURNS public.production_repeat_order_opportunities
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c public.production_order_closeouts; _job public.production_jobs; _row public.production_repeat_order_opportunities; _due date; _priority text; _margin numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _cycle_days<1 OR _cycle_days>1095 OR _lead_time_days<0 OR _lead_time_days>365 THEN RAISE EXCEPTION 'invalid reorder timing'; END IF;
  SELECT * INTO _c FROM public.production_order_closeouts WHERE id=_closeout_id;
  IF NOT FOUND OR _c.status<>'closed' THEN RAISE EXCEPTION 'closed order required'; END IF;
  SELECT * INTO _job FROM public.production_jobs WHERE id=_c.production_job_id;
  IF _c.acceptance_status<>'accepted' OR _c.payment_status IN ('overdue','disputed') THEN _priority:='blocked';
  ELSE
    SELECT CASE WHEN COALESCE(_c.invoice_amount,0)>0 THEN (((_c.invoice_amount*_c.invoice_exchange_rate_to_base)-COALESCE(sum(cost.amount_base) FILTER (WHERE cost.verification_status='verified'),0))/(_c.invoice_amount*_c.invoice_exchange_rate_to_base))*100 ELSE 0 END
    INTO _margin FROM public.production_cost_entries cost WHERE cost.closeout_id=_c.id;
    _priority:=CASE WHEN _c.payment_status='paid' AND _margin>=20 THEN 'high' WHEN _margin>=10 THEN 'normal' ELSE 'low' END;
  END IF;
  _due := (COALESCE(_c.accepted_at,_c.closed_at,now())::date + GREATEST(1,_cycle_days-_lead_time_days));
  INSERT INTO public.production_repeat_order_opportunities(closeout_id,production_job_id,source_type,source_id,buyer_name,company_name,product_name,suggested_quantity_text,reorder_cycle_days,estimated_lead_time_days,follow_up_due_date,priority,rationale,outreach_draft,created_by)
  VALUES (_c.id,_job.id,_job.source_type,_job.source_id,_job.buyer_name,_job.company_name,_job.product_name,COALESCE(NULLIF(btrim(_quantity_text),''),_job.quantity_text),_cycle_days,_lead_time_days,_due,_priority,NULLIF(btrim(_rationale),''),NULLIF(btrim(_outreach_draft),''),auth.uid())
  ON CONFLICT (closeout_id,product_name,follow_up_due_date) DO UPDATE SET suggested_quantity_text=EXCLUDED.suggested_quantity_text,priority=EXCLUDED.priority,rationale=EXCLUDED.rationale,outreach_draft=EXCLUDED.outreach_draft,updated_at=now()
  RETURNING * INTO _row;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_c.id,_job.id,'repeat_order_prepared','draft','Internal repeat-order opportunity prepared. No email or WhatsApp sent.',jsonb_build_object('opportunity_id',_row.id,'follow_up_due_date',_due,'buyer_contacted',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_set_repeat_order_status(_id uuid,_status text,_note text DEFAULT NULL)
RETURNS public.production_repeat_order_opportunities
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.production_repeat_order_opportunities;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('owner_approved','contact_prepared','contacted','won','lost','dismissed') THEN RAISE EXCEPTION 'invalid opportunity status'; END IF;
  UPDATE public.production_repeat_order_opportunities SET status=_status,
    owner_approved_by=CASE WHEN _status='owner_approved' THEN auth.uid() ELSE owner_approved_by END,
    owner_approved_at=CASE WHEN _status='owner_approved' THEN now() ELSE owner_approved_at END,
    contacted_at=CASE WHEN _status='contacted' THEN now() ELSE contacted_at END,
    rationale=COALESCE(NULLIF(btrim(_note),''),rationale)
  WHERE id=_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'repeat-order opportunity not found'; END IF;
  INSERT INTO public.production_closeout_events(closeout_id,production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES (_row.closeout_id,_row.production_job_id,'repeat_order_status',_status,COALESCE(NULLIF(btrim(_note),''),'Repeat-order status updated.'),jsonb_build_object('opportunity_id',_row.id,'external_send_executed',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE VIEW public.production_closeout_summary
WITH (security_invoker=true)
AS
SELECT
  c.id AS closeout_id,c.production_job_id,c.shipment_id,c.status,c.base_currency,c.acceptance_status,c.acceptance_reference,c.accepted_at,
  c.invoice_number,c.invoice_amount,c.invoice_currency,c.invoice_exchange_rate_to_base,c.payment_status,c.lessons_learned,c.owner_review_status,c.owner_reviewed_at,c.closed_at,c.updated_at,
  job.job_number,job.job_type,job.source_type,job.source_id,job.buyer_name,job.company_name,job.product_name,job.quantity_text,job.stage,job.closeout_risk,
  shipment.status AS shipment_status,shipment.delivered_at,
  COALESCE(delivery.verified_delivery_evidence_count,0) AS verified_delivery_evidence_count,
  COALESCE(costs.verified_cost_base,0) AS verified_cost_base,COALESCE(costs.pending_cost_base,0) AS pending_cost_base,
  COALESCE(costs.verified_cost_count,0) AS verified_cost_count,COALESCE(costs.pending_cost_count,0) AS pending_cost_count,
  round(COALESCE(c.invoice_amount,0)*c.invoice_exchange_rate_to_base,2) AS revenue_base,
  round((COALESCE(c.invoice_amount,0)*c.invoice_exchange_rate_to_base)-COALESCE(costs.verified_cost_base,0),2) AS contribution_margin_base,
  CASE WHEN COALESCE(c.invoice_amount,0)>0 THEN round((((c.invoice_amount*c.invoice_exchange_rate_to_base)-COALESCE(costs.verified_cost_base,0))/(c.invoice_amount*c.invoice_exchange_rate_to_base))*100,2) ELSE NULL END AS contribution_margin_percent,
  COALESCE(issues.open_issue_count,0) AS open_issue_count,COALESCE(issues.open_critical_issue_count,0) AS open_critical_issue_count,
  COALESCE(repeat_op.open_repeat_order_count,0) AS open_repeat_order_count,repeat_op.next_follow_up_due_date
FROM public.production_order_closeouts c
JOIN public.production_jobs job ON job.id=c.production_job_id
LEFT JOIN public.production_shipments shipment ON shipment.id=c.shipment_id
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE verification_status='verified') AS verified_cost_count,
    count(*) FILTER (WHERE verification_status='pending') AS pending_cost_count,
    COALESCE(sum(amount_base) FILTER (WHERE verification_status='verified'),0) AS verified_cost_base,
    COALESCE(sum(amount_base) FILTER (WHERE verification_status='pending'),0) AS pending_cost_base
  FROM public.production_cost_entries WHERE closeout_id=c.id
) costs ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE status IN ('open','investigating')) AS open_issue_count,
    count(*) FILTER (WHERE status IN ('open','investigating') AND severity='critical') AS open_critical_issue_count
  FROM public.production_closeout_issues WHERE closeout_id=c.id
) issues ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE verification_status='verified') AS verified_delivery_evidence_count
  FROM public.production_delivery_evidence WHERE shipment_id=c.shipment_id
) delivery ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE status IN ('draft','owner_approved','contact_prepared','contacted')) AS open_repeat_order_count,
    min(follow_up_due_date) FILTER (WHERE status IN ('draft','owner_approved','contact_prepared','contacted')) AS next_follow_up_due_date
  FROM public.production_repeat_order_opportunities WHERE closeout_id=c.id
) repeat_op ON true
WHERE public.has_role(auth.uid(),'admin');

CREATE OR REPLACE VIEW public.production_management_report
WITH (security_invoker=true)
AS
SELECT
  date_trunc('month',COALESCE(c.closed_at,c.created_at))::date AS report_month,
  count(*) AS closeout_count,
  count(*) FILTER (WHERE c.status='closed') AS closed_order_count,
  count(*) FILTER (WHERE c.acceptance_status='accepted') AS accepted_delivery_count,
  count(*) FILTER (WHERE c.payment_status='paid') AS paid_order_count,
  count(*) FILTER (WHERE c.payment_status='overdue') AS overdue_payment_count,
  round(sum(COALESCE(c.invoice_amount,0)*c.invoice_exchange_rate_to_base),2) AS revenue_base,
  round(sum(COALESCE(costs.verified_cost_base,0)),2) AS verified_cost_base,
  round(sum((COALESCE(c.invoice_amount,0)*c.invoice_exchange_rate_to_base)-COALESCE(costs.verified_cost_base,0)),2) AS contribution_margin_base,
  count(*) FILTER (WHERE issues.open_critical_issue_count>0) AS blocked_closeout_count
FROM public.production_order_closeouts c
LEFT JOIN LATERAL (SELECT COALESCE(sum(amount_base) FILTER (WHERE verification_status='verified'),0) AS verified_cost_base FROM public.production_cost_entries WHERE closeout_id=c.id) costs ON true
LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE status IN ('open','investigating') AND severity='critical') AS open_critical_issue_count FROM public.production_closeout_issues WHERE closeout_id=c.id) issues ON true
WHERE public.has_role(auth.uid(),'admin')
GROUP BY 1 ORDER BY 1 DESC;

GRANT SELECT ON public.production_closeout_summary, public.production_management_report TO authenticated;

REVOKE ALL ON FUNCTION public.production_ensure_closeout(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_update_closeout_commercial(uuid,text,numeric,text,numeric,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_record_delivery_acceptance(uuid,text,text,timestamptz,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_add_closeout_cost(uuid,text,text,numeric,numeric,text,numeric,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_verify_closeout_cost(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_add_closeout_issue(uuid,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_resolve_closeout_issue(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_closeout_readiness(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_owner_review_closeout(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_close_order(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_prepare_repeat_order(uuid,integer,integer,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_set_repeat_order_status(uuid,text,text) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.production_ensure_closeout(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_update_closeout_commercial(uuid,text,numeric,text,numeric,text,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_record_delivery_acceptance(uuid,text,text,timestamptz,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_add_closeout_cost(uuid,text,text,numeric,numeric,text,numeric,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_verify_closeout_cost(uuid,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_add_closeout_issue(uuid,text,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_resolve_closeout_issue(uuid,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_closeout_readiness(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_owner_review_closeout(uuid,boolean,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_close_order(uuid,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_prepare_repeat_order(uuid,integer,integer,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_set_repeat_order_status(uuid,text,text) TO authenticated,service_role;

COMMENT ON TABLE public.production_order_closeouts IS 'Internal evidence-backed delivery acceptance and commercial closeout. It does not send buyer communication or execute payment.';
COMMENT ON TABLE public.production_repeat_order_opportunities IS 'Owner-reviewed internal reorder opportunities. Draft or approval states do not send outreach.';
