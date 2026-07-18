-- 029_rls_initplan_optimization.sql
--
-- Performance hardening: wrap every `auth.uid()` call inside RLS policies in a
-- scalar subquery `(select auth.uid())`.
--
-- Why: when a policy references `auth.uid()` directly, Postgres treats it as a
-- volatile call and re-evaluates it once *per row* scanned. Wrapping it in a
-- subquery lets the planner hoist it to an InitPlan that runs exactly once per
-- query. This resolves all 46 `auth_rls_initplan` performance advisories.
--
-- Behaviour is unchanged: each policy's predicate is byte-for-byte identical to
-- the original except for the `auth.uid()` -> `(select auth.uid())` rewrite.
-- The whole migration runs in one transaction, so no policy is ever missing.

-- ── challenge_invitations ────────────────────────────────────────────────────
drop policy if exists "Challenge creator can send invitations" on public.challenge_invitations;
create policy "Challenge creator can send invitations" on public.challenge_invitations
  for insert to authenticated
  with check (((select auth.uid()) = inviter_id) and (exists (
    select 1 from challenges c
    where ((c.id = challenge_invitations.challenge_id) and (c.created_by = (select auth.uid()))))));

drop policy if exists "Invitee can respond to invitations" on public.challenge_invitations;
create policy "Invitee can respond to invitations" on public.challenge_invitations
  for update to authenticated
  using (((select auth.uid()) = invitee_id));

drop policy if exists "Inviter and invitee can view invitations" on public.challenge_invitations;
create policy "Inviter and invitee can view invitations" on public.challenge_invitations
  for select to authenticated
  using ((((select auth.uid()) = inviter_id) or ((select auth.uid()) = invitee_id)));

drop policy if exists "Inviter can delete pending invitations" on public.challenge_invitations;
create policy "Inviter can delete pending invitations" on public.challenge_invitations
  for delete to authenticated
  using ((((select auth.uid()) = inviter_id) and (status = 'pending'::text)));

-- ── challenge_participants ───────────────────────────────────────────────────
drop policy if exists "Users can join challenges" on public.challenge_participants;
create policy "Users can join challenges" on public.challenge_participants
  for insert to authenticated
  with check (((select auth.uid()) = user_id) and (exists (
    select 1 from challenges c
    where ((c.id = challenge_participants.challenge_id) and (c.status = 'active'::text) and ((c.max_participants is null) or ((
      select count(*) as count from challenge_participants challenge_participants_1
      where ((challenge_participants_1.challenge_id = c.id) and (challenge_participants_1.status = 'active'::text))) < c.max_participants))))));

drop policy if exists "Users can leave challenges" on public.challenge_participants;
create policy "Users can leave challenges" on public.challenge_participants
  for delete to authenticated
  using (((select auth.uid()) = user_id));

drop policy if exists "Users can update own participation" on public.challenge_participants;
create policy "Users can update own participation" on public.challenge_participants
  for update to authenticated
  using (((select auth.uid()) = user_id));

-- ── challenge_translations ───────────────────────────────────────────────────
drop policy if exists "Creators and admins can add challenge translations" on public.challenge_translations;
create policy "Creators and admins can add challenge translations" on public.challenge_translations
  for insert to authenticated
  with check (exists (
    select 1 from challenges c
    where ((c.id = challenge_translations.challenge_id) and ((c.created_by = (select auth.uid())) or (exists (
      select 1 from profiles p where ((p.id = (select auth.uid())) and (p.role = 'admin'::text))))))));

drop policy if exists "Creators and admins can update challenge translations" on public.challenge_translations;
create policy "Creators and admins can update challenge translations" on public.challenge_translations
  for update to authenticated
  using (exists (
    select 1 from challenges c
    where ((c.id = challenge_translations.challenge_id) and ((c.created_by = (select auth.uid())) or (exists (
      select 1 from profiles p where ((p.id = (select auth.uid())) and (p.role = 'admin'::text))))))));

-- ── challenges ───────────────────────────────────────────────────────────────
drop policy if exists "Admins and users can create challenges" on public.challenges;
create policy "Admins and users can create challenges" on public.challenges
  for insert to authenticated
  with check ((exists (
    select 1 from profiles p where ((p.id = (select auth.uid())) and (p.role = 'admin'::text)))) or ((type = 'friend'::text) and (scope = 'direct'::text) and (created_by = (select auth.uid()))));

