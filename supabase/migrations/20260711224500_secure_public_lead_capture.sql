-- Secure public lead capture v1
-- Browser clients no longer write directly to lead tables or upload buckets.
-- A public Edge Function validates, rate-limits and writes with the service role.

CREATE TABLE IF NOT EXISTS public.public_submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submit_inquiry','submit_catalogue','create_upload')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_submission_events_lookup_idx
  ON public.public_submission_events (fingerprint_hash, action, created_at DESC);
CREATE INDEX IF NOT EXISTS public_submission_events_created_idx
  ON public.public_submission_events (created_at DESC);

ALTER TABLE public.public_submission_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_submission_events FROM anon, authenticated;
GRANT ALL ON public.public_submission_events TO service_role;

-- WhatsApp-only contact requests are valid; the gateway enforces at least one contact method.
ALTER TABLE public.inquiries ALTER COLUMN email DROP NOT NULL;

-- Remove direct browser writes to lead tables.
REVOKE INSERT ON public.inquiries FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit inquiry" ON public.inquiries;

REVOKE INSERT ON public.catalogue_leads FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit catalogue lead" ON public.catalogue_leads;

-- Remove direct anonymous uploads. Signed upload tokens are issued by public-lead-gateway
-- only after filename, MIME, size, rate-limit and honeypot checks.
DROP POLICY IF EXISTS "Anyone can upload inquiry files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload mockup request files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload mockup files" ON storage.objects;
