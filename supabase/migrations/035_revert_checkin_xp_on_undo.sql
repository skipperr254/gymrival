-- ─── Fix: "Undo Check-In" doesn't revert the awarded XP ─────────────────────
--
-- Bug: award_checkin_xp() (migration 017) grants +25 XP on the first
-- check-in of the day and sets xp_awarded = true. undoCheckin()
-- (lib/checkin.ts) simply DELETEs the row with no compensating trigger. Since
-- deleting the row also frees the "one check-in per day" slot (migration
-- 033), a user could repeat check-in → undo → check-in → undo indefinitely,
-- earning +25 XP every cycle with no limit — currency farming through UI
-- explicitly exposed as a "fix a mistake" affordance.
--
-- Fix: an AFTER DELETE trigger, symmetric to award_checkin_xp(), that
-- deducts the same 25 XP whenever a row with xp_awarded = true is deleted.
-- Net effect of a check-in/undo/check-in cycle is now a single +25 XP credit
-- at the end, not one per cycle.

CREATE OR REPLACE FUNCTION public.revert_checkin_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.xp_awarded THEN
    UPDATE public.profiles
    SET
      xp    = GREATEST(0, xp - 25),
      level = GREATEST(1, GREATEST(0, xp - 25) / 500 + 1)
    WHERE id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revert_checkin_xp() FROM anon, authenticated;

CREATE TRIGGER tr_gym_checkins_revert_xp
  AFTER DELETE ON public.gym_checkins
  FOR EACH ROW EXECUTE FUNCTION public.revert_checkin_xp();
