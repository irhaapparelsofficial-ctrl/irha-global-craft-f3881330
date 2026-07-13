-- Phase 6.3: packing, dispatch readiness, shipping documents, tracking and delivery evidence.
-- Source only. Apply in the final one-time backend activation after Phase 6.2.

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS shipping_risk text NOT NULL DEFAULT 'attention' CHECK (shipping_risk IN ('clear','attention','blocked')),
  ADD COLUMN IF NOT EXISTS dispatch_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE TABLE IF NOT EXISTS public.production_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL UNIQUE REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  shipment_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','packing','ready_for_dispatch','booked','in_transit','delivered','exception','cancelled')),
  shipping_mode text NOT NULL DEFAULT 'courier' CHECK (shipping_mode IN ('courier','air_freight','sea_freight','road_freight','hand_carry','other')),
  incoterm text CHECK (incoterm IS NULL OR incoterm IN ('EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP','OTHER')),
  destination_country text,
  destination_city text,
  destination_address text,
  consignee_name text,
  consignee_company text,
  consignee_phone text,
  consignee_email text,
  courier_name text,
  service_level text,
  booking_reference text,
  master_tracking_number text,
  tracking_url text CHECK (tracking_url IS NULL OR tracking_url ~ '^https://[^[:space:]]+$'),
  expected_dispatch_at timestamptz,
  expected_delivery_at timestamptz,
  declared_value numeric(14,2) CHECK (declared_value IS NULL OR declared_value >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  export_reason text,
  customs_reference text,
  notes text,
  owner_approval_required boolean NOT NULL DEFAULT true,
  dispatch_approved_at timestamptz,
  dispatch_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  delivery_confirmed_by text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.production_shipments(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  package_number text NOT NULL,
  package_type text NOT NULL DEFAULT 'carton' CHECK (package_type IN ('carton','polybag','crate','pallet','garment_bag','other')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','packed','sealed','loaded','delivered','damaged')),
  unit_count integer NOT NULL CHECK (unit_count > 0),
  net_weight_kg numeric(12,3) CHECK (net_weight_kg IS NULL OR net_weight_kg >= 0),
  gross_weight_kg numeric(12,3) NOT NULL CHECK (gross_weight_kg > 0),
  length_cm numeric(10,2) CHECK (length_cm IS NULL OR length_cm > 0),
  width_cm numeric(10,2) CHECK (width_cm IS NULL OR width_cm > 0),
  height_cm numeric(10,2) CHECK (height_cm IS NULL OR height_cm > 0),
  seal_number text,
  barcode text,
  contents_summary text,
  damage_note text,
  packed_at timestamptz,
  sealed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, package_number)
);

CREATE TABLE IF NOT EXISTS public.production_shipping_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.production_shipments(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('commercial_invoice','packing_list','certificate_of_origin','air_waybill','bill_of_lading','courier_label','customs_declaration','insurance','inspection_report','other')),
  required boolean NOT NULL DEFAULT false,
  document_number text,
  issue_date date,
  expiry_date date,
  bucket text NOT NULL DEFAULT 'production-evidence',
  object_path text,
  file_name text,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_tracking_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES public.production_shipments(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('booking_created','picked_up','departed','arrived_hub','customs_hold','customs_cleared','out_for_delivery','delivered','exception','returned')),
  occurred_at timestamptz NOT NULL,
  location_text text,
  carrier_status text,
  tracking_number text,
  source text NOT NULL DEFAULT 'manual_verified' CHECK (source IN ('manual_verified','carrier_api','courier_email','buyer_confirmation')),
  external_event_id text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, source, external_event_id)
);

CREATE TABLE IF NOT EXISTS public.production_delivery_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.production_shipments(id) ON DELETE CASCADE,
  production_job_id uuid NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL,
  recipient_name text NOT NULL,
  recipient_role text,
  delivery_location text,
  evidence_type text NOT NULL DEFAULT 'carrier_pod' CHECK (evidence_type IN ('carrier_pod','buyer_confirmation','signed_document','delivery_photo','other')),
  bucket text NOT NULL DEFAULT 'production-evidence',
  object_path text,
  file_name text,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_shipments_status_idx ON public.production_shipments(status, expected_dispatch_at);
