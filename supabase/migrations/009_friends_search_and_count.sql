-- Enable trigram extension for efficient partial-match (ILIKE) searches on profile names.
-- Without this, ILIKE queries do full-table scans; with it, GIN indexes cut lookup time
-- to O(log n) even on large profiles tables.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes on the two searchable profile columns
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx
  ON public.profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS profiles_full_name_trgm_idx
  ON public.profiles USING gin (full_name gin_trgm_ops);

-- ─── Keep profiles.friends_count in sync ──────────────────────────────────────
--
-- Invariant: friends_count equals the number of 'accepted' friendship rows
-- where this profile is either requester or addressee.
--
-- The normal lifecycle is:
--   INSERT (status='pending') → UPDATE (status='accepted') → DELETE
-- So we only increment on UPDATE pending→accepted and decrement on DELETE/un-accept.

CREATE OR REPLACE FUNCTION public.sync_friends_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Friendship accepted
    IF OLD.status <> 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE public.profiles
        SET friends_count = friends_count + 1
        WHERE id IN (NEW.requester_id, NEW.addressee_id);
    -- Friendship un-accepted (edge case: admin intervention or future block flow)
    ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
      UPDATE public.profiles
        SET friends_count = GREATEST(0, friends_count - 1)
        WHERE id IN (NEW.requester_id, NEW.addressee_id);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Unfriend or accepted → blocked transition
    UPDATE public.profiles
      SET friends_count = GREATEST(0, friends_count - 1)
      WHERE id IN (OLD.requester_id, OLD.addressee_id);
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER friendships_sync_count
  AFTER UPDATE OR DELETE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.sync_friends_count();
