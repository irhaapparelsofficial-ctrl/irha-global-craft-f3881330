
-- Reference column on inquiries (idempotency + human ref)
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS inquiry_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_inquiry_ref_key ON public.inquiries(inquiry_ref) WHERE inquiry_ref IS NOT NULL;

-- Storage policies for inquiry-uploads
CREATE POLICY "Anyone can upload inquiry files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'inquiry-uploads');

CREATE POLICY "Admins read inquiry uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'inquiry-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete inquiry uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inquiry-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update inquiry uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inquiry-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));
