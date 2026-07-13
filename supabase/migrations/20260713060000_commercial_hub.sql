-- Phase 3 / Batch 3.3: Commercial Hub.
-- Deferred per owner instruction. Apply once during final backend activation.

CREATE SEQUENCE IF NOT EXISTS public.crm_meeting_reference_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.crm_sample_reference_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.crm_quotation_reference_seq START 1;

CREATE TABLE IF NOT EXISTS public.crm_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('inquiry', 'catalogue', 'prospect')),
  source_id uuid NOT NULL,
  meeting_reference text NOT NULL UNIQUE DEFAULT (
    'IA-M-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.crm_meeting_reference_seq')::text, 5, '0')
  ),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 240),
  meeting_type text NOT NULL CHECK (meeting_type IN ('factory_video', 'sales_call', 'sample_review', 'quotation_review', 'other')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Karachi',
  location_url text,
  agenda text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  outcome_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (location_url IS NULL OR location_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS crm_meetings_source_idx
  ON public.crm_meetings (source_type, source_id, start_at DESC);
CREATE INDEX IF NOT EXISTS crm_meetings_schedule_idx
  ON public.crm_meetings (status, start_at);

CREATE TABLE IF NOT EXISTS public.crm_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('inquiry', 'catalogue', 'prospect')),
  source_id uuid NOT NULL,
  sample_reference text NOT NULL UNIQUE DEFAULT (
    'IA-S-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.crm_sample_reference_seq')::text, 5, '0')
  ),
  product text NOT NULL CHECK (char_length(btrim(product)) BETWEEN 2 AND 240),
  requirements text NOT NULL CHECK (char_length(btrim(requirements)) BETWEEN 2 AND 20000),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10000),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'quoted', 'approved', 'in_development', 'ready', 'sent',
    'feedback', 'accepted', 'rejected', 'cancelled'
  )),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED')),
  sample_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (sample_cost >= 0),
  shipping_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  tracking_number text,
  courier text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  sent_at timestamptz,
  feedback text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_samples_source_idx
  ON public.crm_samples (source_type, source_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS crm_samples_status_idx
  ON public.crm_samples (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('inquiry', 'catalogue', 'prospect')),
  source_id uuid NOT NULL,
  quotation_number text NOT NULL UNIQUE DEFAULT (
    'IA-Q-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.crm_quotation_reference_seq')::text, 5, '0')
  ),
  buyer_name text NOT NULL DEFAULT '',
  company text,
  destination_country text,
  buyer_email text,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'owner_review', 'approved', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'
  )),
  valid_until date NOT NULL,
  incoterm text NOT NULL CHECK (char_length(btrim(incoterm)) BETWEEN 2 AND 40),
  shipping_scope text NOT NULL CHECK (char_length(btrim(shipping_scope)) BETWEEN 2 AND 2000),
  payment_terms text NOT NULL CHECK (char_length(btrim(payment_terms)) BETWEEN 2 AND 2000),
  notes text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  owner_approved_at timestamptz,
  owner_approved_by text,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_name <> '' OR company IS NOT NULL),
  CHECK (buyer_email IS NULL OR buyer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  CHECK (discount_amount <= subtotal + shipping_amount)
);

