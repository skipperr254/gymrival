-- Add personal_records to the Realtime publication so clients can receive
-- INSERT events when friends (or the current user) log new PRs.
-- This drives the live "new post" updates on the social feed.
--
-- REPLICA IDENTITY FULL is not strictly needed for INSERT events (the new
-- row is always complete), but is set here for DELETE consistency should we
-- ever need it (e.g. if a PR is removed it can be cleaned from the feed).
ALTER TABLE public.personal_records REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'personal_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_records;
  END IF;
END;
$$;
