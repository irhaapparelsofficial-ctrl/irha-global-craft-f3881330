-- Phase 2 of runtime-incident RPC hardening.
-- Apply only after the frontend Edge-gateway release is verified live.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.record_public_app_incident(text,text,text,text,text,text,text)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_app_incident(text,text,text,text,text,text,text)
  TO service_role;

COMMENT ON FUNCTION public.record_public_app_incident(text,text,text,text,text,text,text) IS
  'Internal rate-limited runtime incident recorder. Public browsers must use the report-app-incident Edge gateway; only service_role may execute this RPC directly.';

COMMIT;
