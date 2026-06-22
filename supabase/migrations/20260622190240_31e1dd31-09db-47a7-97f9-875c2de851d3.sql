
DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('New','Pitched','Warm','Replied','Rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.b2b_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  country text NOT NULL,
  website text,
  email text,
  phone text,
  apparel_segment text,
  lead_status public.lead_status NOT NULL DEFAULT 'New',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_leads TO authenticated;
GRANT ALL ON public.b2b_leads TO service_role;

ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage leads" ON public.b2b_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER b2b_leads_touch BEFORE UPDATE ON public.b2b_leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX b2b_leads_country_idx ON public.b2b_leads (country);
CREATE INDEX b2b_leads_segment_idx ON public.b2b_leads (apparel_segment);
CREATE INDEX b2b_leads_status_idx ON public.b2b_leads (lead_status);
