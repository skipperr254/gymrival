-- ─── Challenges Feature ──────────────────────────────────────────────────────
--
-- Design notes:
--   - Two challenge types:
--       'admin'  — created by admin users, visible to all participants.
--                  Can be global (all users may join) or friends_only
--                  (only friends of the creator see it).
--       'friend' — created by any user to directly challenge specific friends.
--                  Scope is always 'direct'. Requires invitations.
--
--   - Three scoring metrics:
--       'highest_pr'    — highest single PR value logged during the challenge window.
--       'most_improved' — best PR logged during the window minus baseline at join time.
--       'total_volume'  — cumulative sum of all PR values logged during the window.
--
--   - Scores are updated automatically via a trigger on personal_records INSERT.
--     The trigger updates challenge_participants.score for every active challenge
--     the user participates in that matches the PR's exercise_key and falls
--     within the challenge time window.
--
--   - Baseline for 'most_improved' challenges is captured at join time via a
--     separate BEFORE INSERT trigger on challenge_participants.
--
--   - XP is awarded to the winner (rank 1 by score) when a challenge is
--     completed (status transitions to 'completed') via trigger.
--
-- Future integrations:
--   - Notifications: challenge_invitations has inviter_id/invitee_id; challenges
--     has reward_xp and winner_user_id — notification triggers can read these.
--   - Badges: reward_badge_slug column reserved for future badge awarding system.
--   - Social feed: challenge completions can be posted as a new feed post type;
--     the challenge_id FK is available on the challenges table.
--   - Workout logs: total_volume metric can be extended to aggregate from
--     workout_log_sets.weight_used in addition to personal_records.
--   - Realtime: challenge_participants is Realtime-enabled so live score
--     updates flow to every participant's device.

-- ── 0. Add role column to profiles ───────────────────────────────────────────
--
-- 'user'  — default for all regular accounts
-- 'admin' — can create global/friends_only admin challenges
--
-- Changing a user's role is intentionally restricted to the service role key
-- (done via Supabase dashboard or Edge Function) — RLS on profiles prevents
-- authenticated users from self-promoting.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

-- ── 1. Challenges ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who made this: 'admin' = platform-wide challenge, 'friend' = direct 1-on-1
  type              TEXT        NOT NULL DEFAULT 'admin'
                                  CHECK (type IN ('admin', 'friend')),

  -- Who can see / join: 'global' (all users), 'friends_only' (creator's friends),
  -- 'direct' (explicitly invited users only — always used for type='friend')
  scope             TEXT        NOT NULL DEFAULT 'global'
                                  CHECK (scope IN ('global', 'friends_only', 'direct')),

  -- What is being measured
  metric            TEXT        NOT NULL
                                  CHECK (metric IN ('highest_pr', 'most_improved', 'total_volume')),

  -- Which exercise the metric applies to (NULL reserved for future multi-exercise metrics)
  exercise_key      TEXT        REFERENCES public.exercise_types(key) ON DELETE SET NULL,

  title             TEXT        NOT NULL,
  description       TEXT,
  icon              TEXT,

  -- Human-readable reward description (e.g. "Gold badge + 500 XP")
  prize_label       TEXT,

  -- XP awarded to the winner on challenge completion
  reward_xp         INTEGER     NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),

  -- Reserved for future badge integration
  reward_badge_slug TEXT,

  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,

  -- 'draft' → 'active' → 'completed' | 'cancelled'
  status            TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

  -- NULL for system-generated challenges
  created_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Populated when status transitions to 'completed' (set by award_challenge_xp trigger)
  winner_user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Optional cap (NULL = unlimited)
  max_participants  INTEGER     CHECK (max_participants IS NULL OR max_participants > 0),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (ends_at > starts_at),
  -- admin challenges must not use 'direct' scope
  CHECK (NOT (type = 'admin' AND scope = 'direct')),
  -- friend challenges must use 'direct' scope
  CHECK (NOT (type = 'friend' AND scope <> 'direct'))
);

CREATE INDEX IF NOT EXISTS challenges_status_starts_idx
  ON public.challenges (status, starts_at DESC);

CREATE INDEX IF NOT EXISTS challenges_created_by_idx
  ON public.challenges (created_by, status);

CREATE INDEX IF NOT EXISTS challenges_exercise_key_idx
  ON public.challenges (exercise_key, status);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: authenticated users see
