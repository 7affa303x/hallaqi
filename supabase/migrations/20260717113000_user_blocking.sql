-- User-controlled block list enforced at conversation creation.

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own block list"
  ON public.user_blocks FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL OR caller_id NOT IN (user1_id, user2_id) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation'
      USING ERRCODE = '42501';
  END IF;
  IF user1_id = user2_id THEN
    RAISE EXCEPTION 'A conversation requires two different members'
      USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
       OR (blocker_id = user2_id AND blocked_id = user1_id)
  ) THEN
    RAISE EXCEPTION 'Messaging is not available between these accounts'
      USING ERRCODE = '42501';
  END IF;

  SELECT member1.conversation_id INTO conv_id
  FROM public.conversation_members member1
  JOIN public.conversation_members member2
    ON member1.conversation_id = member2.conversation_id
  WHERE member1.user_id = user1_id
    AND member2.user_id = user2_id
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (conv_id, user1_id), (conv_id, user2_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated;
