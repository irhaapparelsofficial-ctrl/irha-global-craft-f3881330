
-- 20260711224400 + 20260711224500 + 20260711224700 combined
CREATE TABLE IF NOT EXISTS public.public_submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submit_inquiry','submit_catalogue','create_upload')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS public_submission_events_lookup_idx
  ON public.public_submission_events (fingerprint_hash, action, created_at DESC);
CREATE INDEX IF NOT EXISTS public_submission_events_created_idx
  ON public.public_submission_events (created_at DESC);
ALTER TABLE public.public_submission_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_submission_events FROM anon, authenticated;
GRANT ALL ON public.public_submission_events TO service_role;

CREATE OR REPLACE FUNCTION public.consume_public_submission_limit(
  _fingerprint_hash TEXT,
  _action TEXT,
  _window_seconds INTEGER,
  _max_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF _fingerprint_hash IS NULL OR length(_fingerprint_hash) < 16 THEN
    RETURN FALSE;
  END IF;
  IF _action NOT IN ('submit_inquiry','submit_catalogue','create_upload') THEN
    RETURN FALSE;
  END IF;
  IF _window_seconds < 10 OR _window_seconds > 86400 OR _max_count < 1 OR _max_count > 100 THEN
    RETURN FALSE;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_fingerprint_hash || ':' || _action, 0));
  SELECT count(*)::INTEGER INTO v_count
  FROM public.public_submission_events
  WHERE fingerprint_hash = _fingerprint_hash
    AND action = _action
    AND created_at >= now() - make_interval(secs => _window_seconds);
  IF v_count >= _max_count THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.public_submission_events (fingerprint_hash, action)
  VALUES (_fingerprint_hash, _action);
  DELETE FROM public.public_submission_events
  WHERE created_at < now() - interval '2 days';
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_public_submission_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_submission_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

ALTER TABLE public.inquiries ALTER COLUMN email DROP NOT NULL;

GRANT INSERT ON public.inquiries TO anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit inquiry" ON public.inquiries;
DROP POLICY IF EXISTS "Validated public inquiry insert" ON public.inquiries;
CREATE POLICY "Validated public inquiry insert" ON public.inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(btrim(name)) BETWEEN 2 AND 100
    AND (email IS NOT NULL OR phone IS NOT NULL)
    AND (email IS NULL OR char_length(email) <= 254)
    AND (phone IS NULL OR char_length(phone) <= 40)
    AND (company IS NULL OR char_length(company) <= 160)
    AND (country IS NULL OR char_length(country) <= 80)
    AND (message IS NULL OR char_length(message) <= 12000)
  );

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

DROP TRIGGER IF EXISTS trg_validate_public_inquiry_insert ON public.inquiries;
CREATE TRIGGER trg_validate_public_inquiry_insert
  BEFORE INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.validate_public_inquiry_insert();

REVOKE INSERT ON public.catalogue_leads FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit catalogue lead" ON public.catalogue_leads;

DROP POLICY IF EXISTS "Anyone can upload inquiry files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload mockup request files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload mockup files" ON storage.objects;
