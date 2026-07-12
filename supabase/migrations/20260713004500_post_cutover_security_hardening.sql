-- Post-cutover security hardening.
-- Public browser chat is handled through the Edge Function and analytics is consent-gated GA.

REVOKE ALL ON FUNCTION public.enforce_irha_owner_auth_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can log chat message" ON public.chat_messages;
REVOKE INSERT ON public.chat_messages FROM anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;

DROP POLICY IF EXISTS "Anyone can log page view" ON public.page_views;
REVOKE INSERT ON public.page_views FROM anon, authenticated;
GRANT ALL ON public.page_views TO service_role;
