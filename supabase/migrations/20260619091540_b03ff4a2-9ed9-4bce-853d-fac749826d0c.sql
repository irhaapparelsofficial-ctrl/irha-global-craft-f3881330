
-- 1) Remove publicly-exposed wholesale_price column from products
ALTER TABLE public.products DROP COLUMN IF EXISTS wholesale_price;

-- 2) Add admin-only UPDATE policy for social-uploads bucket on storage.objects
DROP POLICY IF EXISTS "Admins update social-uploads" ON storage.objects;
CREATE POLICY "Admins update social-uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'social-uploads' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'social-uploads' AND public.has_role(auth.uid(), 'admin'));
