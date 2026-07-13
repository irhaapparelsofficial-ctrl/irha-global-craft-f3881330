-- Optimize lead, outreach, email transport and WhatsApp RLS policies.
-- Existing admin/service-role authorization semantics remain unchanged.

DROP POLICY IF EXISTS "Admins read email send logs" ON public.email_send_log;
CREATE POLICY "Admins read email send logs" ON public.email_send_log
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log
  FOR INSERT TO public
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
CREATE POLICY "Service role can read send log" ON public.email_send_log
  FOR SELECT TO public
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can update send log" ON public.email_send_log
  FOR UPDATE TO public
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state
  FOR ALL TO public
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens
  FOR INSERT TO public
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens
  FOR UPDATE TO public
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens
  FOR SELECT TO public
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Admins manage lead campaigns" ON public.lead_campaigns;
CREATE POLICY "Admins manage lead campaigns" ON public.lead_campaigns
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage lead candidates" ON public.lead_candidates;
CREATE POLICY "Admins manage lead candidates" ON public.lead_candidates
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage lead search runs" ON public.lead_search_runs;
CREATE POLICY "Admins manage lead search runs" ON public.lead_search_runs
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage outreach campaigns" ON public.outreach_campaigns;
CREATE POLICY "Admins manage outreach campaigns" ON public.outreach_campaigns
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage outreach events" ON public.outreach_events;
CREATE POLICY "Admins manage outreach events" ON public.outreach_events
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage outreach messages" ON public.outreach_messages;
CREATE POLICY "Admins manage outreach messages" ON public.outreach_messages
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins read suppressed emails" ON public.suppressed_emails
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails
  FOR INSERT TO public
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails
  FOR SELECT TO public
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Admins manage WhatsApp contacts" ON public.whatsapp_contacts;
CREATE POLICY "Admins manage WhatsApp contacts" ON public.whatsapp_contacts
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage WhatsApp conversations" ON public.whatsapp_conversations;
CREATE POLICY "Admins manage WhatsApp conversations" ON public.whatsapp_conversations
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage WhatsApp messages" ON public.whatsapp_messages;
CREATE POLICY "Admins manage WhatsApp messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read WhatsApp webhook events" ON public.whatsapp_webhook_events;
CREATE POLICY "Admins read WhatsApp webhook events" ON public.whatsapp_webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
