-- pr_likes — one row per user per personal_record like
-- Enables real-time like counts on the social feed.
CREATE TABLE public.pr_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)          ON DELETE CASCADE,
  pr_id      UUID        NOT NULL REFERENCES public.personal_records(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pr_likes_unique UNIQUE (user_id, pr_id)
);

ALTER TABLE public.pr_likes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all likes (needed to compute counts cross-user)
CREATE POLICY "pr_likes_select"
  ON public.pr_likes FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can only insert their own likes
CREATE POLICY "pr_likes_insert"
  ON public.pr_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "pr_likes_delete"
  ON public.pr_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.pr_likes TO authenticated;

-- Index for efficient per-PR like counts
CREATE INDEX pr_likes_pr_id_idx   ON public.pr_likes (pr_id);
-- Index for "has this user already liked this PR?"
CREATE INDEX pr_likes_user_pr_idx ON public.pr_likes (user_id, pr_id);

-- REPLICA IDENTITY FULL so DELETE events carry the full old row (user_id + pr_id)
-- which lets clients update like counts without a separate fetch.
ALTER TABLE public.pr_likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'pr_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pr_likes;
  END IF;
END;
$$;
