-- Friendships table — used by Rivals leaderboard, Social tab, Challenges, and Chat.
-- A friendship is always stored once. requester_id sends the request,
-- addressee_id receives it. The unique index prevents A→B and B→A from coexisting.

CREATE TABLE public.friendships (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (requester_id <> addressee_id),
  CHECK (status IN ('pending', 'accepted', 'blocked'))
);

-- Prevent duplicate pairs in either direction (A→B and B→A are the same pair)
CREATE UNIQUE INDEX friendships_unique_pair
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

-- Auto-update updated_at
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see their own friendship rows (both sides)
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Only the requester can create the row
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Either side can update status (accept, block, cancel)
CREATE POLICY "Users can update their friendships"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Either side can remove the friendship
CREATE POLICY "Users can remove their friendships"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;

-- Index for fast lookups from either side
CREATE INDEX friendships_requester_idx ON public.friendships (requester_id, status);
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id, status);
