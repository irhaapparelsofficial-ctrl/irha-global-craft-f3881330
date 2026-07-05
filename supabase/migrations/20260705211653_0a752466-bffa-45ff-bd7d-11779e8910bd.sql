-- Phase 6 conversion foundation: add structured lead_context + intent to inquiries.
-- Enables shortlist/compare/RFQ/sample/meeting/catalogue flows to write into one
-- table with rich context for Phase 7 CRM consumption.

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS lead_context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS inquiries_intent_idx ON public.inquiries (intent);
CREATE INDEX IF NOT EXISTS inquiries_lead_context_gin_idx ON public.inquiries USING gin (lead_context);