--   1. Active / completed admin challenges with global scope
--   2. Active / completed admin/friends_only challenges where they are accepted friends of creator
--   3. Direct challenges where they are a participant (invited or joined)
--   4. Any challenge they created themselves
CREATE POLICY "Users can view relevant challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by
    OR scope = 'global'
    OR (
      scope = 'friends_only'
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = created_by)
            OR
            (f.addressee_id = auth.uid() AND f.requester_id = created_by)
          )
      )
    )
    OR (
      scope = 'direct'
      AND EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        WHERE cp.challenge_id = id AND cp.user_id = auth.uid()
        UNION
        SELECT 1 FROM public.challenge_invitations ci
        WHERE ci.challenge_id = id AND ci.invitee_id = auth.uid()
      )
    )
  );

-- INSERT: admins can create any challenge; regular users can only create friend challenges
CREATE POLICY "Admins and users can create challenges"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin can create anything
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    -- Regular users can create direct friend challenges only
    (type = 'friend' AND scope = 'direct' AND created_by = auth.uid())
  );

-- UPDATE: creator or admin can update; admins can also complete/cancel any challenge
CREATE POLICY "Creators and admins can update challenges"
  ON public.challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.challenges TO authenticated;

-- ── 2. Challenge participants ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id     UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'withdrawn')),

  -- Current metric value (updated by trigger on personal_records INSERT)
  score            NUMERIC     NOT NULL DEFAULT 0,

  -- Captured at join time for 'most_improved' challenges (best PR before joining)
  baseline_score   NUMERIC     NOT NULL DEFAULT 0,

  -- Timestamp of last score update (useful for realtime freshness checks)
  score_updated_at TIMESTAMPTZ,

  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS challenge_participants_challenge_idx
  ON public.challenge_participants (challenge_id, score DESC);

CREATE INDEX IF NOT EXISTS challenge_participants_user_idx
  ON public.challenge_participants (user_id, status);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone who can see the challenge can see its participants
CREATE POLICY "Users can view challenge participants"
  ON public.challenge_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
    )
  );

-- INSERT: user can only join as themselves; challenge must be active and open
CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.status = 'active'
        AND (c.max_participants IS NULL OR (
          SELECT COUNT(*) FROM public.challenge_participants
          WHERE challenge_id = c.id AND status = 'active'
        ) < c.max_participants)
    )
  );

-- UPDATE: user can update their own row (e.g. withdraw); system trigger updates score
CREATE POLICY "Users can update own participation"
  ON public.challenge_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- DELETE: user can leave (withdraw from) a challenge
CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;

-- ── 3. Challenge invitations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenge_invitations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID        NOT NULL REFERENCES public.challenges(id)   ON DELETE CASCADE,
  inviter_id    UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  invitee_id    UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,

  -- 'pending' → 'accepted' | 'declined'
  status        TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'accepted', 'declined')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (challenge_id, invitee_id),
  CHECK (inviter_id <> invitee_id)
);

CREATE INDEX IF NOT EXISTS challenge_invitations_invitee_idx
  ON public.challenge_invitations (invitee_id, status);

CREATE INDEX IF NOT EXISTS challenge_invitations_challenge_idx
  ON public.challenge_invitations (challenge_id);

ALTER TABLE public.challenge_invitations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER challenge_invitations_updated_at
  BEFORE UPDATE ON public.challenge_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: inviter or invitee can see the invitation
CREATE POLICY "Inviter and invitee can view invitations"
  ON public.challenge_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- INSERT: only the challenge creator can send invitations
CREATE POLICY "Challenge creator can send invitations"
  ON public.challenge_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.created_by = auth.uid()
    )
  );

-- UPDATE: only the invitee can respond (accept/decline)
CREATE POLICY "Invitee can respond to invitations"
  ON public.challenge_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = invitee_id);

-- DELETE: inviter can rescind a pending invitation
CREATE POLICY "Inviter can delete pending invitations"
  ON public.challenge_invitations FOR DELETE
  TO authenticated
  USING (auth.uid() = inviter_id AND status = 'pending');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_invitations TO authenticated;

-- ── 4. Realtime ───────────────────────────────────────────────────────────────
--
-- Subscribe to challenge_participants changes on the client to get live score
-- updates without polling. Clients filter by challenge_id.

ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_invitations;

-- ── 5. Trigger: capture baseline on participant join ─────────────────────────
--
-- For 'most_improved' challenges, we record the user's current best PR for
-- the challenge's exercise as their baseline BEFORE the row is inserted.
-- Improvement is then: score = best_PR_during_challenge - baseline_score.

