-- The Vault-authorized sitemap queue/finalizer is internal.
-- Browsers and generic signed-in sessions must not call its SECURITY DEFINER
-- implementation functions directly.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.claim_sitemap_submission(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_sitemap_submission_result(text, boolean, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_sitemap_submission(text, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_sitemap_submission() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_sitemap_submission(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sitemap_submission_result(text, boolean, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_sitemap_submission(text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_sitemap_submission() TO service_role;

COMMIT;
