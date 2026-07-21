-- Progression Engine: XP, levels, badges, achievements, missions, streaks.
-- Separate from loyalty (points/redemption). Coins/Reward Store intentionally omitted.
-- TODO(coins): add coins_balance + reward_store tables when redemption ships.

-- ---------------------------------------------------------------------------
-- Catalog + user state
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.progression_badges (
  id text PRIMARY KEY,
  category text NOT NULL
    CHECK (category IN (
      'booking', 'community', 'referral', 'gallery', 'verification', 'seasonal', 'streak'
    )),
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  emoji text NOT NULL DEFAULT '🏅',
  color text NOT NULL DEFAULT '#0F766E',
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_bonus integer NOT NULL DEFAULT 0 CHECK (xp_bonus >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progression_achievements (
  id text PRIMARY KEY,
  title_ar text NOT NULL,
  description_ar text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progression_missions (
  id text PRIMARY KEY,
  title_ar text NOT NULL,
  description_ar text NOT NULL,
  mission_type text NOT NULL
    CHECK (mission_type IN ('daily', 'weekly', 'monthly', 'seasonal')),
  target integer NOT NULL DEFAULT 1 CHECK (target > 0),
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  signal_key text NOT NULL,
  season_key text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progression_level_unlocks (
  id text PRIMARY KEY,
  min_level integer NOT NULL CHECK (min_level >= 1),
  unlock_key text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  description_ar text NOT NULL,
  -- Placeholder only — feature gating implemented later.
  is_placeholder boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  -- TODO(coins): coins_balance integer NOT NULL DEFAULT 0
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_ledger_dedupe
  ON public.xp_ledger (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_created
  ON public.xp_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_event_day
  ON public.xp_ledger (user_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.progression_badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  is_pinned boolean NOT NULL DEFAULT false,
  pin_order integer,
  PRIMARY KEY (user_id, badge_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_pin_order
  ON public.user_badges (user_id, pin_order)
  WHERE is_pinned = true AND pin_order IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.progression_achievements(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  earned_at timestamptz,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.user_missions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id text NOT NULL REFERENCES public.progression_missions(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  target integer NOT NULL DEFAULT 1 CHECK (target > 0),
  completed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mission_id, period_key)
);

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  best_streak integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  last_active_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Level helper (must match client LEVEL_THRESHOLDS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.progression_level_from_xp(total_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  thresholds integer[] := ARRAY[
    0, 100, 250, 500, 900, 1500, 2400, 3700, 5500, 8000,
    11200, 15200, 20200, 26200, 33500, 42200, 52500, 64500, 78500, 95000
  ];
  lvl integer := 1;
  i integer;
  xp integer := GREATEST(0, COALESCE(total_xp, 0));
  next_need integer;
BEGIN
  FOR i IN 1..array_length(thresholds, 1) LOOP
    IF xp >= thresholds[i] THEN
      lvl := i;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Extend beyond table with ~1.45 growth
  IF lvl >= array_length(thresholds, 1) THEN
    next_need := thresholds[array_length(thresholds, 1)];
    WHILE xp >= next_need LOOP
      lvl := lvl + 1;
      next_need := next_need + GREATEST(100, FLOOR(100 * power(1.45, GREATEST(lvl - 2, 0)))::integer);
      IF lvl > 200 THEN
        EXIT;
      END IF;
    END LOOP;
    lvl := GREATEST(1, lvl - 1);
  END IF;

  RETURN GREATEST(1, lvl);
END;
$$;

-- ---------------------------------------------------------------------------
-- Award XP (single entry for server-side awards)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_progression_xp(
  p_event_type text,
  p_amount integer DEFAULT NULL,
  p_dedupe_key text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  amount integer;
  inserted_id uuid;
  new_total integer;
  new_level integer;
  defaults jsonb := '{
    "first_booking": 20,
    "completed_booking": 10,
    "returning_customer_booking": 20,
    "invite_customer": 10,
    "invite_barber": 50,
    "complete_profile": 20,
    "phone_verification": 5,
    "first_gallery_photo": 10,
    "gallery_completed": 50,
    "create_post": 5,
    "create_comment": 2,
    "review_with_text": 5,
    "star_rating_only": 1,
    "daily_login": 1,
    "mission_reward": 0,
    "badge_bonus": 0,
    "achievement_reward": 0
  }'::jsonb;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  amount := COALESCE(p_amount, NULLIF((defaults ->> p_event_type)::integer, 0));
  IF amount IS NULL OR amount <= 0 THEN
    IF p_amount IS NOT NULL AND p_amount > 0 THEN
      amount := p_amount;
    ELSE
      amount := COALESCE((defaults ->> p_event_type)::integer, 0);
    END IF;
  END IF;

  IF amount IS NULL OR amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  -- Once-per-day caps for post/comment
  IF p_event_type IN ('create_post', 'create_comment', 'daily_login') THEN
    IF EXISTS (
      SELECT 1 FROM public.xp_ledger
      WHERE user_id = caller
        AND event_type = p_event_type
        AND created_at::date = (timezone('utc', now()))::date
    ) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit');
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.xp_ledger (user_id, event_type, amount, dedupe_key, metadata)
    VALUES (caller, p_event_type, amount, NULLIF(p_dedupe_key, ''), COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO inserted_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate');
  END;

  IF inserted_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_inserted');
  END IF;

  INSERT INTO public.user_progress (user_id, total_xp, level, updated_at)
  VALUES (caller, amount, public.progression_level_from_xp(amount), now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = public.user_progress.total_xp + amount,
    level = public.progression_level_from_xp(public.user_progress.total_xp + amount),
    updated_at = now()
  RETURNING total_xp, level INTO new_total, new_level;

  RETURN jsonb_build_object(
    'ok', true,
    'amount', amount,
    'total_xp', new_total,
    'level', new_level,
    'ledger_id', inserted_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_progression_xp(text, integer, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Streak touch
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_progression_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
  row public.user_streaks%ROWTYPE;
  new_current integer;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO row FROM public.user_streaks WHERE user_id = caller;
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, best_streak, last_active_date)
    VALUES (caller, 1, 1, today)
    RETURNING * INTO row;
    RETURN jsonb_build_object(
      'ok', true,
      'current_streak', row.current_streak,
      'best_streak', row.best_streak,
      'last_active_date', row.last_active_date
    );
  END IF;

  IF row.last_active_date = today THEN
    RETURN jsonb_build_object(
      'ok', true,
      'current_streak', row.current_streak,
      'best_streak', row.best_streak,
      'last_active_date', row.last_active_date,
      'unchanged', true
    );
  END IF;

  IF row.last_active_date = today - 1 THEN
    new_current := row.current_streak + 1;
  ELSE
    new_current := 1;
  END IF;

  UPDATE public.user_streaks SET
    current_streak = new_current,
    best_streak = GREATEST(best_streak, new_current),
    last_active_date = today,
    updated_at = now()
  WHERE user_id = caller
  RETURNING * INTO row;

  RETURN jsonb_build_object(
    'ok', true,
    'current_streak', row.current_streak,
    'best_streak', row.best_streak,
    'last_active_date', row.last_active_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_progression_streak() TO authenticated;

-- ---------------------------------------------------------------------------
-- Booking completion → XP (does not alter booking app logic)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.progression_on_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prior_any integer;
  prior_same integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' OR OLD.status IS NOT DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.xp_ledger (user_id, event_type, amount, dedupe_key, metadata)
    VALUES (
      NEW.client_id,
      'completed_booking',
      10,
      'completed_booking:' || NEW.id::text,
      jsonb_build_object('booking_id', NEW.id)
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  SELECT COUNT(*) INTO prior_any
  FROM public.bookings b
  WHERE b.client_id = NEW.client_id
    AND b.status = 'completed'
    AND b.id <> NEW.id;

  IF prior_any = 0 THEN
    BEGIN
      INSERT INTO public.xp_ledger (user_id, event_type, amount, dedupe_key, metadata)
      VALUES (
        NEW.client_id,
        'first_booking',
        20,
        'first_booking:' || NEW.client_id::text,
        jsonb_build_object('booking_id', NEW.id)
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  SELECT COUNT(*) INTO prior_same
  FROM public.bookings b
  WHERE b.client_id = NEW.client_id
    AND b.professional_id = NEW.professional_id
    AND b.status = 'completed'
    AND b.id <> NEW.id;

  IF prior_same > 0 THEN
    BEGIN
      INSERT INTO public.xp_ledger (user_id, event_type, amount, dedupe_key, metadata)
      VALUES (
        NEW.client_id,
        'returning_customer_booking',
        20,
        'returning_customer_booking:' || NEW.id::text,
        jsonb_build_object('booking_id', NEW.id, 'professional_id', NEW.professional_id)
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- Recompute totals from ledger inserts for this user (idempotent sum of new rows is hard;
  -- bump by detecting successful inserts via re-sync)
  INSERT INTO public.user_progress (user_id, total_xp, level, updated_at)
  SELECT
    NEW.client_id,
    COALESCE(SUM(l.amount), 0),
    public.progression_level_from_xp(COALESCE(SUM(l.amount), 0)::integer),
    now()
  FROM public.xp_ledger l
  WHERE l.user_id = NEW.client_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    level = EXCLUDED.level,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS progression_on_booking_completed_trigger ON public.bookings;
CREATE TRIGGER progression_on_booking_completed_trigger
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.progression_on_booking_completed();

-- Pin limit (max 8)
CREATE OR REPLACE FUNCTION public.enforce_badge_pin_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pinned_count integer;
BEGIN
  IF NEW.is_pinned IS TRUE THEN
    SELECT COUNT(*) INTO pinned_count
    FROM public.user_badges
    WHERE user_id = NEW.user_id AND is_pinned = true
      AND NOT (badge_id = NEW.badge_id);
    IF pinned_count >= 8 THEN
      RAISE EXCEPTION 'Maximum 8 pinned badges' USING ERRCODE = '23514';
    END IF;
    IF NEW.pin_order IS NULL THEN
      NEW.pin_order := pinned_count + 1;
    END IF;
  ELSE
    NEW.pin_order := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_badge_pin_limit_trigger ON public.user_badges;
CREATE TRIGGER enforce_badge_pin_limit_trigger
  BEFORE INSERT OR UPDATE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_badge_pin_limit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.progression_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_level_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active progression badges are readable"
  ON public.progression_badges FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Active progression achievements are readable"
  ON public.progression_achievements FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Active progression missions are readable"
  ON public.progression_missions FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Level unlock defs are readable"
  ON public.progression_level_unlocks FOR SELECT
  USING (true);

CREATE POLICY "Users read own progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users read own xp ledger"
  ON public.xp_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users read own badges"
  ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users update own badge pins"
  ON public.user_badges FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users read own missions"
  ON public.user_missions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users read own streaks"
  ON public.user_streaks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Public can view another user's earned badges (profile showcase)
CREATE POLICY "Earned badges are public"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "Public can read user progress levels"
  ON public.user_progress FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Seed catalogs
-- ---------------------------------------------------------------------------

INSERT INTO public.progression_badges (id, category, name_ar, description_ar, emoji, color, criteria, xp_bonus, sort_order) VALUES
  ('first_booking', 'booking', 'أول حجز', 'أكملت أول موعد عبر حلاقي', '✂️', '#0F766E', '{"completed_bookings":1}', 15, 10),
  ('bookings_10', 'booking', '10 حجوزات', 'أكملت 10 مواعيد', '🔟', '#0F766E', '{"completed_bookings":10}', 25, 20),
  ('bookings_50', 'booking', '50 حجزاً', 'أكملت 50 موعداً', '💎', '#0F766E', '{"completed_bookings":50}', 50, 30),
  ('bookings_100', 'booking', '100 حجز', 'أكملت 100 موعد', '👑', '#0F766E', '{"completed_bookings":100}', 100, 40),
  ('trusted', 'verification', 'موثوق', 'حساب موثوق على حلاقي', '🛡️', '#2563EB', '{"trusted":true}', 20, 50),
  ('verified', 'verification', 'موثّق', 'تم التحقق من هويتك', '✅', '#059669', '{"verified":true}', 20, 60),
  ('content_creator', 'community', 'صانع محتوى', 'نشرت عدة مواضيع في المنتدى', '✍️', '#7C3AED', '{"forum_posts":5}', 25, 70),
  ('ambassador', 'referral', 'سفير', 'دعوت عدة أصدقاء', '🎁', '#DB2777', '{"referral_shares":5}', 40, 80),
  ('early_supporter', 'seasonal', 'داعم مبكر', 'انضممت في مرحلة الإطلاق', '🌱', '#D97706', '{"early_supporter":true}', 15, 90),
  ('gallery_master', 'gallery', 'سيد المعرض', 'أكملت معرض أعمالك', '🖼️', '#EA580C', '{"gallery_completed":true}', 50, 100),
  ('streak_7', 'streak', 'سلسلة أسبوع', '7 أيام متتالية', '🔥', '#EA580C', '{"streak_days":7}', 20, 110),
  ('streak_30', 'streak', 'سلسلة شهر', '30 يوماً متتالياً', '🔥', '#DC2626', '{"streak_days":30}', 40, 120),
  ('streak_100', 'streak', 'سلسلة 100', '100 يوم متتالٍ', '🔥', '#B91C1C', '{"streak_days":100}', 80, 130),
  ('streak_365', 'streak', 'سلسلة سنة', '365 يوماً متتالياً', '🏆', '#7F1D1D', '{"streak_days":365}', 200, 140)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  criteria = EXCLUDED.criteria,
  xp_bonus = EXCLUDED.xp_bonus,
  is_active = true;

INSERT INTO public.progression_achievements (id, title_ar, description_ar, criteria, xp_reward, sort_order) VALUES
  ('ach_first_booking', 'أول حجز', 'أكمل أول موعد', '{"completed_bookings":1}', 10, 10),
  ('ach_first_review', 'أول تقييم', 'اترك أول تقييم', '{"reviews":1}', 10, 20),
  ('ach_first_comment', 'أول تعليق', 'علّق لأول مرة في المنتدى', '{"forum_comments":1}', 5, 30),
  ('ach_first_post', 'أول منشور', 'انشر أول موضوع', '{"forum_posts":1}', 10, 40),
  ('ach_customers_10', '10 زبائن', '10 حجوزات مكتملة', '{"completed_bookings":10}', 25, 50),
  ('ach_customers_50', '50 زبوناً', '50 حجزاً مكتملاً', '{"completed_bookings":50}', 50, 60),
  ('ach_customers_100', '100 زبون', '100 حجز مكتمل', '{"completed_bookings":100}', 100, 70),
  ('ach_referrals_10', '10 دعوات', 'شارك الدعوة 10 مرات', '{"referral_shares":10}', 40, 80)
ON CONFLICT (id) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  description_ar = EXCLUDED.description_ar,
  criteria = EXCLUDED.criteria,
  xp_reward = EXCLUDED.xp_reward,
  is_active = true;

INSERT INTO public.progression_missions (id, title_ar, description_ar, mission_type, target, xp_reward, signal_key, sort_order) VALUES
  ('daily_login', 'تسجيل الدخول', 'افتح التطبيق اليوم', 'daily', 1, 5, 'daily_login', 10),
  ('daily_comment', 'علّق اليوم', 'اكتب تعليقاً في المنتدى', 'daily', 1, 10, 'forum_comment_today', 20),
  ('daily_review', 'قيّم اليوم', 'اترك تقييماً', 'daily', 1, 10, 'review_today', 30),
  ('daily_photo', 'ارفع صورة', 'أضف صورة للملف أو المعرض', 'daily', 1, 10, 'has_avatar', 40),
  ('weekly_booking', 'أكمل حجزاً', 'حجز واحد هذا الأسبوع', 'weekly', 1, 25, 'bookings_this_week', 10),
  ('weekly_posts', 'انشر مواضيع', 'منشوران هذا الأسبوع', 'weekly', 2, 25, 'forum_posts_week', 20),
  ('weekly_invite', 'ادعُ صديقاً', 'شارك كود الدعوة', 'weekly', 1, 25, 'referral_shares', 30),
  ('monthly_bookings', '5 حجوزات', 'أكمل 5 حجوزات هذا الشهر', 'monthly', 5, 75, 'bookings_this_month', 10),
  ('monthly_reviews', '10 تقييمات', 'اترك 10 تقييمات', 'monthly', 10, 75, 'reviewed_bookings', 20),
  ('monthly_gallery', 'حدّث المعرض', 'حدّث معرض أعمالك', 'monthly', 1, 50, 'gallery_updated', 30)
ON CONFLICT (id) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  description_ar = EXCLUDED.description_ar,
  target = EXCLUDED.target,
  xp_reward = EXCLUDED.xp_reward,
  signal_key = EXCLUDED.signal_key,
  is_active = true;

INSERT INTO public.progression_level_unlocks (id, min_level, unlock_key, title_ar, description_ar, is_placeholder) VALUES
  ('unlock_gallery_slots', 3, 'extra_gallery_slots', 'مساحات معرض إضافية', 'فتح مساحات إضافية للمعرض (قريباً)', true),
  ('unlock_extra_badges', 5, 'extra_badges', 'شارات إضافية', 'عرض شارات أكثر على الملف (قريباً)', true),
  ('unlock_mini_website', 8, 'mini_website', 'موقع مصغّر', 'صفحة عامة احترافية (قريباً)', true),
  ('unlock_premium_profile', 10, 'premium_profile', 'ملف مميّز', 'مظهر ملف احترافي (قريباً)', true),
  ('unlock_special_themes', 12, 'special_themes', 'سمات خاصة', 'سمات حصرية للمستويات العليا (قريباً)', true)
ON CONFLICT (id) DO UPDATE SET
  min_level = EXCLUDED.min_level,
  title_ar = EXCLUDED.title_ar,
  description_ar = EXCLUDED.description_ar,
  is_placeholder = true;
