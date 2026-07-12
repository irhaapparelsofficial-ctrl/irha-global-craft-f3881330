-- Supabase may auto-grant newly created public functions to anon/authenticated.
-- Keep the published-content reader public, but explicitly remove anon execution
-- from every admin CMS RPC. Each admin RPC also checks user_roles at runtime.

REVOKE EXECUTE ON FUNCTION public.cms_get_admin_document(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cms_save_draft(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cms_publish_document(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cms_restore_revision(text, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.cms_get_published_document(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_get_admin_document(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_save_draft(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_publish_document(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_restore_revision(text, uuid) TO authenticated;
