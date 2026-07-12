-- Explicit privilege hardening for Supabase's automatic function grants.

REVOKE ALL ON FUNCTION public.catalog_touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_touch_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.catalog_touch_updated_at() FROM authenticated;

REVOKE ALL ON FUNCTION public.catalog_record_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_record_change() FROM anon;
REVOKE ALL ON FUNCTION public.catalog_record_change() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.catalog_get_admin_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_get_public_release() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_get_admin_health() TO authenticated;
