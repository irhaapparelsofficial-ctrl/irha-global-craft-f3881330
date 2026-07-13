-- Follow-up for the security-scan migration: anonymous visitors remain unable
-- to bypass the gateway, while authenticated admins retain normal CRM actions.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_leads TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inquiries FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.catalogue_leads FROM anon;
