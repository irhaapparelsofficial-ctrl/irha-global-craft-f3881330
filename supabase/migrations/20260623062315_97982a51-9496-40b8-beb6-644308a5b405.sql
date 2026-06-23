DROP POLICY IF EXISTS "Public can read published categories" ON public.categories;
DROP POLICY IF EXISTS "Public can read published products" ON public.products;

CREATE POLICY "Anyone can read published categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Admins can read all categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read published products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Admins can read all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));