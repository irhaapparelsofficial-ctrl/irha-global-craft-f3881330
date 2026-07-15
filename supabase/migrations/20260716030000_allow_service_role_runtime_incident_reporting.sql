-- Phase 1 of runtime-incident RPC hardening.
-- The old browser client remains compatible during rollout; the Edge gateway
-- receives an explicit service-role grant before the frontend switches over.
-- This grant-only phase is idempotent and does not alter stored customer data.

BEGIN;

REVOKE ALL ON FUNCTION public.record_public_app_incident(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_public_app_incident(text,text,text,text,text,text,text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.record_public_app_incident(text,text,text,text,text,text,text) IS
  'Internal rate-limited runtime incident recorder. Browser traffic is being migrated to report-app-incident; direct anon/authenticated execution is removed after live cutover verification.';

COMMIT;
