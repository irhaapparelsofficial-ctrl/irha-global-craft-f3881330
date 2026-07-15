-- Temporary compatibility path for the currently deployed inquiry wizard.
--
-- The long-term transport is public-lead-gateway. Until every public frontend
-- release uses that function, the live wizard may still submit a PostgREST
-- insert. Keep only that exact source available to anon and rely on the
-- existing BEFORE INSERT trigger validate_public_inquiry_insert() for
-- normalization, validation and server-side rate limiting.

BEGIN;

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.inquiries FROM anon;
GRANT INSERT ON TABLE public.inquiries TO anon;

DROP POLICY IF EXISTS "Public inquiry wizard inserts" ON public.inquiries;
CREATE POLICY "Public inquiry wizard inserts"
ON public.inquiries
FOR INSERT
TO anon
WITH CHECK (
  source = 'inquiry-wizard'
  AND char_length(btrim(name)) BETWEEN 2 AND 100
  AND email IS NOT NULL
  AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND company IS NOT NULL
  AND char_length(btrim(company)) BETWEEN 2 AND 160
  AND country IS NOT NULL
  AND char_length(btrim(country)) BETWEEN 2 AND 80
  AND phone IS NOT NULL
  AND char_length(btrim(phone)) BETWEEN 6 AND 40
  AND intent IN ('rfq', 'sample', 'catalogue', 'reference', 'meeting')
  AND inquiry_ref ~ '^IRQ-[A-Z0-9-]{6,70}$'
  AND status = 'new'
  AND priority = 'normal'
  AND sample_status = 'not_requested'
  AND assignee IS NULL
  AND follow_up_at IS NULL
  AND admin_notes IS NULL
  AND quotation_url IS NULL
  AND pi_url IS NULL
  AND crm_history = '[]'::jsonb
  AND jsonb_typeof(lead_context) = 'object'
  AND octet_length(lead_context::text) <= 50000
);

COMMENT ON POLICY "Public inquiry wizard inserts" ON public.inquiries IS
  'Compatibility-only insert path for source=inquiry-wizard. validate_public_inquiry_insert() still enforces server-side validation and rate limiting. Remove after all clients use public-lead-gateway.';

COMMIT;
