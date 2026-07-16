-- Hallaqi production foundation hardening.
-- This migration is intentionally additive and idempotent so it can reconcile
-- the documented schema with the official production project safely.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent users from promoting themselves or changing moderation-owned fields.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.user_role IS DISTINCT FROM OLD.user_role OR
    NEW.user_status IS DISTINCT FROM OLD.user_status OR
    NEW.verification_status IS DISTINCT FROM OLD.verification_status
  ) AND current_user NOT IN ('postgres', 'supabase_admin')
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may update privileged profile fields'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- New sign-ups may choose only between the two public product roles. Elevated
-- roles remain administrator-controlled.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.user_role := CASE
    WHEN NEW.raw_user_meta_data->>'account_type' = 'barber' THEN 'barber'::public.user_role
    ELSE 'client'::public.user_role
  END;
BEGIN
  INSERT INTO public.profiles (
    id, full_name, avatar_url, user_role, user_status, verification_status
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    requested_role,
    'active',
    'unverified'
  )
  ON CONFLICT (id) DO NOTHING;

  IF requested_role = 'barber' THEN
    INSERT INTO public.professionals (id, business_name, business_email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_barber_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_name text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT full_name INTO caller_name FROM public.profiles WHERE id = caller_id;
  UPDATE public.profiles
  SET user_role = 'barber', updated_at = now()
  WHERE id = caller_id AND user_role IN ('client', 'barber');

  INSERT INTO public.professionals (id, business_name)
  VALUES (caller_id, caller_name)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_barber_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_barber_onboarding() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_review_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR
    NEW.is_public IS DISTINCT FROM OLD.is_public
  ) AND COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may moderate reviews'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_review_moderation_fields_trigger ON public.reviews;
CREATE TRIGGER protect_review_moderation_fields_trigger
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_review_moderation_fields();

-- Notification creation is self-only from the browser. Cross-user delivery is
-- handled by the authenticated send-notification Edge Function using service role.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Complete the manual CCP/BaridiMob payment lifecycle without granting broad
-- update access.
DROP POLICY IF EXISTS "Clients submit own payments" ON public.payments;
CREATE POLICY "Clients submit own payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (
    status IN ('pending', 'processing')
    AND auth.uid() IN (
      SELECT b.client_id FROM public.bookings b WHERE b.id = payments.booking_id
    )
  )
  WITH CHECK (
    status IN ('pending', 'processing')
    AND auth.uid() IN (
      SELECT b.client_id FROM public.bookings b WHERE b.id = payments.booking_id
    )
  );

DROP POLICY IF EXISTS "Professionals decide submitted payments" ON public.payments;
CREATE POLICY "Professionals decide submitted payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (
    status = 'processing'
    AND auth.uid() IN (
      SELECT b.professional_id FROM public.bookings b WHERE b.id = payments.booking_id
    )
  )
  WITH CHECK (
    status IN ('completed', 'failed')
    AND auth.uid() IN (
      SELECT b.professional_id FROM public.bookings b WHERE b.id = payments.booking_id
    )
  );

-- Secure chat RPCs and make their writes compatible with RLS.
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

  SELECT cm1.conversation_id INTO conv_id
  FROM public.conversation_members cm1
  JOIN public.conversation_members cm2
    ON cm1.conversation_id = cm2.conversation_id
  WHERE cm1.user_id = user1_id
    AND cm2.user_id = user2_id
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

CREATE OR REPLACE FUNCTION public.mark_conversation_messages_as_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to update this read state'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_conversation_messages_as_read(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_as_read(uuid, uuid) TO authenticated;

-- Database-maintained aggregates remove stale client-side counters.
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_professional uuid := COALESCE(NEW.professional_id, OLD.professional_id);
BEGIN
  UPDATE public.professionals
  SET
    average_rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2)
      FROM public.reviews r
      WHERE r.professional_id = target_professional
        AND r.is_public = true
        AND r.moderation_status = 'approved'
    ), 0),
    review_count = (
      SELECT COUNT(*)::integer
      FROM public.reviews r
      WHERE r.professional_id = target_professional
        AND r.is_public = true
        AND r.moderation_status = 'approved'
    ),
    updated_at = now()
  WHERE id = target_professional;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_professional_rating_trigger ON public.reviews;
CREATE TRIGGER update_professional_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_professional_rating();

CREATE OR REPLACE FUNCTION public.update_forum_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post uuid;
BEGIN
  target_post := CASE
    WHEN TG_TABLE_NAME = 'forum_comments' THEN COALESCE(NEW.post_id, OLD.post_id)
    ELSE COALESCE(NEW.post_id, OLD.post_id)
  END;

  IF target_post IS NOT NULL THEN
    UPDATE public.forum_posts
    SET
      comments_count = (
        SELECT COUNT(*)::integer FROM public.forum_comments c
        WHERE c.post_id = target_post
      ),
      likes_count = (
        SELECT COUNT(*)::integer FROM public.forum_likes l
        WHERE l.post_id = target_post
      ),
      updated_at = now()
    WHERE id = target_post;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_forum_comment_change ON public.forum_comments;
