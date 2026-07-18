-- 030_fk_covering_indexes.sql
--
-- Adds covering indexes for foreign-key columns that had none. Without an index
-- on the referencing column, every lookup/join across the FK and every cascade
-- check on the parent row triggers a sequential scan. Resolves the 10
-- `unindexed_foreign_keys` performance advisories.

create index if not exists idx_challenge_invitations_inviter_id
  on public.challenge_invitations (inviter_id);

create index if not exists idx_challenges_winner_user_id
  on public.challenges (winner_user_id);

create index if not exists idx_conversations_last_message_id
  on public.conversations (last_message_id);

create index if not exists idx_gyms_created_by
  on public.gyms (created_by);

create index if not exists idx_messages_sender_id
  on public.messages (sender_id);

create index if not exists idx_notifications_actor_id
  on public.notifications (actor_id);

create index if not exists idx_session_exercises_exercise_key
  on public.session_exercises (exercise_key);

create index if not exists idx_session_exercises_user_id
  on public.session_exercises (user_id);

create index if not exists idx_workout_log_sets_exercise_key
  on public.workout_log_sets (exercise_key);

create index if not exists idx_workout_log_sets_session_exercise_id
  on public.workout_log_sets (session_exercise_id);
