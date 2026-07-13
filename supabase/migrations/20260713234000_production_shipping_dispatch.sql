-- Phase 6.3: packing, shipment documents, dispatch readiness, tracking and delivery evidence.
-- Repository source only. Apply during the final owner-approved backend activation.

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'not_ready' CHECK (dispatch_status IN ('not_ready','packing','documents_pending','ready_for_owner_review','released','in_transit','delivered','exception')),
  ADD COLUMN IF NOT EXISTS dispatch_risk text NOT NULL DEFAULT 'attention' CHECK (dispatch_risk IN ('clear','attention','blocked')),
  ADD COLUMN IF NOT EXISTS dispatch_release_status text NOT NULL DEFAULT 'not_ready' CHECK (dispatch_release_status IN ('not_ready','ready_for_owner_review','approved','rejected')),
  ADD COLUMN IF NOT EXISTS dispatch_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.production_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  carton_no integer NOT NULL CHECK (carton_no > 0),
  package_type text NOT NULL DEFAULT 'carton',
  item_count integer NOT NULL CHECK (item_count > 0),
  net_weight_kg numeric(12,3) NOT NULL CHECK (net_weight_kg > 0),
  gross_weight_kg numeric(12,3) NOT NULL CHECK (gross_weight_kg >= net_weight_kg),
  length_cm numeric(12,2) NOT NULL CHECK (length_cm > 0),
  width_cm numeric(12,2) NOT NULL CHECK (width_cm > 0),
  height_cm numeric(12,2) NOT NULL CHECK (height_cm > 0),
  packing_status text NOT NULL DEFAULT 'planned' CHECK (packing_status IN ('planned','packed','sealed','verified')),
  contents text,
  seal_reference text,
  notes text,
  packed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  packed_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_job_id, carton_no)
);

CREATE TABLE IF NOT EXISTS public.production_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  shipment_number text NOT NULL UNIQUE,
  mode text NOT NULL CHECK (mode IN ('courier','air','sea','road','pickup')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','quoted','booked','collected','in_transit','customs_hold','out_for_delivery','delivered','exception','cancelled')),
  courier_name text NOT NULL,
  service_level text,
  booking_reference text,
  tracking_number text,
  tracking_url text,
  origin_text text,
  destination_text text NOT NULL,
  incoterm text,
  currency text,
  freight_cost numeric(14,2),
  insurance_cost numeric(14,2),
  planned_dispatch_at timestamptz,
  booked_at timestamptz,
  collected_at timestamptz,
  delivered_at timestamptz,
  exception_note text,
  owner_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_shipments_tracking_url_https CHECK (tracking_url IS NULL OR tracking_url ~ '^https://[^[:space:]]+$'),
  CONSTRAINT production_shipments_costs_nonnegative CHECK (COALESCE(freight_cost,0) >= 0 AND COALESCE(insurance_cost,0) >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS production_shipments_one_active_job_idx
  ON public.production_shipments (production_job_id)
  WHERE status <> 'cancelled';

CREATE TABLE IF NOT EXISTS public.production_shipping_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.production_shipments(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('packing_list','commercial_invoice','proforma_invoice','certificate_of_origin','customs_declaration','airway_bill','bill_of_lading','courier_label','delivery_note','insurance','other')),
  document_reference text,
  storage_bucket text NOT NULL DEFAULT 'production-shipping-documents' CHECK (storage_bucket = 'production-shipping-documents'),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  checksum_sha256 text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verification_note text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_shipping_document_checksum CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS public.production_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.production_shipments(id) ON DELETE CASCADE,
  event_status text NOT NULL CHECK (event_status IN ('booked','collected','in_transit','customs_hold','out_for_delivery','delivered','exception','cancelled')),
  event_time timestamptz NOT NULL,
  location_text text,
  description text NOT NULL,
  source text NOT NULL CHECK (source IN ('manual_verified','carrier_api','carrier_email','buyer_confirmation')),
  evidence_reference text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, event_status, event_time, description)
);

CREATE TABLE IF NOT EXISTS public.production_delivery_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.production_shipments(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('pickup','handover','tracking','delivery','exception')),
  reference text NOT NULL,
  recipient_name text,
  delivered_at timestamptz,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_packages_job_idx ON public.production_packages (production_job_id, carton_no);
