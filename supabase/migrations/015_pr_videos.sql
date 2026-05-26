-- ─── PR Videos ────────────────────────────────────────────────────────────────
--
-- Stores video proof for personal records.
-- One video per PR (UNIQUE on pr_id), auto-cascades on PR delete.
-- Video files live in the public 'pr-videos' Supabase Storage bucket.
-- XP bonus (+50) is awarded when status transitions to 'ready'.
--
-- Path convention inside the bucket:
--   video:     {user_id}/{pr_id}.{ext}
--   thumbnail: {user_id}/{pr_id}_thumb.jpg

-- ── 1. Storage bucket ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pr-videos',
  'pr-videos',
  true,
  524288000,  -- 500 MB per file
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Storage RLS policies ───────────────────────────────────────────────────

-- Users may only upload into their own folder ({user_id}/...)
CREATE POLICY "pr_videos_storage_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pr-videos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Any authenticated user can read (videos are social/public content)
CREATE POLICY "pr_videos_storage_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pr-videos');

-- Users may only delete their own files
CREATE POLICY "pr_videos_storage_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pr-videos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- ── 3. pr_videos table ────────────────────────────────────────────────────────

CREATE TABLE public.pr_videos (
  id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_id           UUID          NOT NULL REFERENCES public.personal_records(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES public.profiles(id)         ON DELETE CASCADE,

  -- Storage paths (relative to bucket root — no leading slash)
  video_path      TEXT          NOT NULL,
  thumbnail_path  TEXT,

  -- Video metadata captured client-side before upload
  duration_sec    SMALLINT,
  file_size_bytes BIGINT,

  -- Upload lifecycle
  status          TEXT          NOT NULL DEFAULT 'uploading'
    CONSTRAINT pr_videos_status_check
      CHECK (status IN ('uploading', 'ready', 'failed')),

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Enforce one video per PR
  CONSTRAINT pr_videos_pr_id_key UNIQUE (pr_id)
);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.pr_videos ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view video rows (public feed)
CREATE POLICY "pr_videos_select_auth"
  ON public.pr_videos FOR SELECT TO authenticated USING (true);

-- Users may only insert their own video rows
CREATE POLICY "pr_videos_insert_own"
  ON public.pr_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users may only update their own video rows (status transitions happen client-side)
CREATE POLICY "pr_videos_update_own"
  ON public.pr_videos FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users may delete their own video rows (Storage cleanup handled separately)
CREATE POLICY "pr_videos_delete_own"
  ON public.pr_videos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 5. updated_at trigger ─────────────────────────────────────────────────────

CREATE TRIGGER set_pr_videos_updated_at
  BEFORE UPDATE ON public.pr_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. XP bonus for video proof ───────────────────────────────────────────────
--
-- Awards +50 XP exactly once when a pr_videos row first reaches status='ready'.
-- The base +50 XP for the PR itself is awarded by the existing
-- tr_personal_records_award_xp trigger on personal_records INSERT.
-- Combined: 100 XP for a PR with video, 50 XP for a text-only PR.

CREATE OR REPLACE FUNCTION public.award_video_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire only on the first transition to 'ready'
  IF NEW.status = 'ready' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ready') THEN
    UPDATE public.profiles
    SET
      xp    = xp + 50,
      level = GREATEST(1, (xp + 50) / 500 + 1)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only — not a public RPC
REVOKE EXECUTE ON FUNCTION public.award_video_xp() FROM anon, authenticated;

CREATE TRIGGER tr_pr_videos_award_xp
  AFTER INSERT OR UPDATE OF status ON public.pr_videos
  FOR EACH ROW EXECUTE FUNCTION public.award_video_xp();

-- ── 7. Indexes ────────────────────────────────────────────────────────────────

-- Fast lookup by PR (most common — feed query joins on this)
CREATE INDEX pr_videos_pr_id_idx    ON public.pr_videos (pr_id);
-- Fast lookup by user (profile page, delete cleanup)
CREATE INDEX pr_videos_user_id_idx  ON public.pr_videos (user_id);

-- ── 8. Realtime publication ───────────────────────────────────────────────────
--
-- REPLICA IDENTITY FULL so that UPDATE payloads include the old row,
-- enabling the client to detect status transitions (uploading → ready).

ALTER TABLE public.pr_videos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'pr_videos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pr_videos;
  END IF;
END;
$$;
