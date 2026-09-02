-- ─── Avatars ──────────────────────────────────────────────────────────────────
--
-- Profile photo storage. Avatars are optional — when a user has none, the
-- client renders a generated initials avatar instead (components/ui/Avatar.tsx).
-- Files live in the public 'avatars' Supabase Storage bucket.
--
-- Path convention inside the bucket (one file per user, overwritten on re-upload):
--   {user_id}/avatar.{ext}

-- ── 1. Storage bucket ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  8388608,  -- 8 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Storage RLS policies ───────────────────────────────────────────────────

-- Users may only upload into their own folder ({user_id}/...)
CREATE POLICY "avatars_storage_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Re-uploading (upsert) a photo updates the existing object row
CREATE POLICY "avatars_storage_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- SELECT policy is added later (migration 039), scoped to the owner's own
-- folder. It is NOT for reads (this is a public bucket, served via the public
-- URL without RLS) — it is required by the `upsert: true` upload path, which
-- must read the existing object row before overwriting it. Do not drop it
-- (migration 038 did, which broke every avatar upload).

-- Users may only delete their own files (removing a photo reverts to the
-- generated initials avatar — see uploadAvatar()/removeAvatar() in lib/api/profile.ts)
CREATE POLICY "avatars_storage_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
