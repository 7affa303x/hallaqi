-- Complete storage access for forum publishing and identity review.

DROP POLICY IF EXISTS "Forum images public read" ON storage.objects;
CREATE POLICY "Forum images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-images');

DROP POLICY IF EXISTS "Users upload own forum images" ON storage.objects;
CREATE POLICY "Users upload own forum images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own forum images" ON storage.objects;
CREATE POLICY "Users update own forum images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'forum-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'forum-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own forum images" ON storage.objects;
CREATE POLICY "Users delete own forum images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins read ID cards" ON storage.objects;
CREATE POLICY "Admins read ID cards"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-cards' AND public.is_admin());