drop policy if exists "Creators and admins can update challenges" on public.challenges;
create policy "Creators and admins can update challenges" on public.challenges
  for update to authenticated
  using (((select auth.uid()) = created_by) or (exists (
    select 1 from profiles p where ((p.id = (select auth.uid())) and (p.role = 'admin'::text)))));

drop policy if exists "Users can view relevant challenges" on public.challenges;
create policy "Users can view relevant challenges" on public.challenges
  for select to authenticated
  using (((select auth.uid()) = created_by) or (scope = 'global'::text) or ((scope = 'friends_only'::text) and (exists (
    select 1 from friendships f
    where ((f.status = 'accepted'::text) and (((f.requester_id = (select auth.uid())) and (f.addressee_id = challenges.created_by)) or ((f.addressee_id = (select auth.uid())) and (f.requester_id = challenges.created_by))))))) or ((scope = 'direct'::text) and (exists (
    select 1 from challenge_participants cp
    where ((cp.challenge_id = cp.id) and (cp.user_id = (select auth.uid())))
    union
    select 1 from challenge_invitations ci
    where ((ci.challenge_id = ci.id) and (ci.invitee_id = (select auth.uid())))))));

-- ── conversations ────────────────────────────────────────────────────────────
drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations
  for insert to authenticated
  with check (((select auth.uid()) = participant_a) or ((select auth.uid()) = participant_b));

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (((select auth.uid()) = participant_a) or ((select auth.uid()) = participant_b));

drop policy if exists "conversations_update" on public.conversations;
create policy "conversations_update" on public.conversations
  for update to authenticated
  using (((select auth.uid()) = participant_a) or ((select auth.uid()) = participant_b));

-- ── friendships ──────────────────────────────────────────────────────────────
drop policy if exists "Users can remove their friendships" on public.friendships;
create policy "Users can remove their friendships" on public.friendships
  for delete to authenticated
  using (((select auth.uid()) = requester_id) or ((select auth.uid()) = addressee_id));

drop policy if exists "Users can send friend requests" on public.friendships;
create policy "Users can send friend requests" on public.friendships
  for insert to authenticated
  with check (((select auth.uid()) = requester_id));

drop policy if exists "Users can update their friendships" on public.friendships;
create policy "Users can update their friendships" on public.friendships
  for update to authenticated
  using (((select auth.uid()) = requester_id) or ((select auth.uid()) = addressee_id));

drop policy if exists "Users can view their friendships" on public.friendships;
create policy "Users can view their friendships" on public.friendships
  for select to authenticated
  using (((select auth.uid()) = requester_id) or ((select auth.uid()) = addressee_id));

-- ── gym_checkins ─────────────────────────────────────────────────────────────
drop policy if exists "Users can delete own check-ins" on public.gym_checkins;
create policy "Users can delete own check-ins" on public.gym_checkins
  for delete to authenticated
  using (((select auth.uid()) = user_id));

drop policy if exists "Users can insert own check-ins" on public.gym_checkins;
create policy "Users can insert own check-ins" on public.gym_checkins
  for insert to authenticated
  with check (((select auth.uid()) = user_id));

drop policy if exists "Users can see own and friends check-ins" on public.gym_checkins;
create policy "Users can see own and friends check-ins" on public.gym_checkins
  for select to authenticated
  using (((select auth.uid()) = user_id) or (exists (
    select 1 from friendships f
    where ((f.status = 'accepted'::text) and (((f.requester_id = (select auth.uid())) and (f.addressee_id = gym_checkins.user_id)) or ((f.addressee_id = (select auth.uid())) and (f.requester_id = gym_checkins.user_id)))))));

drop policy if exists "Users can update own check-ins" on public.gym_checkins;
create policy "Users can update own check-ins" on public.gym_checkins
  for update to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── gyms ─────────────────────────────────────────────────────────────────────
drop policy if exists "Users can submit gyms" on public.gyms;
create policy "Users can submit gyms" on public.gyms
  for insert to authenticated
  with check (((select auth.uid()) = created_by) or (created_by is null));

