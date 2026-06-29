CREATE TABLE public.catalogue_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  company_name TEXT,
  country TEXT,
  category_interest TEXT,
  message TEXT,
  catalogue_url TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.catalogue_leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.catalogue_leads TO authenticated;
GRANT ALL ON public.catalogue_leads TO service_role;

ALTER TABLE public.catalogue_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit catalogue lead" ON public.catalogue_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read catalogue leads" ON public.catalogue_leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update catalogue leads" ON public.catalogue_leads FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete catalogue leads" ON public.catalogue_leads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX catalogue_leads_created_at_idx ON public.catalogue_leads (created_at DESC);
CREATE INDEX catalogue_leads_status_idx ON public.catalogue_leads (status);

CREATE TRIGGER trg_catalogue_leads_updated BEFORE UPDATE ON public.catalogue_leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();