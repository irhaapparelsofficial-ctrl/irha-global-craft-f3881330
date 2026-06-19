
-- Enum for apparel categories
DO $$ BEGIN
  CREATE TYPE public.product_category AS ENUM ('Sportswear', 'Streetwear', 'Leisurewear', 'Nightwear');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.product_category,
  description TEXT,
  material_specifications TEXT,
  wholesale_price NUMERIC,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) BUSINESS SUITS
CREATE TABLE public.business_suits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suit_name TEXT NOT NULL,
  fabric_type TEXT,
  pattern TEXT,
  construction TEXT,
  gsm_weight INTEGER,
  master_carton_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'On Quote',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_suits TO authenticated;
GRANT ALL ON public.business_suits TO service_role;
ALTER TABLE public.business_suits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage business_suits"
  ON public.business_suits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) MASTER CARTONS
CREATE TABLE public.master_cartons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carton_number TEXT UNIQUE,
  product_link UUID REFERENCES public.products(id) ON DELETE SET NULL,
  units_per_carton INTEGER NOT NULL DEFAULT 20,
  current_status TEXT NOT NULL DEFAULT 'Ready to Ship',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_cartons TO authenticated;
GRANT ALL ON public.master_cartons TO service_role;
ALTER TABLE public.master_cartons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage master_cartons"
  ON public.master_cartons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
