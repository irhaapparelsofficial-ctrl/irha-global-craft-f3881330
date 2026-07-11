-- Atomic rate-limit token consumption for the public lead gateway.
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

  SELECT count(*)::INTEGER
    INTO v_count
  FROM public.public_submission_events
  WHERE fingerprint_hash = _fingerprint_hash
    AND action = _action
    AND created_at >= now() - make_interval(secs => _window_seconds);

  IF v_count >= _max_count THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.public_submission_events (fingerprint_hash, action)
  VALUES (_fingerprint_hash, _action);

  -- Opportunistic retention cleanup. No raw IP addresses are stored.
  DELETE FROM public.public_submission_events
  WHERE created_at < now() - interval '2 days';

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_public_submission_limit(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_submission_limit(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;
