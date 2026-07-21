-- Restore a SELECT policy on the avatars bucket — the one migration 038 dropped.
--
-- Why this is required (not optional): the app uploads a profile photo to a
-- fixed path ({user_id}/avatar) with `upsert: true` so a re-upload overwrites
-- the previous file (see uploadAvatar() in lib/api/profile.ts). Supabase
-- Storage's upsert path reads the existing object row to decide whether to
-- insert or overwrite, and that read is subject to SELECT RLS. After 038 left
-- the avatars bucket with no SELECT policy, every upload failed with
-- "new row violates row-level security policy" (surfaced in the app as the
-- generic "Could not upload photo" error).
--
-- 038's reasoning was only half right: a SELECT policy is genuinely unneeded
-- for *reads* (public bucket → served via getPublicUrl without RLS), but the
-- upsert *write* still needs it. So instead of the broad "any authenticated
-- user can list every avatar" policy from 037, grant the minimum the upsert
-- needs: each user may SELECT only their own avatar object. This matches the
-- pr_videos_storage_select_own policy pattern.
CREATE POLICY "avatars_storage_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
