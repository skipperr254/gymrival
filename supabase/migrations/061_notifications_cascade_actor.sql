-- A notification is about something a user did (messaged you, sent a request,
-- liked or posted a PR). When that user deletes their account, the thing it
-- points at is gone too (messages, friendships and PRs all cascade), so the
-- notification is left as a "?" avatar that opens an empty screen.
--
-- Delete them with the actor instead of nulling actor_id. `challenge_won` is
-- the only system notification (actor_id is NULL by design) and is untouched:
-- the FK only fires when a referenced profile is deleted.

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_actor_id_fkey,
  ADD CONSTRAINT notifications_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Clean up notifications already orphaned by accounts deleted before this.
DELETE FROM public.notifications
WHERE actor_id IS NULL
  AND type <> 'challenge_won';