CREATE INDEX IF NOT EXISTS production_packages_shipment_idx ON public.production_packages(shipment_id, status);
CREATE INDEX IF NOT EXISTS production_shipping_documents_shipment_idx ON public.production_shipping_documents(shipment_id, required, verification_status);
CREATE INDEX IF NOT EXISTS production_tracking_events_shipment_idx ON public.production_tracking_events(shipment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS production_delivery_evidence_shipment_idx ON public.production_delivery_evidence(shipment_id, delivered_at DESC);

ALTER TABLE public.production_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_shipping_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_delivery_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY production_shipments_admin_all ON public.production_shipments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_packages_admin_all ON public.production_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_shipping_documents_admin_all ON public.production_shipping_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_tracking_events_admin_all ON public.production_tracking_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY production_delivery_evidence_admin_all ON public.production_delivery_evidence FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON public.production_shipments, public.production_packages, public.production_shipping_documents, public.production_tracking_events, public.production_delivery_evidence FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_shipments, public.production_packages, public.production_shipping_documents, public.production_tracking_events, public.production_delivery_evidence TO authenticated;
GRANT ALL ON public.production_shipments, public.production_packages, public.production_shipping_documents, public.production_tracking_events, public.production_delivery_evidence TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.production_tracking_events_id_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_shipping_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS production_shipments_touch_updated_at ON public.production_shipments;
CREATE TRIGGER production_shipments_touch_updated_at BEFORE UPDATE ON public.production_shipments FOR EACH ROW EXECUTE FUNCTION public.production_shipping_touch_updated_at();
DROP TRIGGER IF EXISTS production_packages_touch_updated_at ON public.production_packages;
CREATE TRIGGER production_packages_touch_updated_at BEFORE UPDATE ON public.production_packages FOR EACH ROW EXECUTE FUNCTION public.production_shipping_touch_updated_at();
DROP TRIGGER IF EXISTS production_shipping_documents_touch_updated_at ON public.production_shipping_documents;
CREATE TRIGGER production_shipping_documents_touch_updated_at BEFORE UPDATE ON public.production_shipping_documents FOR EACH ROW EXECUTE FUNCTION public.production_shipping_touch_updated_at();
DROP TRIGGER IF EXISTS production_delivery_evidence_touch_updated_at ON public.production_delivery_evidence;
CREATE TRIGGER production_delivery_evidence_touch_updated_at BEFORE UPDATE ON public.production_delivery_evidence FOR EACH ROW EXECUTE FUNCTION public.production_shipping_touch_updated_at();
REVOKE ALL ON FUNCTION public.production_shipping_touch_updated_at() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.production_shipping_readiness(_shipment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  s public.production_shipments;
  j public.production_jobs;
  missing text[] := ARRAY[]::text[];
  package_count integer;
  invalid_packages integer;
  unsealed_packages integer;
  required_docs integer;
  invalid_required_docs integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.production_shipments WHERE id=_shipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment not found'; END IF;
  SELECT * INTO j FROM public.production_jobs WHERE id=s.production_job_id;

  IF j.qc_released_at IS NULL THEN missing := array_append(missing,'Owner-approved QC release'); END IF;
  IF nullif(btrim(coalesce(s.destination_country,'')),'') IS NULL THEN missing := array_append(missing,'Destination country'); END IF;
  IF nullif(btrim(coalesce(s.destination_address,'')),'') IS NULL THEN missing := array_append(missing,'Destination address'); END IF;
  IF nullif(btrim(coalesce(s.consignee_name,'')),'') IS NULL THEN missing := array_append(missing,'Consignee name'); END IF;
  IF nullif(btrim(coalesce(s.consignee_phone,'')),'') IS NULL THEN missing := array_append(missing,'Consignee phone'); END IF;
  IF nullif(btrim(coalesce(s.courier_name,'')),'') IS NULL THEN missing := array_append(missing,'Courier or freight forwarder'); END IF;
  IF nullif(btrim(coalesce(s.service_level,'')),'') IS NULL THEN missing := array_append(missing,'Shipping service level'); END IF;

  SELECT count(*), count(*) FILTER (WHERE unit_count<=0 OR gross_weight_kg<=0), count(*) FILTER (WHERE status NOT IN ('sealed','loaded','delivered'))
  INTO package_count, invalid_packages, unsealed_packages FROM public.production_packages WHERE shipment_id=s.id;
  IF package_count=0 THEN missing := array_append(missing,'At least one package'); END IF;
  IF invalid_packages>0 THEN missing := array_append(missing,'Valid package units and gross weight'); END IF;
  IF unsealed_packages>0 THEN missing := array_append(missing,'All packages sealed'); END IF;

  SELECT count(*) FILTER (WHERE required), count(*) FILTER (WHERE required AND (verification_status<>'verified' OR object_path IS NULL OR file_name IS NULL))
  INTO required_docs, invalid_required_docs FROM public.production_shipping_documents WHERE shipment_id=s.id;
  IF required_docs=0 THEN missing := array_append(missing,'Required shipping document checklist'); END IF;
  IF invalid_required_docs>0 THEN missing := array_append(missing,'All required shipping documents verified'); END IF;

  RETURN jsonb_build_object('ready',cardinality(missing)=0,'missing',to_jsonb(missing),'shipment_id',s.id,'job_id',s.production_job_id,'checked_at',now());
END;
$$;
REVOKE ALL ON FUNCTION public.production_shipping_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_shipping_readiness(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_approve_dispatch(_shipment_id uuid)
RETURNS public.production_shipments
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.production_shipments; readiness jsonb; job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  readiness := public.production_shipping_readiness(_shipment_id);
  IF COALESCE((readiness->>'ready')::boolean,false)=false THEN RAISE EXCEPTION 'dispatch readiness failed: %', readiness->'missing'; END IF;
  UPDATE public.production_shipments SET status='ready_for_dispatch',owner_approval_required=false,dispatch_approved_at=now(),dispatch_approved_by=auth.uid()
  WHERE id=_shipment_id RETURNING *, production_job_id INTO result, job_id;
  UPDATE public.production_jobs SET shipping_status='ready',shipping_risk='clear',dispatch_ready_at=now(),dispatch_approved_at=now(),dispatch_approved_by=auth.uid() WHERE id=job_id;
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence)
  VALUES(job_id,'dispatch_approved','ready_for_dispatch','Owner approved internal dispatch readiness. No courier booking or buyer message was sent.',jsonb_build_object('shipment_id',_shipment_id,'courier_booking_created',false,'buyer_notification_sent',false));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.production_approve_dispatch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_approve_dispatch(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_record_dispatch(_shipment_id uuid, _booking_reference text, _tracking_number text, _tracking_url text DEFAULT NULL)
RETURNS public.production_shipments
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.production_shipments; job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  IF nullif(btrim(coalesce(_booking_reference,'')),'') IS NULL OR nullif(btrim(coalesce(_tracking_number,'')),'') IS NULL THEN RAISE EXCEPTION 'booking reference and tracking number required'; END IF;
  IF _tracking_url IS NOT NULL AND _tracking_url !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'valid HTTPS tracking URL required'; END IF;
  UPDATE public.production_shipments SET status='in_transit',booking_reference=btrim(_booking_reference),master_tracking_number=btrim(_tracking_number),tracking_url=_tracking_url,dispatched_at=now()
  WHERE id=_shipment_id AND dispatch_approved_at IS NOT NULL RETURNING *, production_job_id INTO result, job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'owner-approved shipment required'; END IF;
  UPDATE public.production_jobs SET shipping_status='shipped',stage='shipped',dispatched_at=now() WHERE id=job_id;
  INSERT INTO public.production_tracking_events(shipment_id,production_job_id,event_type,occurred_at,tracking_number,source,evidence,recorded_by)
  VALUES(_shipment_id,job_id,'picked_up',now(),btrim(_tracking_number),'manual_verified',jsonb_build_object('booking_reference',btrim(_booking_reference)),auth.uid());
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence)
  VALUES(job_id,'shipment_dispatched','in_transit','Dispatch recorded from exact booking evidence. No buyer message was sent.',jsonb_build_object('shipment_id',_shipment_id,'booking_reference',btrim(_booking_reference),'tracking_number',btrim(_tracking_number),'buyer_notification_sent',false));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.production_record_dispatch(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_record_dispatch(uuid,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.production_confirm_delivery(_shipment_id uuid, _delivery_evidence_id uuid)
RETURNS public.production_shipments
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.production_shipments; evidence public.production_delivery_evidence; job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO evidence FROM public.production_delivery_evidence WHERE id=_delivery_evidence_id AND shipment_id=_shipment_id AND verification_status='verified';
  IF NOT FOUND THEN RAISE EXCEPTION 'verified delivery evidence required'; END IF;
  UPDATE public.production_shipments SET status='delivered',delivered_at=evidence.delivered_at,delivery_confirmed_by=evidence.recipient_name
  WHERE id=_shipment_id AND dispatched_at IS NOT NULL RETURNING *, production_job_id INTO result, job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'dispatched shipment required'; END IF;
  UPDATE public.production_jobs SET shipping_status='delivered',delivered_at=evidence.delivered_at WHERE id=job_id;
  INSERT INTO public.production_tracking_events(shipment_id,production_job_id,event_type,occurred_at,location_text,source,evidence,recorded_by)
  VALUES(_shipment_id,job_id,'delivered',evidence.delivered_at,evidence.delivery_location,'manual_verified',jsonb_build_object('delivery_evidence_id',evidence.id,'recipient_name',evidence.recipient_name),auth.uid());
  INSERT INTO public.production_job_events(production_job_id,event_type,to_value,note,evidence)
  VALUES(job_id,'delivery_confirmed','delivered','Delivery confirmed from verified evidence. Commercial completion remains a separate owner decision.',jsonb_build_object('shipment_id',_shipment_id,'delivery_evidence_id',evidence.id,'recipient_name',evidence.recipient_name));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.production_confirm_delivery(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_confirm_delivery(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.production_shipping_summary WITH (security_invoker=true) AS
SELECT
  s.id AS shipment_id,s.production_job_id,j.job_number,j.job_type,j.buyer_name,j.company_name,j.product_name,j.quantity_text,j.stage,j.qc_status,j.qc_released_at,
  s.shipment_number,s.status,s.shipping_mode,s.incoterm,s.destination_country,s.destination_city,s.consignee_name,s.courier_name,s.service_level,s.booking_reference,s.master_tracking_number,s.tracking_url,
  s.expected_dispatch_at,s.expected_delivery_at,s.dispatch_approved_at,s.dispatched_at,s.delivered_at,
  count(DISTINCT p.id) AS package_count,coalesce(sum(DISTINCT p.unit_count),0) AS packed_units,coalesce(sum(DISTINCT p.gross_weight_kg),0) AS gross_weight_kg,
  count(DISTINCT p.id) FILTER (WHERE p.status NOT IN ('sealed','loaded','delivered')) AS unsealed_packages,
  count(DISTINCT d.id) FILTER (WHERE d.required) AS required_documents,
  count(DISTINCT d.id) FILTER (WHERE d.required AND d.verification_status='verified') AS verified_required_documents,
  count(DISTINCT t.id) AS tracking_event_count,max(t.occurred_at) AS latest_tracking_at,
  (array_agg(t.event_type ORDER BY t.occurred_at DESC) FILTER (WHERE t.id IS NOT NULL))[1] AS latest_tracking_event,
  count(DISTINCT e.id) FILTER (WHERE e.verification_status='verified') AS verified_delivery_evidence_count,
  CASE
    WHEN s.status='exception' OR bool_or(coalesce(p.status='damaged',false)) OR bool_or(coalesce(d.required AND d.verification_status='rejected',false)) THEN 'blocked'
    WHEN (s.expected_dispatch_at<now() AND s.status IN ('draft','packing','ready_for_dispatch')) OR (s.expected_delivery_at<now() AND s.status NOT IN ('delivered','cancelled')) THEN 'attention'
    WHEN count(DISTINCT d.id) FILTER (WHERE d.required AND d.verification_status<>'verified')>0 THEN 'attention'
    ELSE 'clear'
  END AS risk_level,
  s.updated_at
FROM public.production_shipments s
JOIN public.production_jobs j ON j.id=s.production_job_id
LEFT JOIN public.production_packages p ON p.shipment_id=s.id
LEFT JOIN public.production_shipping_documents d ON d.shipment_id=s.id
LEFT JOIN public.production_tracking_events t ON t.shipment_id=s.id
LEFT JOIN public.production_delivery_evidence e ON e.shipment_id=s.id
WHERE public.has_role(auth.uid(),'admin')
GROUP BY s.id,j.id;

GRANT SELECT ON public.production_shipping_summary TO authenticated;
