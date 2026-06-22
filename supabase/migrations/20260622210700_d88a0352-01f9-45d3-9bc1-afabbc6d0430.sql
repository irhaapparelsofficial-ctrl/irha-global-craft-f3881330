CREATE POLICY "Anyone can upload mockup files"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'mockup-uploads');