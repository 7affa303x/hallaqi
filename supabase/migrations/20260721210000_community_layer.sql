-- Community & Reputation Layer
-- Transformations, tags, rankings, share cards, meme comments, review images.
-- Does NOT modify booking/auth/referral/progression engines.

-- ---------------------------------------------------------------------------
-- Transformations (Before/After barber + customer collaboration)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  before_image_url text NOT NULL,
  after_image_url text NOT NULL,
  caption text,
  status text NOT NULL DEFAULT 'pending_customer'
    CHECK (status IN ('draft', 'pending_customer', 'published', 'rejected')),
  contest_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  forum_post_id uuid REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count integer NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  shares_count integer NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
  pinned_by_barber boolean NOT NULL DEFAULT false,
  pinned_by_customer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CHECK (barber_id <> customer_id)
);

CREATE INDEX IF NOT EXISTS idx_transformations_barber ON public.transformations(barber_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transformations_customer ON public.transformations(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transformations_published ON public.transformations(status, published_at DESC)
  WHERE status = 'published';

-- ---------------------------------------------------------------------------
-- Reusable tag system (posts + transformations)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('transformation', 'forum_post')),
  resource_id uuid NOT NULL,
  tagger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tagged_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (resource_type, resource_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_tags_tagged ON public.community_tags(tagged_user_id, status);

-- ---------------------------------------------------------------------------
-- Local rankings cache (never single national-only board)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('country', 'state', 'city', 'district')),
  scope_value text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('bookings', 'xp', 'rating', 'completed_jobs', 'followers')),
  period text NOT NULL DEFAULT 'monthly'
    CHECK (period IN ('weekly', 'monthly', 'all_time')),
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_value, metric, period)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_lookup
  ON public.leaderboard_cache(scope_type, scope_value, metric, period);

-- ---------------------------------------------------------------------------
-- Share experience cards
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.share_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  barber_name text NOT NULL,
  service_name text,
  rating integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  share_channel text,
  xp_awarded integer NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_cards_user ON public.share_cards(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Review images (future-ready — no change to review submit flow required)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_images_review ON public.review_images(review_id, sort_order);

-- ---------------------------------------------------------------------------
-- Forum extensions: before/after + meme comments
-- ---------------------------------------------------------------------------

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS allow_meme_comments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS before_image_url text,
  ADD COLUMN IF NOT EXISTS after_image_url text;

ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS comment_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS meme_pack_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'forum_comments_comment_type_check'
  ) THEN
    ALTER TABLE public.forum_comments
      ADD CONSTRAINT forum_comments_comment_type_check
      CHECK (comment_type IN ('text', 'meme'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Respond to community tag (notification + status)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.respond_community_tag(p_tag_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  row public.community_tags%ROWTYPE;
  new_status text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO row FROM public.community_tags WHERE id = p_tag_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF row.tagged_user_id <> caller THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF row.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_responded', 'status', row.status);
  END IF;

  new_status := CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END;
  UPDATE public.community_tags SET status = new_status, responded_at = now() WHERE id = p_tag_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    row.tagger_id,
    CASE WHEN p_accept THEN 'تم قبول الوسم' ELSE 'تم رفض الوسم' END,
    CASE WHEN p_accept THEN 'وافق المستخدم على الوسم في منشورك' ELSE 'رفض المستخدم الوسم' END,
    'forum',
    jsonb_build_object('tag_id', p_tag_id, 'resource_type', row.resource_type, 'resource_id', row.resource_id, 'accepted', p_accept)
  );

  RETURN jsonb_build_object('ok', true, 'status', new_status, 'tag_id', p_tag_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_community_tag(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- Customer responds to transformation collaboration
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.respond_transformation_collaboration(p_transformation_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  row public.transformations%ROWTYPE;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO row FROM public.transformations WHERE id = p_transformation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF row.customer_id <> caller THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF row.status <> 'pending_customer' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', row.status);
  END IF;

  IF p_accept THEN
    UPDATE public.transformations
    SET status = 'published', published_at = now()
    WHERE id = p_transformation_id;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      row.barber_id,
      'تحول منشور',
      'وافق العميل على نشر التحول قبل/بعد',
      'forum',
      jsonb_build_object('transformation_id', p_transformation_id, 'event', 'transformation_approved')
    );
  ELSE
    UPDATE public.transformations SET status = 'rejected' WHERE id = p_transformation_id;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      row.barber_id,
      'رفض التحول',
      'رفض العميل نشر التحول قبل/بعد',
      'forum',
      jsonb_build_object('transformation_id', p_transformation_id, 'event', 'transformation_rejected')
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN p_accept THEN 'published' ELSE 'rejected' END,
    'transformation_id', p_transformation_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_transformation_collaboration(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published transformations are public" ON public.transformations;
CREATE POLICY "Published transformations are public"
  ON public.transformations FOR SELECT
  USING (status = 'published' OR barber_id = auth.uid() OR customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Barbers create transformations" ON public.transformations;
CREATE POLICY "Barbers create transformations"
  ON public.transformations FOR INSERT TO authenticated
  WITH CHECK (barber_id = auth.uid());

DROP POLICY IF EXISTS "Participants update transformations" ON public.transformations;
CREATE POLICY "Participants update transformations"
  ON public.transformations FOR UPDATE TO authenticated
  USING (barber_id = auth.uid() OR customer_id = auth.uid())
  WITH CHECK (barber_id = auth.uid() OR customer_id = auth.uid());

DROP POLICY IF EXISTS "Tags visible to participants" ON public.community_tags;
CREATE POLICY "Tags visible to participants"
  ON public.community_tags FOR SELECT TO authenticated
  USING (
    tagger_id = auth.uid() OR tagged_user_id = auth.uid() OR public.is_admin()
    OR (status = 'accepted')
  );

DROP POLICY IF EXISTS "Users create tags" ON public.community_tags;
CREATE POLICY "Users create tags"
  ON public.community_tags FOR INSERT TO authenticated
  WITH CHECK (tagger_id = auth.uid() AND tagger_id <> tagged_user_id);

DROP POLICY IF EXISTS "Tagged user updates tag status" ON public.community_tags;
CREATE POLICY "Tagged user updates tag status"
  ON public.community_tags FOR UPDATE TO authenticated
  USING (tagged_user_id = auth.uid())
  WITH CHECK (tagged_user_id = auth.uid());

DROP POLICY IF EXISTS "Leaderboards are public" ON public.leaderboard_cache;
CREATE POLICY "Leaderboards are public"
  ON public.leaderboard_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users read own share cards" ON public.share_cards;
CREATE POLICY "Users read own share cards"
  ON public.share_cards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users create share cards" ON public.share_cards;
CREATE POLICY "Users create share cards"
  ON public.share_cards FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Review images public when review public" ON public.review_images;
CREATE POLICY "Review images public when review public"
  ON public.review_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.is_public = true AND r.moderation_status = 'approved'
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Reviewers add review images" ON public.review_images;
CREATE POLICY "Reviewers add review images"
  ON public.review_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.reviewer_id = auth.uid()
    )
  );
