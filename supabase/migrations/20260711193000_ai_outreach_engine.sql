-- Irha AI Outreach Engine v1
-- Approval-based, personalized Gmail outreach with exact delivery/thread records.

CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_focus TEXT[] NOT NULL DEFAULT '{}',
  target_market TEXT,
  objective TEXT NOT NULL,
  language_mode TEXT NOT NULL DEFAULT 'auto',
  call_to_action TEXT NOT NULL DEFAULT 'Reply with your product requirements or request a live factory video call.',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','sending','active','paused','completed','failed','cancelled')),
  selected_lead_count INTEGER NOT NULL DEFAULT 0,
  draft_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.b2b_leads(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL DEFAULT 0 CHECK (sequence_number BETWEEN 0 AND 10),
  parent_message_id UUID REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_company TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  personalization_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','approved','sending','sent','failed','rejected','suppressed','replied','unsubscribed','duplicate'
  )),
  idempotency_key TEXT NOT NULL UNIQUE,
  unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  gmail_history_id TEXT,
  connector_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.outreach_messages(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'draft_generated','approved','send_started','sent','send_failed','reply_detected','unsubscribed','suppressed','rejected','status_sync'
  )),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_leads
  ADD COLUMN IF NOT EXISTS outreach_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_outreach_status TEXT,
  ADD COLUMN IF NOT EXISTS last_gmail_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS outreach_campaigns_status_idx ON public.outreach_campaigns (status, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_campaign_status_idx ON public.outreach_messages (campaign_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_lead_idx ON public.outreach_messages (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_gmail_thread_idx ON public.outreach_messages (gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_events_campaign_idx ON public.outreach_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_events_message_idx ON public.outreach_events (message_id, created_at DESC);

ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_events TO authenticated;
GRANT ALL ON public.outreach_campaigns, public.outreach_messages, public.outreach_events TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage outreach campaigns" ON public.outreach_campaigns
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage outreach messages" ON public.outreach_messages
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage outreach events" ON public.outreach_events
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins need read-only visibility into suppression and provider send logs.
GRANT SELECT ON public.suppressed_emails, public.email_send_log TO authenticated;
DO $$ BEGIN
  CREATE POLICY "Admins read suppressed emails" ON public.suppressed_emails
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admins read email send logs" ON public.email_send_log
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- process-email-queue records rate-limit outcomes; retain that truthful state.
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending','sent','suppressed','failed','bounced','complained','dlq','rate_limited'));
END $$;

DROP TRIGGER IF EXISTS trg_outreach_campaigns_updated ON public.outreach_campaigns;
CREATE TRIGGER trg_outreach_campaigns_updated
  BEFORE UPDATE ON public.outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_outreach_messages_updated ON public.outreach_messages;
CREATE TRIGGER trg_outreach_messages_updated
  BEFORE UPDATE ON public.outreach_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
