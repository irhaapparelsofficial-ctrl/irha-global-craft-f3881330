-- Backend activation parity repairs for the owner Supabase runtime.
--
-- The original Phase 6.3 source referenced a non-existent qc_released_at column
-- and used an invalid multi-target RETURNING form in three shipment RPCs.
-- Production activation was performed in small atomic batches. These corrected,
-- idempotent definitions preserve repository/database parity for future replays.

ALTER TABLE public.production_job_events
  DROP CONSTRAINT IF EXISTS production_job_events_event_type_check;
ALTER TABLE public.production_job_events
  ADD CONSTRAINT production_job_events_event_type_check
  CHECK (event_type IN (
    'created','stage_changed','note_added','qc_updated','buyer_approval_updated',
    'sample_updated','shipping_updated','owner_approved','notification_recorded',
    'production_released','material_updated','operation_updated','task_updated',
    'risk_changed','dispatch_approved','shipment_dispatched','delivery_confirmed'
  ));

CREATE OR REPLACE FUNCTION public.production_shipping_readiness(_shipment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shipment_row public.production_shipments;
  job_row public.production_jobs;
  missing text[] := ARRAY[]::text[];
  package_count integer;
  invalid_packages integer;
  unsealed_packages integer;
  required_docs integer;
  invalid_required_docs integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO shipment_row FROM public.production_shipments WHERE id = _shipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment not found'; END IF;
  SELECT * INTO job_row FROM public.production_jobs WHERE id = shipment_row.production_job_id;

  IF job_row.quality_release_status <> 'approved' OR job_row.quality_released_at IS NULL THEN
    missing := array_append(missing, 'Owner-approved QC release');
  END IF;
  IF nullif(btrim(coalesce(shipment_row.destination_country, '')), '') IS NULL THEN missing := array_append(missing, 'Destination country'); END IF;
  IF nullif(btrim(coalesce(shipment_row.destination_address, '')), '') IS NULL THEN missing := array_append(missing, 'Destination address'); END IF;
  IF nullif(btrim(coalesce(shipment_row.consignee_name, '')), '') IS NULL THEN missing := array_append(missing, 'Consignee name'); END IF;
  IF nullif(btrim(coalesce(shipment_row.consignee_phone, '')), '') IS NULL THEN missing := array_append(missing, 'Consignee phone'); END IF;
  IF nullif(btrim(coalesce(shipment_row.courier_name, '')), '') IS NULL THEN missing := array_append(missing, 'Courier or freight forwarder'); END IF;
  IF nullif(btrim(coalesce(shipment_row.service_level, '')), '') IS NULL THEN missing := array_append(missing, 'Shipping service level'); END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE unit_count <= 0 OR gross_weight_kg <= 0),
    count(*) FILTER (WHERE status NOT IN ('sealed','loaded','delivered'))
  INTO package_count, invalid_packages, unsealed_packages
  FROM public.production_packages
  WHERE shipment_id = shipment_row.id;

  IF package_count = 0 THEN missing := array_append(missing, 'At least one package'); END IF;
  IF invalid_packages > 0 THEN missing := array_append(missing, 'Valid package units and gross weight'); END IF;
  IF unsealed_packages > 0 THEN missing := array_append(missing, 'All packages sealed'); END IF;

  SELECT
    count(*) FILTER (WHERE required),
    count(*) FILTER (WHERE required AND (verification_status <> 'verified' OR object_path IS NULL OR file_name IS NULL))
  INTO required_docs, invalid_required_docs
  FROM public.production_shipping_documents
  WHERE shipment_id = shipment_row.id;

  IF required_docs = 0 THEN missing := array_append(missing, 'Required shipping document checklist'); END IF;
  IF invalid_required_docs > 0 THEN missing := array_append(missing, 'All required shipping documents verified'); END IF;

  RETURN jsonb_build_object(
    'ready', cardinality(missing) = 0,
    'missing', to_jsonb(missing),
    'shipment_id', shipment_row.id,
    'job_id', shipment_row.production_job_id,
    'checked_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.production_approve_dispatch(_shipment_id uuid)
RETURNS public.production_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.production_shipments;
  readiness jsonb;
  job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  readiness := public.production_shipping_readiness(_shipment_id);
  IF COALESCE((readiness ->> 'ready')::boolean, false) = false THEN
    RAISE EXCEPTION 'dispatch readiness failed: %', readiness -> 'missing';
  END IF;

  UPDATE public.production_shipments
  SET status = 'ready_for_dispatch', owner_approval_required = false,
      dispatch_approved_at = now(), dispatch_approved_by = auth.uid()
  WHERE id = _shipment_id
  RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipment not found'; END IF;

  job_id := result.production_job_id;
  UPDATE public.production_jobs
  SET shipping_status = 'ready', shipping_risk = 'clear', dispatch_ready_at = now(),
      dispatch_approved_at = now(), dispatch_approved_by = auth.uid()
  WHERE id = job_id;

  INSERT INTO public.production_job_events(
    production_job_id,event_type,to_value,note,evidence,created_by
  ) VALUES (
    job_id,'dispatch_approved','ready_for_dispatch',
    'Owner approved internal dispatch readiness. No courier booking or buyer message was sent.',
    jsonb_build_object('shipment_id',_shipment_id,'courier_booking_created',false,'buyer_notification_sent',false),
    auth.uid()
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_record_dispatch(
  _shipment_id uuid,
  _booking_reference text,
  _tracking_number text,
  _tracking_url text DEFAULT NULL
)
RETURNS public.production_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.production_shipments;
  job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(coalesce(_booking_reference, '')), '') IS NULL
     OR nullif(btrim(coalesce(_tracking_number, '')), '') IS NULL THEN
    RAISE EXCEPTION 'booking reference and tracking number required';
  END IF;
  IF _tracking_url IS NOT NULL AND _tracking_url !~ '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'valid HTTPS tracking URL required';
  END IF;

  UPDATE public.production_shipments
  SET status = 'in_transit', booking_reference = btrim(_booking_reference),
      master_tracking_number = btrim(_tracking_number), tracking_url = _tracking_url,
      dispatched_at = now()
  WHERE id = _shipment_id AND dispatch_approved_at IS NOT NULL
  RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'owner-approved shipment required'; END IF;

  job_id := result.production_job_id;
  UPDATE public.production_jobs
  SET shipping_status = 'shipped', stage = 'shipped', dispatched_at = now()
  WHERE id = job_id;

  INSERT INTO public.production_tracking_events(
    shipment_id,production_job_id,event_type,occurred_at,tracking_number,source,evidence,recorded_by
  ) VALUES (
    _shipment_id,job_id,'picked_up',now(),btrim(_tracking_number),'manual_verified',
    jsonb_build_object('booking_reference',btrim(_booking_reference)),auth.uid()
  );
  INSERT INTO public.production_job_events(
    production_job_id,event_type,to_value,note,evidence,created_by
  ) VALUES (
    job_id,'shipment_dispatched','in_transit',
    'Dispatch recorded from exact booking evidence. No buyer message was sent.',
    jsonb_build_object('shipment_id',_shipment_id,'booking_reference',btrim(_booking_reference),'tracking_number',btrim(_tracking_number),'buyer_notification_sent',false),
    auth.uid()
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_confirm_delivery(
  _shipment_id uuid,
  _delivery_evidence_id uuid
)
RETURNS public.production_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.production_shipments;
  evidence_row public.production_delivery_evidence;
  job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO evidence_row
  FROM public.production_delivery_evidence
  WHERE id = _delivery_evidence_id AND shipment_id = _shipment_id
    AND verification_status = 'verified';
  IF NOT FOUND THEN RAISE EXCEPTION 'verified delivery evidence required'; END IF;

  UPDATE public.production_shipments
  SET status = 'delivered', delivered_at = evidence_row.delivered_at,
      delivery_confirmed_by = evidence_row.recipient_name
  WHERE id = _shipment_id AND dispatched_at IS NOT NULL
  RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'dispatched shipment required'; END IF;

  job_id := result.production_job_id;
  UPDATE public.production_jobs
  SET shipping_status = 'delivered', delivered_at = evidence_row.delivered_at
  WHERE id = job_id;

  INSERT INTO public.production_tracking_events(
    shipment_id,production_job_id,event_type,occurred_at,location_text,source,evidence,recorded_by
  ) VALUES (
    _shipment_id,job_id,'delivered',evidence_row.delivered_at,evidence_row.delivery_location,
    'manual_verified',jsonb_build_object('delivery_evidence_id',evidence_row.id,'recipient_name',evidence_row.recipient_name),auth.uid()
  );
  INSERT INTO public.production_job_events(
    production_job_id,event_type,to_value,note,evidence,created_by
  ) VALUES (
    job_id,'delivery_confirmed','delivered',
    'Delivery confirmed from verified evidence. Commercial completion remains a separate owner decision.',
    jsonb_build_object('shipment_id',_shipment_id,'delivery_evidence_id',evidence_row.id,'recipient_name',evidence_row.recipient_name),
    auth.uid()
  );
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.production_shipping_readiness(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_approve_dispatch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_record_dispatch(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.production_confirm_delivery(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.production_shipping_readiness(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_approve_dispatch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_record_dispatch(uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_confirm_delivery(uuid,uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_submit_social_render_job(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_social_render_job(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_retry_social_render_job(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cancel_social_render_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_submit_social_render_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_social_render_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_retry_social_render_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_social_render_job(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.social_render_jobs_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_render_items_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_render_job_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.media_assets_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_platform_account_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_growth_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.production_shipping_touch_updated_at() FROM PUBLIC, anon, authenticated;
