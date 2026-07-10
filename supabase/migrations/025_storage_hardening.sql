-- ============================================================================
-- Migration 025: Storage hardening (advisor: public_bucket_allows_listing)
--
-- Both buckets are empty at time of writing (0 objects), so this is safe:
--  - `student-photos`: unused by the frontend (StudentForm uploads to
--    `avatars/students/`) — flip to private outright.
--  - `avatars`: bucket stays public because the app stores plain public URLs
--    in DB fields and renders them with <img>, but the broad SELECT policy is
--    scoped to `authenticated` so anonymous clients can no longer LIST the
--    bucket contents via the storage API.
-- ============================================================================

UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

DROP POLICY IF EXISTS avatars_select_public ON storage.objects;
CREATE POLICY avatars_select_authenticated ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
