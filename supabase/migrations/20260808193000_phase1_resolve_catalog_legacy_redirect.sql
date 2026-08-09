-- Phase 1: converge the production DB redirect authority on the same direct
-- canonical destination already used by the React and Cloudflare catalogue
-- entry route. No buyer/product records are touched.
DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.legacy_route_redirects
  SET
    to_path = '/products',
    confidence = 'auto',
    reason = 'Phase 1 direct canonical catalogue entry; avoids /catalog -> /catalogue -> /products chain.',
    updated_at = now()
  WHERE from_path = '/catalog'
    AND to_path = '/catalogue';

  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 AND NOT EXISTS (
    SELECT 1
    FROM public.legacy_route_redirects
    WHERE from_path = '/catalog'
      AND to_path = '/products'
  ) THEN
    RAISE EXCEPTION 'Phase 1 expected /catalog legacy redirect row is absent or has an unexpected target';
  END IF;
END
$$;
