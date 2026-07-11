-- The Edge Function consumes its own rate-limit token before writing with service_role.
-- Direct browser inserts still pass through the database trigger rate limiter.
CREATE OR REPLACE FUNCTION public.validate_public_inquiry_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers JSONB := COALESCE(NULLIF(current_setting('request.headers', true), '')::JSONB, '{}'::JSONB);
  v_ip TEXT;
  v_ua TEXT;
  v_fingerprint TEXT;
BEGIN
  NEW.name := btrim(regexp_replace(COALESCE(NEW.name, ''), '[[:cntrl:]]', ' ', 'g'));
  NEW.email := NULLIF(lower(btrim(COALESCE(NEW.email, ''))), '');
  NEW.phone := NULLIF(btrim(COALESCE(NEW.phone, '')), '');
  NEW.company := NULLIF(btrim(COALESCE(NEW.company, '')), '');
  NEW.country := NULLIF(btrim(COALESCE(NEW.country, '')), '');
  NEW.message := NULLIF(left(COALESCE(NEW.message, ''), 12000), '');
  NEW.source := NULLIF(left(btrim(COALESCE(NEW.source, '')), 240), '');

  IF char_length(NEW.name) < 2 OR char_length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF NEW.email IS NULL AND NEW.phone IS NULL THEN
    RAISE EXCEPTION 'contact_required';
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF NEW.inquiry_ref IS NULL OR NEW.inquiry_ref !~ '^IRQ-[A-Z0-9-]{6,70}$' THEN
    NEW.inquiry_ref := 'IRQ-' || upper(to_hex((extract(epoch FROM clock_timestamp()) * 1000)::bigint)) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;

  -- The role claim comes from the signed request JWT. Browser users cannot set service_role.
  IF COALESCE(auth.jwt()->>'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_ip := COALESCE(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    split_part(COALESCE(v_headers->>'x-forwarded-for', 'unknown'), ',', 1),
    'unknown'
  );
  v_ua := left(COALESCE(v_headers->>'user-agent', 'unknown'), 300);
  v_fingerprint := md5(v_ip || '|' || v_ua);

  IF NOT public.consume_public_submission_limit(v_fingerprint, 'submit_inquiry', 900, 6) THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_public_inquiry_insert() FROM PUBLIC, anon, authenticated;