CREATE INDEX IF NOT EXISTS crm_quotations_source_idx
  ON public.crm_quotations (source_type, source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_quotations_status_idx
  ON public.crm_quotations (status, valid_until, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.crm_quotations(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 1000),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'piece' CHECK (char_length(btrim(unit)) BETWEEN 1 AND 40),
  unit_price numeric(14,4) NOT NULL CHECK (unit_price > 0),
  line_total numeric(14,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_quotation_items_quote_idx
  ON public.crm_quotation_items (quotation_id, sort_order, created_at);

ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quotation_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'crm_meetings', 'crm_samples', 'crm_quotations', 'crm_quotation_items'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
        AND policyname = target_table || '_admin_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        target_table || '_admin_all',
        target_table
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.crm_meetings FROM anon;
REVOKE ALL ON TABLE public.crm_samples FROM anon;
REVOKE ALL ON TABLE public.crm_quotations FROM anon;
REVOKE ALL ON TABLE public.crm_quotation_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_samples TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_quotation_items TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_commercial_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;

  IF TG_TABLE_NAME = 'crm_meetings' THEN
    NEW.title := btrim(NEW.title);
    NEW.location_url := NULLIF(btrim(NEW.location_url), '');
  ELSIF TG_TABLE_NAME = 'crm_samples' THEN
    NEW.product := btrim(NEW.product);
    NEW.requirements := btrim(NEW.requirements);
    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;
    IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_quotations' THEN
    NEW.buyer_name := btrim(NEW.buyer_name);
    NEW.company := NULLIF(btrim(NEW.company), '');
    NEW.buyer_email := NULLIF(lower(btrim(NEW.buyer_email)), '');
    NEW.incoterm := btrim(NEW.incoterm);
    NEW.shipping_scope := btrim(NEW.shipping_scope);
    NEW.payment_terms := btrim(NEW.payment_terms);
    NEW.shipping_amount := round(NEW.shipping_amount, 2);
    NEW.discount_amount := round(NEW.discount_amount, 2);
    NEW.total_amount := greatest(round(NEW.subtotal + NEW.shipping_amount - NEW.discount_amount, 2), 0);

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      allowed := CASE OLD.status
        WHEN 'draft' THEN NEW.status IN ('owner_review', 'cancelled')
        WHEN 'owner_review' THEN NEW.status IN ('draft', 'approved', 'cancelled')
        WHEN 'approved' THEN NEW.status IN ('draft', 'sent', 'cancelled')
        WHEN 'sent' THEN NEW.status IN ('accepted', 'rejected', 'expired', 'cancelled')
        WHEN 'accepted' THEN NEW.status = 'cancelled'
        WHEN 'rejected' THEN NEW.status IN ('draft', 'cancelled')
        WHEN 'expired' THEN NEW.status IN ('draft', 'cancelled')
        WHEN 'cancelled' THEN NEW.status = 'draft'
        ELSE false
      END;
      IF NOT allowed THEN
        RAISE EXCEPTION 'invalid quotation status transition: % to %', OLD.status, NEW.status;
      END IF;
    END IF;

    IF NEW.status IN ('approved', 'sent', 'accepted')
       AND (NEW.owner_approved_at IS NULL OR NEW.owner_approved_by IS NULL) THEN
      RAISE EXCEPTION 'owner approval is required before quotation issue';
    END IF;
    IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
    IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
      NEW.accepted_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_meetings_before_write_trigger ON public.crm_meetings;
CREATE TRIGGER crm_meetings_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_meetings
  FOR EACH ROW EXECUTE FUNCTION public.crm_commercial_before_write();

DROP TRIGGER IF EXISTS crm_samples_before_write_trigger ON public.crm_samples;
CREATE TRIGGER crm_samples_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_samples
  FOR EACH ROW EXECUTE FUNCTION public.crm_commercial_before_write();

DROP TRIGGER IF EXISTS crm_quotations_before_write_trigger ON public.crm_quotations;
CREATE TRIGGER crm_quotations_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_quotations
  FOR EACH ROW EXECUTE FUNCTION public.crm_commercial_before_write();

CREATE OR REPLACE FUNCTION public.crm_recalculate_quotation(_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_subtotal numeric(14,2);
BEGIN
  SELECT COALESCE(sum(line_total), 0)
  INTO item_subtotal
  FROM public.crm_quotation_items
  WHERE quotation_id = _quotation_id;

  UPDATE public.crm_quotations
  SET subtotal = item_subtotal,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = _quotation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_quotation_item_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.crm_recalculate_quotation(OLD.quotation_id);
    RETURN OLD;
  END IF;

  NEW.updated_at := now();
  PERFORM public.crm_recalculate_quotation(NEW.quotation_id);
  IF TG_OP = 'UPDATE' AND OLD.quotation_id IS DISTINCT FROM NEW.quotation_id THEN
    PERFORM public.crm_recalculate_quotation(OLD.quotation_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_quotation_items_after_write_trigger ON public.crm_quotation_items;
CREATE TRIGGER crm_quotation_items_after_write_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_quotation_items
  FOR EACH ROW EXECUTE FUNCTION public.crm_quotation_item_after_write();

CREATE OR REPLACE FUNCTION public.crm_commercial_activity_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_type_value text;
  event_summary text;
  event_source_type text;
  event_source_id uuid;
BEGIN
  event_source_type := COALESCE(NEW.source_type, OLD.source_type);
  event_source_id := COALESCE(NEW.source_id, OLD.source_id);

  IF TG_TABLE_NAME = 'crm_meetings' THEN
    event_type_value := 'meeting_scheduled';
    event_summary := CASE TG_OP
      WHEN 'INSERT' THEN 'Meeting scheduled: ' || NEW.meeting_reference
      ELSE 'Meeting updated: ' || NEW.meeting_reference || ' · ' || NEW.status
    END;
  ELSIF TG_TABLE_NAME = 'crm_samples' THEN
    event_type_value := 'sample_updated';
    event_summary := CASE TG_OP
      WHEN 'INSERT' THEN 'Sample request created: ' || NEW.sample_reference
      ELSE 'Sample updated: ' || NEW.sample_reference || ' · ' || NEW.status
    END;
  ELSIF TG_TABLE_NAME = 'crm_quotations' THEN
    event_type_value := CASE WHEN NEW.status = 'sent' THEN 'quotation_sent' ELSE 'quotation_created' END;
    event_summary := CASE TG_OP
      WHEN 'INSERT' THEN 'Quotation draft created: ' || NEW.quotation_number
      ELSE 'Quotation updated: ' || NEW.quotation_number || ' · ' || NEW.status
    END;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.crm_activity_events (
    source_type, source_id, event_type, summary, metadata, actor_id
  ) VALUES (
    event_source_type,
    event_source_id,
    event_type_value,
    event_summary,
    jsonb_build_object(
      'record_id', COALESCE(NEW.id, OLD.id),
      'operation', lower(TG_OP),
      'table', TG_TABLE_NAME
    ),
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS crm_meetings_activity_trigger ON public.crm_meetings;
CREATE TRIGGER crm_meetings_activity_trigger
  AFTER INSERT OR UPDATE ON public.crm_meetings
  FOR EACH ROW EXECUTE FUNCTION public.crm_commercial_activity_audit();

DROP TRIGGER IF EXISTS crm_samples_activity_trigger ON public.crm_samples;
CREATE TRIGGER crm_samples_activity_trigger
  AFTER INSERT OR UPDATE ON public.crm_samples
  FOR EACH ROW EXECUTE FUNCTION public.crm_commercial_activity_audit();

DROP TRIGGER IF EXISTS crm_quotations_activity_trigger ON public.crm_quotations;
CREATE TRIGGER crm_quotations_activity_trigger
  AFTER INSERT OR UPDATE ON public.crm_quotations
  FOR EACH ROW EXECUTE FUNCTION public.crm_commercial_activity_audit();

REVOKE ALL ON FUNCTION public.crm_commercial_before_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_recalculate_quotation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_quotation_item_after_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_commercial_activity_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_recalculate_quotation(uuid) TO authenticated;
