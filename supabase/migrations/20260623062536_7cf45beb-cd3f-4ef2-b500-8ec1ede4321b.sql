DROP POLICY IF EXISTS "Anyone can upload mockup files" ON storage.objects;

CREATE POLICY "Anyone can upload mockup request files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'mockup-uploads'
    AND (storage.foldername(name))[1] = 'requests'
    AND char_length(name) < 200
    AND name ~ '^requests/[a-z0-9._\-]+$'
  );