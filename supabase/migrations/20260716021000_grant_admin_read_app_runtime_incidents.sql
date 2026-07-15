-- Table-level permission is required in addition to the admin-only RLS policy.
-- Authenticated non-admin users still receive no rows because RLS remains enabled.

BEGIN;

GRANT SELECT ON TABLE public.app_runtime_incidents TO authenticated;

COMMIT;
