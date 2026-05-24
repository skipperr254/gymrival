-- Conversations: one row per 1-on-1 DM pair between users.
-- participant_a and participant_b are always ordered so that
-- LEAST(uid1, uid2) = participant_a, ensuring a single canonical row per pair.
-- The UNIQUE index enforces this regardless of insert order.

CREATE TABLE public.conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (participant_a != participant_b)
);

CREATE UNIQUE INDEX conversations_unique_pair
  ON public.conversations (LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b));

CREATE INDEX conversations_participant_a_idx
  ON public.conversations (participant_a, last_message_at DESC NULLS LAST);

CREATE INDEX conversations_participant_b_idx
  ON public.conversations (participant_b, last_message_at DESC NULLS LAST);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Either participant can view their own conversations
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

-- Either participant can create a new conversation
CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- Either participant can update (trigger updates last_message_at via SECURITY DEFINER)
CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;


-- Messages: individual messages within a conversation.
-- message_type is 'text' by default; 'challenge_invite' and 'system' are reserved
-- for future use (e.g. sending a challenge via DM).

CREATE TABLE public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (LENGTH(TRIM(content)) > 0),
  message_type    TEXT        NOT NULL DEFAULT 'text'
                              CHECK (message_type IN ('text', 'challenge_invite', 'system')),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Efficient retrieval of messages in a conversation ordered by time
CREATE INDEX messages_conversation_created_idx
  ON public.messages (conversation_id, created_at ASC);

-- Fast lookup of unread messages per conversation
CREATE INDEX messages_unread_idx
  ON public.messages (conversation_id, sender_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only participants of the conversation can read its messages
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- Only the sender can insert; they must also be a conversation participant
CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- Only the recipient can mark a message as read (update read_at)
CREATE POLICY "messages_update_read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    auth.uid() != sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() != sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;


-- Add last_message_id FK after messages exists to avoid circular dependency.
-- ON DELETE SET NULL so removing the last message doesn't cascade-delete the conversation.
ALTER TABLE public.conversations
  ADD COLUMN last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;


-- Trigger: keep conversations.last_message_at and last_message_id in sync
-- after every new message. SECURITY DEFINER lets the trigger bypass RLS
-- so it can update the conversation row even when the sender's RLS would
-- otherwise prevent it.
CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET    last_message_at = NEW.created_at,
         last_message_id = NEW.id
  WHERE  id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.on_new_message();


-- Enable Realtime for conversations and messages.
-- REPLICA IDENTITY FULL ensures DELETE events carry the full old row.
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages     REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;


-- user_presence: tracks when each user was last active.
-- The app upserts this row on a 30-second heartbeat while open.
-- "Online" is defined client-side as last_seen_at > NOW() - 5 minutes.

CREATE TABLE public.user_presence (
  user_id      UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can see presence (needed for online indicators)
CREATE POLICY "presence_select"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can only insert/update their own presence row
CREATE POLICY "presence_insert"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence_update"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;

ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END;
$$;
