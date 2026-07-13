-- Restrict role membership checks to the current authenticated user while
-- preserving existing RLS/admin checks that call has_role(auth.uid(), ...).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE
    WHEN auth.role() = 'service_role' THEN
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
      )
    WHEN auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN
      false
    ELSE
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = _role
      )
  END
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'Self-scoped role check for authenticated callers; service_role may inspect explicit users. Used by RLS and guarded admin RPCs.';
