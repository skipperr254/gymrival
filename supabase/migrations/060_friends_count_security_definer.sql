-- 060: sync_friends_count must run as SECURITY DEFINER.
--
-- Migration 024 revoked client UPDATE on profiles.friends_count on the
-- assumption that every counter trigger is SECURITY DEFINER. This one was not,
-- so it ran as the accepting user, its UPDATE of both profiles was denied, and
-- every friend-request accept (and every unfriend of an accepted friend) failed
-- with 403. Same body as before; only the security mode changes.

CREATE OR REPLACE FUNCTION public.sync_friends_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Trigger functions are never called directly; keep them off the RPC surface.
REVOKE EXECUTE ON FUNCTION public.sync_friends_count() FROM PUBLIC, anon, authenticated;