CREATE OR REPLACE FUNCTION public.set_challenge_baseline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric       TEXT;
  v_exercise_key TEXT;
BEGIN
  SELECT c.metric, c.exercise_key
  INTO   v_metric, v_exercise_key
  FROM   challenges c
  WHERE  c.id = NEW.challenge_id;

  IF v_metric = 'most_improved' AND v_exercise_key IS NOT NULL THEN
    SELECT COALESCE(MAX(pr.value), 0)
    INTO   NEW.baseline_score
    FROM   personal_records pr
    WHERE  pr.user_id      = NEW.user_id
      AND  pr.exercise_key = v_exercise_key;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_challenge_baseline() FROM anon, authenticated;

CREATE TRIGGER tr_challenge_participants_set_baseline
  BEFORE INSERT ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_baseline();

-- ── 6. Trigger: update scores when a PR is logged ────────────────────────────
--
-- Fires AFTER every INSERT on personal_records.
-- Finds all active challenge_participants rows where:
--   - the user is participating
--   - the challenge is currently active
--   - the PR's exercise_key matches the challenge's exercise_key
--   - the PR's created_at falls within the challenge window
--
-- Updates score according to the challenge metric:
--   highest_pr   → GREATEST(current_score, new_pr_value)
--   most_improved → GREATEST(0, best_PR_in_window - baseline_score)
--   total_volume  → current_score + new_pr_value

CREATE OR REPLACE FUNCTION public.update_challenge_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.challenge_participants cp
  SET
    score = CASE c.metric
      WHEN 'highest_pr' THEN
        GREATEST(cp.score, NEW.value)

      WHEN 'most_improved' THEN
        GREATEST(0, (
          SELECT COALESCE(MAX(pr.value), 0)
          FROM   personal_records pr
          WHERE  pr.user_id      = NEW.user_id
            AND  pr.exercise_key = c.exercise_key
            AND  pr.created_at  >= c.starts_at
        ) - cp.baseline_score)

      WHEN 'total_volume' THEN
        cp.score + NEW.value

      ELSE cp.score
    END,
    score_updated_at = NOW()
  FROM public.challenges c
  WHERE cp.challenge_id  = c.id
    AND cp.user_id       = NEW.user_id
    AND cp.status        = 'active'
    AND c.status         = 'active'
    AND c.exercise_key   = NEW.exercise_key
    AND NEW.created_at BETWEEN c.starts_at AND c.ends_at;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_challenge_scores() FROM anon, authenticated;

CREATE TRIGGER tr_personal_records_update_challenge_scores
  AFTER INSERT ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.update_challenge_scores();

-- ── 7. Trigger: award XP to winner when challenge completes ──────────────────
--
-- Fires when a challenge's status transitions to 'completed'.
-- Awards reward_xp to the participant with the highest score.
-- Also sets winner_user_id on the challenges row.
-- Level recalculates using the same formula as PR and workout XP triggers.

CREATE OR REPLACE FUNCTION public.award_challenge_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_id UUID;
BEGIN
  IF NEW.status = 'completed'
    AND (OLD.status IS DISTINCT FROM 'completed')
    AND NEW.reward_xp > 0
  THEN
    SELECT cp.user_id
    INTO   v_winner_id
    FROM   public.challenge_participants cp
    WHERE  cp.challenge_id = NEW.id
      AND  cp.status       = 'active'
    ORDER BY cp.score DESC
    LIMIT 1;

    IF v_winner_id IS NOT NULL THEN
      UPDATE public.profiles
      SET
        xp    = xp + NEW.reward_xp,
        level = GREATEST(1, (xp + NEW.reward_xp) / 500 + 1)
      WHERE id = v_winner_id;

      NEW.winner_user_id := v_winner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_challenge_xp() FROM anon, authenticated;

CREATE TRIGGER tr_challenges_award_xp
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.award_challenge_xp();

-- ── 8. RPC: challenge_leaderboard ─────────────────────────────────────────────
--
-- Returns all active participants for a challenge, ranked by score descending.
-- Ties broken by joined_at ascending (earlier joiner gets higher rank).
-- Flags the viewer with is_me = true for client-side highlighting.

