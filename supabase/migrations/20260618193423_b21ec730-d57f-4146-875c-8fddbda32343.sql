
CREATE POLICY "Admins read social uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'social-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload social uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete social uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'social-uploads' AND public.has_role(auth.uid(), 'admin'));