CREATE INDEX IF NOT EXISTS production_shipments_job_status_idx ON public.production_shipments (production_job_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS production_shipments_tracking_idx ON public.production_shipments (tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS production_documents_job_type_idx ON public.production_shipping_documents (production_job_id, document_type, verification_status);
CREATE INDEX IF NOT EXISTS production_tracking_shipment_time_idx ON public.production_tracking_events (shipment_id, event_time DESC);
CREATE INDEX IF NOT EXISTS production_delivery_shipment_idx ON public.production_delivery_evidence (shipment_id, verification_status, created_at DESC);

ALTER TABLE public.production_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_shipping_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_delivery_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY production_packages_admin_all ON public.production_packages FOR ALL TO authenticated
    USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_shipments_admin_read ON public.production_shipments FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_documents_admin_read ON public.production_shipping_documents FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_documents_admin_insert ON public.production_shipping_documents FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(),'admin') AND uploaded_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_tracking_admin_read ON public.production_tracking_events FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_delivery_admin_read ON public.production_delivery_evidence FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_packages TO authenticated;
GRANT SELECT ON public.production_shipments, public.production_tracking_events, public.production_delivery_evidence TO authenticated;
GRANT SELECT, INSERT ON public.production_shipping_documents TO authenticated;
GRANT ALL ON public.production_packages, public.production_shipments, public.production_shipping_documents, public.production_tracking_events, public.production_delivery_evidence TO service_role;
REVOKE ALL ON public.production_packages, public.production_shipments, public.production_shipping_documents, public.production_tracking_events, public.production_delivery_evidence FROM anon;

DROP TRIGGER IF EXISTS trg_production_packages_updated ON public.production_packages;
CREATE TRIGGER trg_production_packages_updated BEFORE UPDATE ON public.production_packages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_production_shipments_updated ON public.production_shipments;
CREATE TRIGGER trg_production_shipments_updated BEFORE UPDATE ON public.production_shipments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'production-shipping-documents','production-shipping-documents',false,20971520,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY production_shipping_objects_admin_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id='production-shipping-documents' AND public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_shipping_objects_admin_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id='production-shipping-documents' AND public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_shipping_objects_admin_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id='production-shipping-documents' AND public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.production_refresh_dispatch_state(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  _quality text;
  _packages integer;
  _unverified integer;
  _invalid integer;
  _verified_docs integer;
  _rejected_docs integer;
  _shipment_status text;
  _dispatch_status text;
  _risk text;
BEGIN
  SELECT quality_release_status INTO _quality FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE packing_status <> 'verified'),
         count(*) FILTER (WHERE carton_no <= 0 OR item_count <= 0 OR net_weight_kg <= 0 OR gross_weight_kg < net_weight_kg OR length_cm <= 0 OR width_cm <= 0 OR height_cm <= 0)
  INTO _packages,_unverified,_invalid
  FROM public.production_packages WHERE production_job_id=_job_id;

  SELECT count(*) FILTER (WHERE verification_status='verified'), count(*) FILTER (WHERE verification_status='rejected')
  INTO _verified_docs,_rejected_docs
  FROM public.production_shipping_documents WHERE production_job_id=_job_id;

  SELECT status INTO _shipment_status FROM public.production_shipments
  WHERE production_job_id=_job_id AND status <> 'cancelled'
  ORDER BY created_at DESC LIMIT 1;

  _dispatch_status := CASE
    WHEN _shipment_status='delivered' THEN 'delivered'
    WHEN _shipment_status IN ('collected','in_transit','customs_hold','out_for_delivery') THEN 'in_transit'
    WHEN _shipment_status='exception' THEN 'exception'
    WHEN COALESCE(_packages,0)=0 THEN 'not_ready'
    WHEN COALESCE(_unverified,0)>0 THEN 'packing'
    WHEN COALESCE(_verified_docs,0)<2 OR COALESCE(_rejected_docs,0)>0 THEN 'documents_pending'
    ELSE 'ready_for_owner_review'
  END;

  _risk := CASE
    WHEN _quality <> 'approved' OR COALESCE(_invalid,0)>0 OR COALESCE(_rejected_docs,0)>0 OR _shipment_status IN ('exception','cancelled') THEN 'blocked'
    WHEN _dispatch_status IN ('ready_for_owner_review','in_transit','delivered') THEN 'clear'
    ELSE 'attention'
  END;

  UPDATE public.production_jobs
  SET dispatch_status=_dispatch_status,
      dispatch_risk=_risk,
      dispatch_release_status=CASE
        WHEN dispatch_release_status='approved' THEN 'approved'
        WHEN _dispatch_status='ready_for_owner_review' AND _risk='clear' THEN 'ready_for_owner_review'
        ELSE 'not_ready'
      END,
      shipping_status=CASE
        WHEN _shipment_status='delivered' THEN 'delivered'
        WHEN _shipment_status IN ('collected','in_transit','customs_hold','out_for_delivery') THEN 'shipped'
        WHEN _shipment_status='booked' THEN 'booked'
        WHEN _shipment_status='exception' THEN 'exception'
        WHEN _dispatch_status='ready_for_owner_review' THEN 'ready'
        ELSE shipping_status
      END
  WHERE id=_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.production_refresh_dispatch_state(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.production_refresh_dispatch_state(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.production_dispatch_child_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _job_id uuid;
BEGIN
  _job_id := COALESCE(NEW.production_job_id,OLD.production_job_id);
  PERFORM public.production_refresh_dispatch_state(_job_id);
  RETURN COALESCE(NEW,OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.production_shipment_child_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _shipment_id uuid; _job_id uuid;
BEGIN
  _shipment_id := COALESCE(NEW.shipment_id,OLD.shipment_id);
  SELECT production_job_id INTO _job_id FROM public.production_shipments WHERE id=_shipment_id;
  IF _job_id IS NOT NULL THEN PERFORM public.production_refresh_dispatch_state(_job_id); END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.production_dispatch_child_refresh() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.production_shipment_child_refresh() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_production_packages_dispatch_refresh ON public.production_packages;
CREATE TRIGGER trg_production_packages_dispatch_refresh AFTER INSERT OR UPDATE OR DELETE ON public.production_packages FOR EACH ROW EXECUTE FUNCTION public.production_dispatch_child_refresh();
DROP TRIGGER IF EXISTS trg_production_documents_dispatch_refresh ON public.production_shipping_documents;
CREATE TRIGGER trg_production_documents_dispatch_refresh AFTER INSERT OR UPDATE OR DELETE ON public.production_shipping_documents FOR EACH ROW EXECUTE FUNCTION public.production_dispatch_child_refresh();
DROP TRIGGER IF EXISTS trg_production_shipments_dispatch_refresh ON public.production_shipments;
CREATE TRIGGER trg_production_shipments_dispatch_refresh AFTER INSERT OR UPDATE OR DELETE ON public.production_shipments FOR EACH ROW EXECUTE FUNCTION public.production_dispatch_child_refresh();
DROP TRIGGER IF EXISTS trg_production_delivery_dispatch_refresh ON public.production_delivery_evidence;
CREATE TRIGGER trg_production_delivery_dispatch_refresh AFTER INSERT OR UPDATE OR DELETE ON public.production_delivery_evidence FOR EACH ROW EXECUTE FUNCTION public.production_shipment_child_refresh();

CREATE OR REPLACE FUNCTION public.production_create_shipment(
  _job_id uuid,
  _mode text,
  _courier_name text,
  _service_level text DEFAULT NULL,
  _booking_reference text DEFAULT NULL,
  _tracking_number text DEFAULT NULL,
  _tracking_url text DEFAULT NULL,
  _origin_text text DEFAULT NULL,
  _destination_text text DEFAULT NULL,
  _incoterm text DEFAULT NULL,
  _planned_dispatch_at timestamptz DEFAULT NULL
)
RETURNS public.production_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _row public.production_shipments; _number text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _mode NOT IN ('courier','air','sea','road','pickup') THEN RAISE EXCEPTION 'invalid shipment mode'; END IF;
  IF char_length(btrim(COALESCE(_courier_name,'')))<2 OR char_length(btrim(COALESCE(_destination_text,'')))<2 THEN RAISE EXCEPTION 'carrier and destination required'; END IF;
  IF _tracking_url IS NOT NULL AND _tracking_url !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'tracking URL must use HTTPS'; END IF;
  PERFORM 1 FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.production_shipments WHERE production_job_id=_job_id AND status<>'cancelled') THEN RAISE EXCEPTION 'active shipment already exists'; END IF;

  _number := 'SHP-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS-MS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  INSERT INTO public.production_shipments(
    production_job_id,shipment_number,mode,status,courier_name,service_level,booking_reference,tracking_number,tracking_url,
    origin_text,destination_text,incoterm,planned_dispatch_at,created_by
  ) VALUES (
    _job_id,_number,_mode,CASE WHEN NULLIF(btrim(COALESCE(_booking_reference,'')),'') IS NULL THEN 'draft' ELSE 'booked' END,
    btrim(_courier_name),NULLIF(btrim(_service_level),''),NULLIF(btrim(_booking_reference),''),NULLIF(btrim(_tracking_number),''),_tracking_url,
    NULLIF(btrim(_origin_text),''),btrim(_destination_text),NULLIF(upper(btrim(_incoterm)),''),_planned_dispatch_at,auth.uid()
  ) RETURNING * INTO _row;

  UPDATE public.production_shipments SET booked_at=CASE WHEN status='booked' THEN now() ELSE NULL END WHERE id=_row.id RETURNING * INTO _row;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES(_job_id,'shipping_updated',_row.status,'Internal shipment record created. No carrier booking or buyer notification executed.',jsonb_build_object('shipment_id',_row.id,'shipment_number',_number,'external_carrier_action',false,'buyer_notification_sent',false),auth.uid());
  PERFORM public.production_refresh_dispatch_state(_job_id);
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_set_shipment_status(_shipment_id uuid,_status text,_note text DEFAULT NULL)
RETURNS public.production_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _row public.production_shipments; _current text; _current_rank integer; _next_rank integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('draft','quoted','booked','collected','in_transit','customs_hold','out_for_delivery','delivered','exception','cancelled') THEN RAISE EXCEPTION 'invalid shipment status'; END IF;
  SELECT status INTO _current FROM public.production_shipments WHERE id=_shipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment not found'; END IF;
  IF _current IN ('delivered','cancelled') AND _current<>_status THEN RAISE EXCEPTION 'terminal shipment status cannot move'; END IF;
  _current_rank := CASE _current WHEN 'draft' THEN 0 WHEN 'quoted' THEN 1 WHEN 'booked' THEN 2 WHEN 'collected' THEN 3 WHEN 'in_transit' THEN 4 WHEN 'customs_hold' THEN 4 WHEN 'out_for_delivery' THEN 5 WHEN 'delivered' THEN 6 ELSE 0 END;
  _next_rank := CASE _status WHEN 'draft' THEN 0 WHEN 'quoted' THEN 1 WHEN 'booked' THEN 2 WHEN 'collected' THEN 3 WHEN 'in_transit' THEN 4 WHEN 'customs_hold' THEN 4 WHEN 'out_for_delivery' THEN 5 WHEN 'delivered' THEN 6 ELSE 99 END;
  IF _status NOT IN ('exception','cancelled') AND _next_rank<_current_rank THEN RAISE EXCEPTION 'shipment status cannot move backwards'; END IF;

  UPDATE public.production_shipments SET
    status=_status,
    booked_at=CASE WHEN _status='booked' THEN COALESCE(booked_at,now()) ELSE booked_at END,
    collected_at=CASE WHEN _status='collected' THEN COALESCE(collected_at,now()) ELSE collected_at END,
    delivered_at=CASE WHEN _status='delivered' THEN COALESCE(delivered_at,now()) ELSE delivered_at END,
    exception_note=CASE WHEN _status='exception' THEN NULLIF(btrim(_note),'') ELSE exception_note END
  WHERE id=_shipment_id RETURNING * INTO _row;

  INSERT INTO public.production_job_events(production_job_id,event_type,from_value,to_value,note,evidence,created_by)
  VALUES(_row.production_job_id,'shipping_updated',_current,_status,COALESCE(NULLIF(btrim(_note),''),'Internal shipment status recorded. No carrier API called.'),jsonb_build_object('shipment_id',_row.id,'external_carrier_action',false,'buyer_notification_sent',false),auth.uid());
  PERFORM public.production_refresh_dispatch_state(_row.production_job_id);
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_verify_shipping_document(_document_id uuid,_status text,_note text DEFAULT NULL)
RETURNS public.production_shipping_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _row public.production_shipping_documents;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'invalid verification status'; END IF;
  UPDATE public.production_shipping_documents SET verification_status=_status,verification_note=NULLIF(btrim(_note),''),verified_by=auth.uid(),verified_at=now()
  WHERE id=_document_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment document not found'; END IF;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES(_row.production_job_id,'shipping_updated',_status,'Shipment document reviewed. No external action executed.',jsonb_build_object('document_id',_row.id,'document_type',_row.document_type,'buyer_notification_sent',false),auth.uid());
  PERFORM public.production_refresh_dispatch_state(_row.production_job_id);
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_record_tracking_event(
  _shipment_id uuid,_event_status text,_event_time timestamptz,_location_text text,_description text,_source text DEFAULT 'manual_verified',_evidence_reference text DEFAULT NULL
)
RETURNS public.production_tracking_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _shipment public.production_shipments; _row public.production_tracking_events;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _event_status NOT IN ('booked','collected','in_transit','customs_hold','out_for_delivery','delivered','exception','cancelled') THEN RAISE EXCEPTION 'invalid tracking status'; END IF;
  IF _source NOT IN ('manual_verified','carrier_api','carrier_email','buyer_confirmation') THEN RAISE EXCEPTION 'invalid tracking source'; END IF;
  IF char_length(btrim(COALESCE(_description,'')))<3 THEN RAISE EXCEPTION 'tracking description required'; END IF;
  SELECT * INTO _shipment FROM public.production_shipments WHERE id=_shipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment not found'; END IF;
  INSERT INTO public.production_tracking_events(shipment_id,event_status,event_time,location_text,description,source,evidence_reference,recorded_by)
  VALUES(_shipment_id,_event_status,_event_time,NULLIF(btrim(_location_text),''),btrim(_description),_source,NULLIF(btrim(_evidence_reference),''),auth.uid())
  RETURNING * INTO _row;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES(_shipment.production_job_id,'shipping_updated',_event_status,'Tracking evidence recorded. Carrier API status is not implied.',jsonb_build_object('tracking_event_id',_row.id,'source',_source,'external_carrier_action',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_record_delivery_evidence(
  _shipment_id uuid,_evidence_type text,_reference text,_recipient_name text DEFAULT NULL,_delivered_at timestamptz DEFAULT NULL
)
RETURNS public.production_delivery_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _row public.production_delivery_evidence; _job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _evidence_type NOT IN ('pickup','handover','tracking','delivery','exception') THEN RAISE EXCEPTION 'invalid evidence type'; END IF;
  IF char_length(btrim(COALESCE(_reference,'')))<3 THEN RAISE EXCEPTION 'evidence reference required'; END IF;
  SELECT production_job_id INTO _job_id FROM public.production_shipments WHERE id=_shipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment not found'; END IF;
  INSERT INTO public.production_delivery_evidence(shipment_id,evidence_type,reference,recipient_name,delivered_at,created_by)
  VALUES(_shipment_id,_evidence_type,btrim(_reference),NULLIF(btrim(_recipient_name),''),_delivered_at,auth.uid()) RETURNING * INTO _row;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES(_job_id,'shipping_updated',_evidence_type,'Delivery or handover evidence recorded pending verification.',jsonb_build_object('delivery_evidence_id',_row.id,'buyer_notification_sent',false),auth.uid());
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_verify_delivery_evidence(_evidence_id uuid,_status text)
RETURNS public.production_delivery_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _row public.production_delivery_evidence; _job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'invalid verification status'; END IF;
  UPDATE public.production_delivery_evidence SET verification_status=_status,verified_by=auth.uid(),verified_at=now() WHERE id=_evidence_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'delivery evidence not found'; END IF;
  SELECT production_job_id INTO _job_id FROM public.production_shipments WHERE id=_row.shipment_id;
  PERFORM public.production_refresh_dispatch_state(_job_id);
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_dispatch_readiness(_job_id uuid,_require_origin_certificate boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  _job public.production_jobs;
  _shipment public.production_shipments;
  _missing text[] := ARRAY[]::text[];
  _warnings text[] := ARRAY[]::text[];
  _package_count integer;
  _unverified integer;
  _invalid integer;
  _gross numeric;
  _volumetric numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO _job FROM public.production_jobs WHERE id=_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'production job not found'; END IF;
  IF _job.quality_release_status<>'approved' THEN _missing:=array_append(_missing,'owner-approved QC release'); END IF;

  SELECT count(*),count(*) FILTER(WHERE packing_status<>'verified'),count(*) FILTER(WHERE item_count<=0 OR net_weight_kg<=0 OR gross_weight_kg<net_weight_kg OR length_cm<=0 OR width_cm<=0 OR height_cm<=0),
         COALESCE(sum(gross_weight_kg),0),COALESCE(sum(length_cm*width_cm*height_cm/5000.0),0)
  INTO _package_count,_unverified,_invalid,_gross,_volumetric FROM public.production_packages WHERE production_job_id=_job_id;
  IF _package_count=0 THEN _missing:=array_append(_missing,'at least one package/carton'); END IF;
  IF _unverified>0 THEN _missing:=array_append(_missing,'all cartons verified'); END IF;
  IF _invalid>0 THEN _missing:=array_append(_missing,'valid carton quantities, weights and dimensions'); END IF;
  IF _gross>0 AND _volumetric>_gross*1.5 THEN _warnings:=array_append(_warnings,'volumetric weight materially exceeds gross weight'); END IF;

  IF NOT EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND document_type='packing_list' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified packing list'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND document_type='commercial_invoice' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified commercial invoice'); END IF;
  IF _require_origin_certificate AND NOT EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND document_type='certificate_of_origin' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified certificate of origin'); END IF;
  IF EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND verification_status='rejected') THEN _missing:=array_append(_missing,'replace rejected shipment documents'); END IF;

  SELECT * INTO _shipment FROM public.production_shipments WHERE production_job_id=_job_id AND status<>'cancelled' ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN _missing:=array_append(_missing,'shipment booking record');
  ELSE
    IF _shipment.status IN ('draft','quoted','exception','cancelled') THEN _missing:=array_append(_missing,'confirmed non-exception shipment booking'); END IF;
    IF NULLIF(btrim(_shipment.courier_name),'') IS NULL THEN _missing:=array_append(_missing,'carrier/courier name'); END IF;
    IF NULLIF(btrim(COALESCE(_shipment.tracking_number,_shipment.booking_reference)),'') IS NULL THEN _missing:=array_append(_missing,'tracking or booking number'); END IF;
    IF _shipment.mode='courier' AND NOT EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND document_type='courier_label' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified courier label'); END IF;
    IF _shipment.mode='air' AND NOT EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND document_type='airway_bill' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified airway bill'); END IF;
    IF _shipment.mode='sea' AND NOT EXISTS(SELECT 1 FROM public.production_shipping_documents WHERE production_job_id=_job_id AND document_type='bill_of_lading' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified bill of lading'); END IF;
    IF _shipment.status='delivered' AND NOT EXISTS(SELECT 1 FROM public.production_delivery_evidence WHERE shipment_id=_shipment.id AND evidence_type='delivery' AND verification_status='verified') THEN _missing:=array_append(_missing,'verified delivery evidence'); END IF;
  END IF;

  RETURN jsonb_build_object('ready',cardinality(_missing)=0,'missing',to_jsonb(_missing),'warnings',to_jsonb(_warnings),'package_count',_package_count,'gross_weight_kg',_gross,'volumetric_weight_kg',round(_volumetric,2));
END;
$$;

CREATE OR REPLACE FUNCTION public.production_owner_release_dispatch(_job_id uuid,_require_origin_certificate boolean DEFAULT false)
RETURNS public.production_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE _ready jsonb; _row public.production_jobs;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  _ready:=public.production_dispatch_readiness(_job_id,_require_origin_certificate);
  IF COALESCE((_ready->>'ready')::boolean,false)=false THEN RAISE EXCEPTION 'dispatch release blocked: %',array_to_string(ARRAY(SELECT jsonb_array_elements_text(_ready->'missing')),', '); END IF;
  UPDATE public.production_jobs SET dispatch_release_status='approved',dispatch_status='released',dispatch_risk='clear',dispatch_released_at=now(),dispatch_released_by=auth.uid(),shipping_status='ready'
  WHERE id=_job_id RETURNING * INTO _row;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence,created_by)
  VALUES(_job_id,'owner_approved','dispatch_released','Owner approved internal dispatch readiness. No carrier booking or buyer notification executed.',jsonb_build_object('readiness',_ready,'external_carrier_action',false,'buyer_notification_sent',false),auth.uid());
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.production_create_shipment(uuid,text,text,text,text,text,text,text,text,text,timestamptz) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_set_shipment_status(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_verify_shipping_document(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_record_tracking_event(uuid,text,timestamptz,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_record_delivery_evidence(uuid,text,text,text,timestamptz) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_verify_delivery_evidence(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_dispatch_readiness(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.production_owner_release_dispatch(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.production_create_shipment(uuid,text,text,text,text,text,text,text,text,text,timestamptz) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_set_shipment_status(uuid,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_verify_shipping_document(uuid,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_record_tracking_event(uuid,text,timestamptz,text,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_record_delivery_evidence(uuid,text,text,text,timestamptz) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_verify_delivery_evidence(uuid,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_dispatch_readiness(uuid,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.production_owner_release_dispatch(uuid,boolean) TO authenticated,service_role;

CREATE OR REPLACE VIEW public.production_dispatch_summary
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
  job.quality_release_status,
  job.dispatch_status,
  job.dispatch_risk,
  job.dispatch_release_status,
  job.dispatch_released_at,
  COALESCE(package_summary.package_count,0) AS package_count,
  COALESCE(package_summary.total_items,0) AS total_items,
  COALESCE(package_summary.net_weight_kg,0) AS net_weight_kg,
  COALESCE(package_summary.gross_weight_kg,0) AS gross_weight_kg,
  COALESCE(document_summary.verified_documents,0) AS verified_documents,
  COALESCE(document_summary.rejected_documents,0) AS rejected_documents,
  shipment.id AS shipment_id,
  shipment.mode AS shipment_mode,
  shipment.status AS shipment_status,
  shipment.courier_name,
  shipment.tracking_number,
  shipment.tracking_url,
  shipment.booked_at,
  shipment.collected_at,
  shipment.delivered_at,
  COALESCE(tracking_summary.open_exceptions,0) AS open_exceptions,
  COALESCE(delivery_summary.verified_delivery_evidence,0) AS verified_delivery_evidence,
  job.updated_at
FROM public.production_jobs job
LEFT JOIN LATERAL (
  SELECT count(*)::integer package_count,COALESCE(sum(item_count),0)::integer total_items,COALESCE(sum(net_weight_kg),0) net_weight_kg,COALESCE(sum(gross_weight_kg),0) gross_weight_kg
  FROM public.production_packages package WHERE package.production_job_id=job.id
) package_summary ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER(WHERE verification_status='verified')::integer verified_documents,count(*) FILTER(WHERE verification_status='rejected')::integer rejected_documents
  FROM public.production_shipping_documents document WHERE document.production_job_id=job.id
) document_summary ON true
LEFT JOIN LATERAL (
  SELECT item.* FROM public.production_shipments item WHERE item.production_job_id=job.id ORDER BY (item.status<>'cancelled') DESC,item.created_at DESC LIMIT 1
) shipment ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER(WHERE event_status='exception')::integer open_exceptions FROM public.production_tracking_events event WHERE event.shipment_id=shipment.id
) tracking_summary ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER(WHERE evidence_type='delivery' AND verification_status='verified')::integer verified_delivery_evidence FROM public.production_delivery_evidence evidence WHERE evidence.shipment_id=shipment.id
) delivery_summary ON true
WHERE public.has_role(auth.uid(),'admin');

GRANT SELECT ON public.production_dispatch_summary TO authenticated;
REVOKE ALL ON public.production_dispatch_summary FROM anon;

COMMENT ON TABLE public.production_packages IS 'Internal carton and packing evidence. Verification does not imply courier acceptance.';
COMMENT ON TABLE public.production_shipments IS 'Internal shipment records; carrier bookings are not executed by table changes.';
COMMENT ON TABLE public.production_shipping_documents IS 'Private shipment files with admin verification and short-lived signed access.';
COMMENT ON TABLE public.production_tracking_events IS 'Evidence timeline from explicit sources; manual entries never claim carrier API confirmation.';
COMMENT ON TABLE public.production_delivery_evidence IS 'Pickup, handover, tracking, delivery or exception evidence pending explicit verification.';
