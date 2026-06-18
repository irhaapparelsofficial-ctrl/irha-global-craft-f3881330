-- Drop claim_admin (admin already claimed; function no longer needed and was publicly executable)
DROP FUNCTION IF EXISTS public.claim_admin();

-- Restrict has_role: keep callable by authenticated (required by RLS policies), revoke from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;