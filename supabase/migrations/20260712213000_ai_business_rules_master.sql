-- Irha Apparels AI Business Rules Master
-- Prepared for the final backend activation batch. Do not apply before the owner-approved migration step.

CREATE TABLE IF NOT EXISTS public.ai_business_rules (
  id TEXT PRIMARY KEY DEFAULT 'default',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_business_rules_singleton CHECK (id = 'default'),
  CONSTRAINT ai_business_rules_object_check CHECK (jsonb_typeof(rules) = 'object')
);

ALTER TABLE public.ai_business_rules ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_business_rules TO authenticated;
GRANT ALL ON public.ai_business_rules TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage AI business rules" ON public.ai_business_rules
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_ai_business_rules_updated ON public.ai_business_rules;
CREATE TRIGGER trg_ai_business_rules_updated
  BEFORE UPDATE ON public.ai_business_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS ai_business_rules_status_idx
  ON public.ai_business_rules (status, updated_at DESC);

COMMENT ON TABLE public.ai_business_rules IS
  'Admin-approved source of truth for AI commercial, manufacturing, claims and approval rules.';
