-- Phase 1.2: harden the one-time owner admin claim path.
-- Repository source only. Apply during the final owner-approved backend activation.

CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  _other_admin_count bigint := 0;
  _claimed boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF _email <> 'irhaapparelsofficial@gmail.com' THEN
    RAISE EXCEPTION 'owner_identity_required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
    INTO _other_admin_count
  FROM public.user_roles
  WHERE role::text = 'admin'
    AND user_id <> _user_id;

  IF _other_admin_count > 0 THEN
    RAISE EXCEPTION 'admin_already_initialized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  ) THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_user_id, 'admin');
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  ) INTO _claimed;

  RETURN _claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_owner_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_owner_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO service_role;

COMMENT ON FUNCTION public.claim_owner_admin() IS
  'Allows only the authenticated exact Irha owner email to initialize the single admin role when no different admin exists.';

CREATE OR REPLACE FUNCTION public.owner_auth_readiness()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  _is_admin boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  ) INTO _is_admin;

  RETURN jsonb_build_object(
    'authenticated', true,
    'owner_email_match', _email = 'irhaapparelsofficial@gmail.com',
    'admin_role', _is_admin,
    'user_id', _user_id,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.owner_auth_readiness() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_auth_readiness() FROM anon;
GRANT EXECUTE ON FUNCTION public.owner_auth_readiness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_auth_readiness() TO service_role;

COMMENT ON FUNCTION public.owner_auth_readiness() IS
  'Returns non-secret authenticated owner/admin readiness evidence for the current session.';
