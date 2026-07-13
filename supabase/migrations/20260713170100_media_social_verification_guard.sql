-- Phase 5.2 follow-up: make Media Library verification service-controlled.

CREATE OR REPLACE FUNCTION public.media_assets_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_call boolean := COALESCE(auth.role() = 'service_role', false);
  verification_changed boolean := false;
BEGIN
  IF NOT service_call AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    verification_changed :=
      OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
      OLD.width_px IS DISTINCT FROM NEW.width_px OR
      OLD.height_px IS DISTINCT FROM NEW.height_px OR
      OLD.duration_ms IS DISTINCT FROM NEW.duration_ms OR
      OLD.checksum_sha256 IS DISTINCT FROM NEW.checksum_sha256;
    IF verification_changed AND NOT service_call THEN
      RAISE EXCEPTION 'media verification fields are renderer/service controlled' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT service_call AND NEW.verification_status <> 'pending' THEN
    RAISE EXCEPTION 'new admin uploads must start pending verification' USING ERRCODE = '42501';
  END IF;

  IF NEW.verification_status NOT IN ('pending','verified','rejected') THEN
    RAISE EXCEPTION 'invalid media verification status';
  END IF;

  IF NEW.verification_status = 'verified' THEN
    IF NEW.width_px IS NULL OR NEW.width_px < 100 OR NEW.height_px IS NULL OR NEW.height_px < 100 THEN
      RAISE EXCEPTION 'verified media requires valid dimensions';
    END IF;
    IF NEW.checksum_sha256 IS NULL OR NEW.checksum_sha256 !~ '^[A-Fa-f0-9]{64}$' THEN
      RAISE EXCEPTION 'verified media requires SHA-256 checksum';
    END IF;
    IF NEW.mime_type !~ '^(image|video)/' THEN
      RAISE EXCEPTION 'only image or video media can be verified for social use';
    END IF;
    IF NEW.mime_type ~ '^video/' AND (NEW.duration_ms IS NULL OR NEW.duration_ms <= 0) THEN
      RAISE EXCEPTION 'verified video requires duration';
    END IF;
  END IF;

  IF NEW.social_approved THEN
    IF NEW.status <> 'active' OR NEW.verification_status <> 'verified' THEN
      RAISE EXCEPTION 'only active verified media can be approved for social use';
    END IF;
    IF TG_OP = 'INSERT' OR NOT COALESCE(OLD.social_approved, false) THEN
      NEW.social_approved_at := now();
      NEW.social_approved_by := COALESCE(auth.uid(), NEW.social_approved_by);
    END IF;
  ELSE
    NEW.social_approved_at := NULL;
    NEW.social_approved_by := NULL;
  END IF;

  NEW.updated_at := now();
  IF NOT service_call THEN
    NEW.updated_by := auth.uid();
    IF TG_OP = 'INSERT' THEN NEW.created_by := COALESCE(NEW.created_by, auth.uid()); END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.media_assets_before_write() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.complete_media_asset_verification(
  _asset_id uuid,
  _status text,
  _width_px integer,
  _height_px integer,
  _duration_ms integer,
  _checksum_sha256 text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('verified','rejected') THEN
    RAISE EXCEPTION 'terminal verification status required';
  END IF;

  UPDATE public.media_assets
  SET verification_status = _status,
      width_px = _width_px,
      height_px = _height_px,
      duration_ms = _duration_ms,
      checksum_sha256 = lower(nullif(btrim(_checksum_sha256),'')),
      social_approved = CASE WHEN _status = 'verified' THEN social_approved ELSE false END
  WHERE id = _asset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'media asset not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_media_asset_verification(uuid,text,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_media_asset_verification(uuid,text,integer,integer,integer,text) TO service_role;
