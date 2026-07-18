-- =============================================================================
-- 026_challenge_translations.sql
-- Per-locale overrides for admin-authored challenge title/description.
-- =============================================================================
-- Challenges are the one piece of dynamic (non-static-bundle) copy that needs
-- real translation: admin-created challenges (type='admin') are free text
-- written once by an admin and shown to every user regardless of locale.
-- Friend challenges (type='friend') are user-authored 1-on-1 copy — that's
-- the creator's own words in their own language, same category as a chat
-- message, and is intentionally NOT covered by this table.
--
-- Client behaviour: pass the viewer's current locale to active_challenges_for_user;
-- if a translation row exists for that locale, its title/description win,
-- otherwise the base challenges.title/description (the original authored
-- language) is shown.

CREATE TABLE IF NOT EXISTS public.challenge_translations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  locale       TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (challenge_id, locale)
);

CREATE INDEX IF NOT EXISTS challenge_translations_challenge_idx
  ON public.challenge_translations (challenge_id);

ALTER TABLE public.challenge_translations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER challenge_translations_updated_at
  BEFORE UPDATE ON public.challenge_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: same visibility as the parent challenge. Referencing `challenges`
-- here is itself subject to the challenges table's own SELECT policy for the
-- querying role, so this mirrors that policy rather than duplicating its
-- logic (same idiom already used by challenge_participants' SELECT policy).
CREATE POLICY "Users can view translations of visible challenges"
  ON public.challenge_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
    )
  );

-- INSERT/UPDATE: challenge creator or an admin — same predicate as the
-- challenges table's own UPDATE policy.
CREATE POLICY "Creators and admins can add challenge translations"
  ON public.challenge_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (
          c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Creators and admins can update challenge translations"
  ON public.challenge_translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (
          c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.challenge_translations TO authenticated;

-- ── active_challenges_for_user(): add locale-aware title/description ────────
--
-- Adds a trailing p_locale parameter. Postgres treats a changed argument list
-- as a distinct overload rather than replacing the original, so the old
-- 1-arg signature is dropped first to avoid leaving a stale duplicate —
-- lib/api.ts is updated in the same change to always pass p_locale.

DROP FUNCTION IF EXISTS public.active_challenges_for_user(UUID);

CREATE OR REPLACE FUNCTION public.active_challenges_for_user(
  p_user_id UUID,
  p_locale  TEXT DEFAULT NULL
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
    COALESCE(ct.title, c.title)             AS title,
    COALESCE(ct.description, c.description) AS description,
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
  LEFT JOIN counts               ON counts.challenge_id = c.id
  LEFT JOIN my_parts              ON my_parts.challenge_id = c.id
  LEFT JOIN ranked                ON ranked.challenge_id = c.id AND ranked.user_id = p_user_id
  LEFT JOIN challenge_translations ct ON ct.challenge_id = c.id AND ct.locale = p_locale
  ORDER BY c.starts_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.active_challenges_for_user(UUID, TEXT) TO authenticated;