drop policy if exists "Users can update own submitted gyms" on public.gyms;
create policy "Users can update own submitted gyms" on public.gyms
  for update to authenticated
  using (((select auth.uid()) = created_by) and (is_verified = false))
  with check (((select auth.uid()) = created_by));

-- ── messages ─────────────────────────────────────────────────────────────────
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (((select auth.uid()) = sender_id) and (exists (
    select 1 from conversations c
    where ((c.id = messages.conversation_id) and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))))));

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (exists (
    select 1 from conversations c
    where ((c.id = messages.conversation_id) and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid()))))));

drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
  for update to authenticated
  using (((select auth.uid()) <> sender_id) and (exists (
    select 1 from conversations c
    where ((c.id = messages.conversation_id) and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))))))
  with check (((select auth.uid()) <> sender_id) and (exists (
    select 1 from conversations c
    where ((c.id = messages.conversation_id) and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))))));

-- ── notifications (role: public) ─────────────────────────────────────────────
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to public
  using (((select auth.uid()) = user_id));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to public
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── personal_records ─────────────────────────────────────────────────────────
drop policy if exists "Users can delete own PRs" on public.personal_records;
create policy "Users can delete own PRs" on public.personal_records
  for delete to authenticated
  using (((select auth.uid()) = user_id));

drop policy if exists "Users can insert own PRs" on public.personal_records;
create policy "Users can insert own PRs" on public.personal_records
  for insert to authenticated
  with check (((select auth.uid()) = user_id));

drop policy if exists "Users can update own PRs" on public.personal_records;
create policy "Users can update own PRs" on public.personal_records
  for update to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── pr_likes ─────────────────────────────────────────────────────────────────
drop policy if exists "pr_likes_delete" on public.pr_likes;
create policy "pr_likes_delete" on public.pr_likes
  for delete to authenticated
  using (((select auth.uid()) = user_id));

drop policy if exists "pr_likes_insert" on public.pr_likes;
create policy "pr_likes_insert" on public.pr_likes
  for insert to authenticated
  with check (((select auth.uid()) = user_id));

-- ── pr_videos ────────────────────────────────────────────────────────────────
drop policy if exists "pr_videos_delete_own" on public.pr_videos;
create policy "pr_videos_delete_own" on public.pr_videos
  for delete to authenticated
  using ((user_id = (select auth.uid())));

drop policy if exists "pr_videos_insert_own" on public.pr_videos;
create policy "pr_videos_insert_own" on public.pr_videos
  for insert to authenticated
  with check ((user_id = (select auth.uid())));

drop policy if exists "pr_videos_update_own" on public.pr_videos;
create policy "pr_videos_update_own" on public.pr_videos
  for update to authenticated
  using ((user_id = (select auth.uid())));

-- ── profiles (update role: public) ───────────────────────────────────────────
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to public
  using (((select auth.uid()) = id));

-- ── session_exercises ────────────────────────────────────────────────────────
drop policy if exists "Users can manage own session exercises" on public.session_exercises;
create policy "Users can manage own session exercises" on public.session_exercises
  for all to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── training_programs ────────────────────────────────────────────────────────
drop policy if exists "Users can manage own programs" on public.training_programs;
create policy "Users can manage own programs" on public.training_programs
  for all to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── training_sessions ────────────────────────────────────────────────────────
drop policy if exists "Users can manage own sessions" on public.training_sessions;
create policy "Users can manage own sessions" on public.training_sessions
  for all to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── user_presence ────────────────────────────────────────────────────────────
drop policy if exists "presence_insert" on public.user_presence;
create policy "presence_insert" on public.user_presence
  for insert to authenticated
  with check (((select auth.uid()) = user_id));

drop policy if exists "presence_update" on public.user_presence;
create policy "presence_update" on public.user_presence
  for update to authenticated
  using (((select auth.uid()) = user_id));

-- ── workout_log_sets ─────────────────────────────────────────────────────────
drop policy if exists "Users can manage own workout log sets" on public.workout_log_sets;
create policy "Users can manage own workout log sets" on public.workout_log_sets
  for all to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

-- ── workout_logs ─────────────────────────────────────────────────────────────
drop policy if exists "Users can manage own workout logs" on public.workout_logs;
create policy "Users can manage own workout logs" on public.workout_logs
  for all to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));
