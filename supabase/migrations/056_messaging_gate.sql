-- =============================================================================
-- 056_messaging_gate.sql
-- B3b: free users read messages; sending is Pro.
-- =============================================================================
-- Why reading stays free
--   Blocking reads would create a dead end: a paying subscriber messages a
--   friend who can never see it, so the sender's feature is broken by the
--   recipient's plan. Letting them read with a locked composer turns the same
--   moment into the sharpest upgrade prompt in the app — a named friend is
--   visibly waiting on a reply.
--
--   Confirmed with the client 2026-09-14, explicitly as something to revisit
--   once there is live data.
--
-- What is NOT gated
--   `messages_select`  — reading, untouched.
--   `messages_update_read` — marking as read, untouched. Gating it would
--   leave free users with a permanently wrong unread badge and would break
--   the sender's read receipts, punishing the Pro user for the free user's
--   plan.
-- =============================================================================

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND public.is_pro_user((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = messages.conversation_id
         AND ((SELECT auth.uid()) IN (c.participant_a, c.participant_b))
    )
  );

COMMENT ON POLICY "messages_insert" ON public.messages IS
  'Sending requires Pro (B3b). Reading and marking-as-read are deliberately left free — see migration 056.';
