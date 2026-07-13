-- Follow-up safety patch for the deferred Commercial Hub migration.
-- A quotation row is inserted before its line items, so draft discounts must not be
-- rejected while subtotal is temporarily zero. The commercial guard becomes strict
-- as soon as the quotation leaves draft state.

DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.crm_quotations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%discount_amount%subtotal%shipping_amount%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.crm_quotations DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.crm_quotation_discount_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF NEW.status <> 'draft'
     AND NEW.discount_amount > NEW.subtotal + NEW.shipping_amount THEN
    RAISE EXCEPTION 'discount exceeds quotation subtotal and shipping';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_quotation_discount_guard_trigger ON public.crm_quotations;
CREATE TRIGGER crm_quotation_discount_guard_trigger
  BEFORE INSERT OR UPDATE ON public.crm_quotations
  FOR EACH ROW EXECUTE FUNCTION public.crm_quotation_discount_guard();

REVOKE ALL ON FUNCTION public.crm_quotation_discount_guard() FROM PUBLIC;
