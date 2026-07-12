-- Irha Apparels WhatsApp Business inbox foundation
-- Prepared for the single final owner-approved backend activation batch.

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT NOT NULL UNIQUE,
  phone_e164 TEXT,
  profile_name TEXT,
  language_code TEXT,
  crm_lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE SET NULL,
  opt_in_status TEXT NOT NULL DEFAULT 'inbound_contact' CHECK (opt_in_status IN ('unknown', 'inbound_contact', 'opted_in', 'opted_out', 'blocked')),
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_contacts_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_review', 'human_required', 'closed', 'blocked')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  qualification_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (qualification_status IN ('unreviewed', 'needs_information', 'qualified', 'unqualified')),
  qualification JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_summary TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_conversations_qualification_object CHECK (jsonb_typeof(qualification) = 'object')
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  wa_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'contacts', 'interactive', 'template', 'unsupported')),
  body TEXT,
  media_id TEXT,
  media_mime_type TEXT,
  reply_to_wa_message_id TEXT,
  template_name TEXT,
  template_language TEXT,
  status TEXT NOT NULL CHECK (status IN ('received', 'draft', 'approved', 'queued', 'sent', 'delivered', 'read', 'failed', 'deleted')),
  requires_owner_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  error TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_messages_payload_object CHECK (jsonb_typeof(raw_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_webhook_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_contacts TO service_role;
GRANT ALL ON public.whatsapp_conversations TO service_role;
GRANT ALL ON public.whatsapp_messages TO service_role;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage WhatsApp contacts" ON public.whatsapp_contacts
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage WhatsApp conversations" ON public.whatsapp_conversations
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage WhatsApp messages" ON public.whatsapp_messages
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins read WhatsApp webhook events" ON public.whatsapp_webhook_events
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_whatsapp_contacts_updated ON public.whatsapp_contacts;
CREATE TRIGGER trg_whatsapp_contacts_updated BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_whatsapp_conversations_updated ON public.whatsapp_conversations;
CREATE TRIGGER trg_whatsapp_conversations_updated BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_updated BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_one_active_conversation_per_contact
  ON public.whatsapp_conversations(contact_id)
  WHERE status IN ('open', 'pending_review', 'human_required');
CREATE INDEX IF NOT EXISTS whatsapp_conversations_attention_idx
  ON public.whatsapp_conversations(status, unread_count DESC, last_message_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_idx
  ON public.whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx
  ON public.whatsapp_messages(direction, status, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_contacts_crm_idx
  ON public.whatsapp_contacts(crm_lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_status_idx
  ON public.whatsapp_webhook_events(status, created_at DESC);

COMMENT ON TABLE public.whatsapp_contacts IS 'WhatsApp Business contacts linked to buyer CRM records.';
COMMENT ON TABLE public.whatsapp_conversations IS 'Admin-reviewed WhatsApp buyer conversations and qualification state.';
COMMENT ON TABLE public.whatsapp_messages IS 'Inbound and owner-approved outbound WhatsApp message evidence.';
COMMENT ON TABLE public.whatsapp_webhook_events IS 'Deduplicated signed WhatsApp webhook event log.';