CREATE TRIGGER on_forum_comment_change
  AFTER INSERT OR DELETE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_forum_post_counts();

DROP TRIGGER IF EXISTS on_forum_like_change ON public.forum_likes;
CREATE TRIGGER on_forum_like_change
  AFTER INSERT OR DELETE ON public.forum_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_forum_post_counts();

-- Reject overlapping active appointments at the database boundary.
CREATE INDEX IF NOT EXISTS idx_bookings_time_range
  ON public.bookings (professional_id, booking_start_time, booking_end_time);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double_booking
  ON public.bookings (professional_id, booking_start_time)
  WHERE status NOT IN ('cancelled', 'no_show');

-- Repair legacy rows that were written with an end time before the start time.
-- The related service duration is authoritative; fall back to 30 minutes.
UPDATE public.bookings booking
SET
  booking_end_time = booking.booking_start_time
    + make_interval(mins => COALESCE(service.duration_minutes, 30)),
  updated_at = now()
FROM public.services service
WHERE booking.service_id = service.id
  AND booking.booking_end_time <= booking.booking_start_time;

UPDATE public.bookings
SET booking_end_time = booking_start_time + interval '30 minutes', updated_at = now()
WHERE booking_end_time <= booking_start_time;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_valid_time_range'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_valid_time_range
      CHECK (booking_end_time > booking_start_time);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_no_overlapping_active_slots'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_no_overlapping_active_slots
      EXCLUDE USING gist (
        professional_id WITH =,
        tstzrange(booking_start_time, booking_end_time, '[)') WITH &&
      )
      WHERE (status NOT IN ('cancelled', 'no_show'));
  END IF;
END;
$$;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS is_mobile_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_address text;

-- Columns already consumed by the product UI but missing from the original
-- production migration chain.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_mobile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uses_scissors boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS years_of_experience integer NOT NULL DEFAULT 0
    CHECK (years_of_experience >= 0),
  ADD COLUMN IF NOT EXISTS has_id_card boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_card_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_plan text
    CHECK (subscription_plan IS NULL OR subscription_plan IN ('basic', 'pro', 'premium')),
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0
    CHECK (followers_count >= 0),
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0
    CHECK (following_count >= 0),
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0
    CHECK (likes_count >= 0);

-- Persist user preferences instead of keeping them in ephemeral React state.
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_preferences jsonb NOT NULL DEFAULT '{
    "pushEnabled": true,
    "emailEnabled": true,
    "smsEnabled": false,
    "bookingReminders": true,
    "promotions": true,
    "forumReplies": true,
    "competitionUpdates": true,
    "newFollowers": true
  }'::jsonb,
  privacy_preferences jsonb NOT NULL DEFAULT '{
    "profileVisible": true,
    "showLocation": true,
    "showBookings": false,
    "allowMessages": "all"
  }'::jsonb,
  accessibility_preferences jsonb NOT NULL DEFAULT '{
    "fontSize": "medium",
    "highContrast": false,
    "reduceMotion": false,
    "screenReader": false
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own settings" ON public.user_settings;
CREATE POLICY "Users read own settings"
  ON public.user_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own settings" ON public.user_settings;
CREATE POLICY "Users insert own settings"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own settings" ON public.user_settings;
CREATE POLICY "Users update own settings"
  ON public.user_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Complete administrator visibility for reports.
DROP POLICY IF EXISTS "Admins read forum reports" ON public.forum_reports;
CREATE POLICY "Admins read forum reports"
  ON public.forum_reports FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Admins update forum reports" ON public.forum_reports;
CREATE POLICY "Admins update forum reports"
  ON public.forum_reports FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Canonical storage buckets used by the application.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('covers', 'covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('forum-images', 'forum-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('review-images', 'review-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Covers public read" ON storage.objects;
CREATE POLICY "Covers public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'covers');
DROP POLICY IF EXISTS "Users upload own cover" ON storage.objects;
CREATE POLICY "Users upload own cover"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users update own cover" ON storage.objects;
CREATE POLICY "Users update own cover"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users delete own cover" ON storage.objects;
CREATE POLICY "Users delete own cover"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own portfolio" ON storage.objects;
CREATE POLICY "Users update own portfolio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own review images" ON storage.objects;
CREATE POLICY "Users update own review images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own ID cards" ON storage.objects;
CREATE POLICY "Users update own ID cards"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own receipts" ON storage.objects;
CREATE POLICY "Users update own receipts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Professionals view booking receipts" ON storage.objects;
CREATE POLICY "Professionals view booking receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.payments payment
      JOIN public.bookings booking ON booking.id = payment.booking_id
      WHERE payment.receipt_url = storage.objects.name
        AND booking.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view payment receipts" ON storage.objects;
CREATE POLICY "Admins view payment receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.is_admin());

-- Ensure realtime subscriptions used by the client are published.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
