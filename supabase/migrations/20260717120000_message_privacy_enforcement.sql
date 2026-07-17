-- Enforce persisted message privacy preferences at conversation creation.

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
  caller_id uuid := auth.uid();
  recipient_id uuid;
  message_preference text;
BEGIN
  IF caller_id IS NULL OR caller_id NOT IN (user1_id, user2_id) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation'
      USING ERRCODE = '42501';
  END IF;
  IF user1_id = user2_id THEN
    RAISE EXCEPTION 'A conversation requires two different members'
      USING ERRCODE = '22023';
  END IF;
  recipient_id := CASE WHEN caller_id = user1_id THEN user2_id ELSE user1_id END;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
       OR (blocker_id = user2_id AND blocked_id = user1_id)
  ) THEN
    RAISE EXCEPTION 'Messaging is not available between these accounts'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(privacy_preferences->>'allowMessages', 'all')
  INTO message_preference
  FROM public.user_settings
  WHERE user_id = recipient_id;
  message_preference := COALESCE(message_preference, 'all');

  IF message_preference = 'none' THEN
    RAISE EXCEPTION 'This user does not accept new messages'
      USING ERRCODE = '42501';
  END IF;
  IF message_preference = 'followed' AND NOT EXISTS (
    SELECT 1 FROM public.favorites favorite
    WHERE (favorite.user_id = caller_id AND favorite.professional_id = recipient_id)
       OR (favorite.user_id = recipient_id AND favorite.professional_id = caller_id)
  ) THEN
    RAISE EXCEPTION 'Messaging is limited to followed accounts'
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
