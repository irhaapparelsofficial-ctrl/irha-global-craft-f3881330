-- Irha Apparels owner Supabase cutover.
-- Restricts this private admin application to the authorised owner email,
-- provides a one-time admin bootstrap RPC, and creates required private buckets.

CREATE OR REPLACE FUNCTION public.enforce_irha_owner_auth_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) <> 'irhaapparelsofficial@gmail.com' THEN
    RAISE EXCEPTION 'owner_email_only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_irha_owner_auth_email ON auth.users;
CREATE TRIGGER trg_enforce_irha_owner_auth_email
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_irha_owner_auth_email();

CREATE OR REPLACE FUNCTION public.owner_bootstrap_open()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role
  );
$$;

REVOKE ALL ON FUNCTION public.owner_bootstrap_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_bootstrap_open() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_confirmed_at TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('irha-owner-admin-bootstrap'));

  SELECT lower(email), email_confirmed_at
  INTO v_email, v_confirmed_at
  FROM auth.users
  WHERE id = v_uid;

  IF v_email IS DISTINCT FROM 'irhaapparelsofficial@gmail.com' THEN
    RAISE EXCEPTION 'owner_email_required';
  END IF;

  IF v_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'email_confirmation_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'admin'::public.app_role AND user_id <> v_uid
  ) THEN
    RAISE EXCEPTION 'admin_already_initialized';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::public.app_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_owner_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('inquiry-uploads', 'inquiry-uploads', false),
  ('mockup-cache', 'mockup-cache', false),
  ('mockup-uploads', 'mockup-uploads', false),
  ('social-uploads', 'social-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

COMMENT ON FUNCTION public.claim_owner_admin() IS
  'One-time, email-confirmed bootstrap for the authorised Irha Apparels owner account.';
