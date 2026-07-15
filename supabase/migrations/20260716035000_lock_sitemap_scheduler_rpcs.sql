-- Sitemap scheduler RPCs are internal implementation details.
-- The Edge Function uses service_role after this migration; browsers and generic
-- signed-in sessions must not execute the SECURITY DEFINER functions directly.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.claim_sitemap_submission(text)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_sitemap_submission_result(text, boolean, integer, text)
  FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_sitemap_submission(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sitemap_submission_result(text, boolean, integer, text) TO service_role;

COMMENT ON FUNCTION public.claim_sitemap_submission(text) IS
  'Internal scheduler claim. Direct browser access is denied; scheduled-sitemap-submit calls it with service_role.';
COMMENT ON FUNCTION public.record_sitemap_submission_result(text, boolean, integer, text) IS
  'Internal scheduler result recorder. Direct browser access is denied; scheduled-sitemap-submit calls it with service_role.';

COMMIT;