CREATE OR REPLACE FUNCTION public.challenge_leaderboard(
  p_challenge_id UUID,
  p_viewer_id    UUID
)
RETURNS TABLE (
  user_id          UUID,
  full_name        TEXT,
  username         TEXT,
  avatar_url       TEXT,
  level            INT,
  score            NUMERIC,
  baseline_score   NUMERIC,
  rank             BIGINT,
  joined_at        TIMESTAMPTZ,
  is_me            BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.level,
    cp.score,
    cp.baseline_score,
    RANK() OVER (ORDER BY cp.score DESC, cp.joined_at ASC) AS rank,
    cp.joined_at,
    (cp.user_id = p_viewer_id) AS is_me
  FROM   public.challenge_participants cp
  JOIN   public.profiles p ON p.id = cp.user_id
  WHERE  cp.challenge_id = p_challenge_id
    AND  cp.status       = 'active'
  ORDER BY cp.score DESC, cp.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.challenge_leaderboard(UUID, UUID) TO authenticated;

-- ── 9. RPC: active_challenges_for_user ───────────────────────────────────────
--
-- Returns challenges that are visible and joinable for a given user:
--   - Active admin challenges with global scope
--   - Active admin challenges with friends_only scope where user is friends with creator
--   - Active direct challenges where user has an accepted or pending invitation
--   - Active friend challenges the user created themselves
--
-- Enriched with:
--   - participant_count: current number of active participants
--   - is_joined: whether the viewer is already a participant
--   - user_score: viewer's current score (null if not joined)
--   - user_rank: viewer's current rank (null if not joined or no score)

CREATE OR REPLACE FUNCTION public.active_challenges_for_user(
  p_user_id UUID
)
RETURNS TABLE (
  id                UUID,
  type              TEXT,
  scope             TEXT,
  metric            TEXT,
  exercise_key      TEXT,
  title             TEXT,
  description       TEXT,
  icon              TEXT,
  prize_label       TEXT,
  reward_xp         INTEGER,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  status            TEXT,
  created_by        UUID,
  winner_user_id    UUID,
  participant_count BIGINT,
  is_joined         BOOLEAN,
  user_score        NUMERIC,
  user_rank         BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH visible AS (
    SELECT c.id
    FROM   public.challenges c
    WHERE  c.status IN ('active', 'completed')
      AND (
        -- Global admin challenges
        c.scope = 'global'
        -- Friends-only: user is accepted friend of creator
        OR (
          c.scope = 'friends_only'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE  f.status = 'accepted'
              AND ((f.requester_id = p_user_id AND f.addressee_id = c.created_by)
                OR (f.addressee_id = p_user_id AND f.requester_id = c.created_by))
          )
        )
        -- Direct challenges where user has an invitation
        OR (
          c.scope = 'direct'
          AND EXISTS (
            SELECT 1 FROM public.challenge_invitations ci
            WHERE  ci.challenge_id = c.id AND ci.invitee_id = p_user_id
          )
        )
        -- Challenges the user created
        OR c.created_by = p_user_id
      )
  ),
  counts AS (
    SELECT   challenge_id, COUNT(*) AS cnt
    FROM     public.challenge_participants
    WHERE    status = 'active'
    GROUP BY challenge_id
  ),
  my_parts AS (
    SELECT challenge_id, score
    FROM   public.challenge_participants
    WHERE  user_id = p_user_id AND status = 'active'
  ),
  ranked AS (
    SELECT
      cp.challenge_id,
      RANK() OVER (PARTITION BY cp.challenge_id ORDER BY cp.score DESC, cp.joined_at ASC) AS rnk,
      cp.user_id
    FROM public.challenge_participants cp
    WHERE cp.status = 'active'
  )
  SELECT
    c.id,
    c.type,
    c.scope,
    c.metric,
    c.exercise_key,
    c.title,
    c.description,
    c.icon,
    c.prize_label,
    c.reward_xp,
    c.starts_at,
    c.ends_at,
    c.status,
    c.created_by,
    c.winner_user_id,
    COALESCE(counts.cnt, 0)                           AS participant_count,
    (my_parts.challenge_id IS NOT NULL)               AS is_joined,
    my_parts.score                                     AS user_score,
    ranked.rnk                                         AS user_rank
  FROM   public.challenges c
  JOIN   visible v ON v.id = c.id
  LEFT JOIN counts    ON counts.challenge_id    = c.id
  LEFT JOIN my_parts  ON my_parts.challenge_id  = c.id
  LEFT JOIN ranked    ON ranked.challenge_id    = c.id AND ranked.user_id = p_user_id
  ORDER BY c.starts_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.active_challenges_for_user(UUID) TO authenticated;
