-- REPLICA IDENTITY FULL causes DELETE events emitted by Supabase Realtime to
-- carry the complete old row (all columns), not just the primary key.
-- Without this, DELETE payloads only contain { id } — which is enough to remove
-- entries from friends/requests lists by ID, but not enough to update search
-- results (which need to know which user was involved).
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

-- Add friendships to the Realtime publication so clients can subscribe to
-- postgres_changes on this table. The DO block is idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;
END;
$$;
