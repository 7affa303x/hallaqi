-- Growth Layer: Referrals, Coins, Ambassador, Mini Sites, Analytics, Anti-Abuse
-- Additive only — does NOT modify booking/auth/progression core logic.

-- ---------------------------------------------------------------------------
-- Referral codes (persistent per user)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  referral_type text NOT NULL DEFAULT 'customer'
    CHECK (referral_type IN ('barber', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- ---------------------------------------------------------------------------
-- Referral attributions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  referral_type text NOT NULL CHECK (referral_type IN ('barber', 'customer')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'rejected', 'banned')),
  xp_awarded integer NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (referrer_id <> referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_pending ON public.referrals(referred_id, status) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Coins (independent from XP / levels)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_coins (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coins_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  event_type text NOT NULL,
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_coins_ledger_user ON public.coins_ledger(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Reward store (display-only placeholders)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reward_store_items (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('pro', 'coupon', 'product', 'credit', 'gift_card')),
  coin_cost integer NOT NULL DEFAULT 0 CHECK (coin_cost >= 0),
  image_emoji text NOT NULL DEFAULT '🎁',
  sort_order integer NOT NULL DEFAULT 0,
  coming_soon boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Mini websites
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mini_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  theme text NOT NULL DEFAULT 'default',
  seo_title text,
  seo_description text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$')
);

CREATE INDEX IF NOT EXISTS idx_mini_sites_slug ON public.mini_sites(slug) WHERE is_published = true;

-- ---------------------------------------------------------------------------
-- Ambassador unlocks (auto-evaluated)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ambassador_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  rating_snapshot numeric(3,2) NOT NULL DEFAULT 0,
  level_snapshot integer NOT NULL DEFAULT 1,
  bookings_snapshot integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------------
-- Analytics + anti-abuse
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.growth_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_analytics_user ON public.growth_analytics_events(user_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abuse_flags_user ON public.abuse_flags(user_id, flag_type);

-- ---------------------------------------------------------------------------
-- Seed reward store placeholders
-- ---------------------------------------------------------------------------

INSERT INTO public.reward_store_items (id, title, description, category, coin_cost, image_emoji, sort_order, coming_soon)
VALUES
  ('pro_month', 'شهر Pro مجاني', 'اشتراك احترافي لمدة شهر', 'pro', 500, '👑', 10, true),
  ('coupon_10', 'كوبون خصم 10%', 'خصم على الحجز القادم', 'coupon', 200, '🏷️', 20, true),
  ('product_sample', 'منتج عناية', 'عينة من متجر الشركاء', 'product', 150, '🧴', 30, true),
  ('promo_credit', 'رصيد ترويج', 'رصيد إعلاني للحلاقين', 'credit', 300, '📣', 40, true),
  ('gift_card', 'بطاقة هدية', 'بطاقة هدية حلاقي', 'gift_card', 400, '🎁', 50, true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.growth_referral_type_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.user_role IN ('barber', 'specialist') THEN 'barber'
    ELSE 'customer'
  END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.growth_generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  tries integer := 0;
BEGIN
  base := upper(replace(left(p_user_id::text, 8), '-', ''));
  candidate := 'HALLAQI-' || base;
  WHILE EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.code = candidate) AND tries < 5 LOOP
    tries := tries + 1;
    candidate := 'HALLAQI-' || upper(substr(md5(p_user_id::text || tries::text), 1, 4));
  END LOOP;
  RETURN candidate;
END;
$$;

-- ---------------------------------------------------------------------------
-- Ensure referral code for current user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  existing public.referral_codes%ROWTYPE;
  new_code text;
  rtype text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing FROM public.referral_codes WHERE user_id = caller;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'code', existing.code, 'referral_type', existing.referral_type);
  END IF;

  rtype := COALESCE(public.growth_referral_type_for_user(caller), 'customer');
  new_code := public.growth_generate_referral_code(caller);

  INSERT INTO public.referral_codes (user_id, code, referral_type)
  VALUES (caller, new_code, rtype)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO existing FROM public.referral_codes WHERE user_id = caller;
  RETURN jsonb_build_object('ok', true, 'code', existing.code, 'referral_type', existing.referral_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_referral_code() TO authenticated;

-- ---------------------------------------------------------------------------
-- Attribute referral on signup (anti-abuse checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.attribute_referral(p_code text, p_referred_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := COALESCE(p_referred_id, auth.uid());
  ref_row public.referral_codes%ROWTYPE;
  normalized text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  normalized := upper(trim(p_code));
  IF normalized = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;

  SELECT * INTO ref_row FROM public.referral_codes WHERE code = normalized;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  IF ref_row.user_id = caller THEN
    INSERT INTO public.abuse_flags (user_id, flag_type, severity, metadata)
    VALUES (caller, 'self_referral', 'medium', jsonb_build_object('code', normalized));
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals r WHERE r.referred_id = caller) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_attributed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals r WHERE r.referrer_id = caller AND r.referred_id = ref_row.user_id) THEN
    INSERT INTO public.abuse_flags (user_id, flag_type, severity, metadata)
    VALUES (caller, 'circular_referral', 'medium', jsonb_build_object('code', normalized));
    RETURN jsonb_build_object('ok', false, 'reason', 'circular_referral');
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referral_type, status)
  VALUES (ref_row.user_id, caller, ref_row.code, ref_row.referral_type, 'pending');

  INSERT INTO public.growth_analytics_events (user_id, event_type, metadata)
  VALUES (ref_row.user_id, 'invite_accepted', jsonb_build_object('referred_id', caller, 'code', normalized));

  RETURN jsonb_build_object('ok', true, 'referrer_id', ref_row.user_id, 'referral_type', ref_row.referral_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.attribute_referral(text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Complete referral reward after first completed booking
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_pending_referral(p_referred_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_row public.referrals%ROWTYPE;
  xp_amount integer;
  completed_count integer;
BEGIN
  SELECT COUNT(*) INTO completed_count
  FROM public.bookings b
  WHERE b.client_id = p_referred_id AND b.status = 'completed';

  IF completed_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_completed_booking');
  END IF;

  SELECT * INTO ref_row
  FROM public.referrals
  WHERE referred_id = p_referred_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral');
  END IF;

  xp_amount := CASE WHEN ref_row.referral_type = 'barber' THEN 50 ELSE 10 END;

  UPDATE public.referrals
  SET status = 'completed', completed_at = now(), xp_awarded = xp_amount
  WHERE id = ref_row.id;

  BEGIN
    INSERT INTO public.xp_ledger (user_id, event_type, amount, dedupe_key, metadata)
    VALUES (
      ref_row.referrer_id,
      CASE WHEN ref_row.referral_type = 'barber' THEN 'invite_barber' ELSE 'invite_customer' END,
      xp_amount,
      'referral_complete:' || ref_row.id::text,
      jsonb_build_object('referral_id', ref_row.id, 'referred_id', p_referred_id)
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO public.user_progress (user_id, total_xp, level, updated_at)
  SELECT
    ref_row.referrer_id,
    COALESCE(SUM(l.amount), 0),
    public.progression_level_from_xp(COALESCE(SUM(l.amount), 0)::integer),
    now()
  FROM public.xp_ledger l
  WHERE l.user_id = ref_row.referrer_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    level = EXCLUDED.level,
    updated_at = now();

  INSERT INTO public.growth_analytics_events (user_id, event_type, metadata)
  VALUES (
    ref_row.referrer_id,
    'referral_completed',
    jsonb_build_object('referral_id', ref_row.id, 'xp', xp_amount, 'referred_id', p_referred_id)
  );

  RETURN jsonb_build_object('ok', true, 'referral_id', ref_row.id, 'xp_awarded', xp_amount);
END;
$$;

-- ---------------------------------------------------------------------------
-- Booking trigger: complete referral on first booking
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.growth_on_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' OR OLD.status IS NOT DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.complete_pending_referral(NEW.client_id);
  PERFORM public.evaluate_ambassador_status(NEW.professional_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS growth_on_booking_completed_trigger ON public.bookings;
CREATE TRIGGER growth_on_booking_completed_trigger
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.growth_on_booking_completed();

-- ---------------------------------------------------------------------------
-- Coins award (isolated from XP)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_growth_coins(
  p_user_id uuid,
  p_amount integer,
  p_event_type text,
  p_dedupe_key text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'zero_amount');
  END IF;

  BEGIN
    INSERT INTO public.coins_ledger (user_id, amount, event_type, dedupe_key, metadata)
    VALUES (p_user_id, p_amount, p_event_type, p_dedupe_key, p_metadata);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate');
  END;

  INSERT INTO public.user_coins (user_id, balance, updated_at)
  VALUES (p_user_id, GREATEST(p_amount, 0), now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = GREATEST(0, public.user_coins.balance + p_amount),
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_growth_coins(uuid, integer, text, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Ambassador auto-unlock
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evaluate_ambassador_status(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(p_user_id, auth.uid());
  prof public.professionals%ROWTYPE;
  prog public.user_progress%ROWTYPE;
  completed_jobs integer;
  is_verified boolean;
  rating_ok boolean;
  level_ok boolean;
  bookings_ok boolean;
BEGIN
  IF target IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_user');
  END IF;

  SELECT * INTO prog FROM public.user_progress WHERE user_id = target;
  SELECT * INTO prof FROM public.professionals WHERE id = target;

  SELECT COUNT(*) INTO completed_jobs
  FROM public.bookings b
  WHERE b.professional_id = target AND b.status = 'completed';

  SELECT (p.verification_status IN ('verified', 'premium')) INTO is_verified
  FROM public.profiles p WHERE p.id = target;

  rating_ok := COALESCE(prof.average_rating, 0) >= 4.5;
  level_ok := COALESCE(prog.level, 1) >= 5;
  bookings_ok := completed_jobs >= 20;
  is_verified := COALESCE(is_verified, false);

  IF rating_ok AND level_ok AND bookings_ok AND is_verified THEN
    INSERT INTO public.ambassador_profiles (user_id, rating_snapshot, level_snapshot, bookings_snapshot, is_verified)
    VALUES (target, COALESCE(prof.average_rating, 0), COALESCE(prog.level, 1), completed_jobs, is_verified)
    ON CONFLICT (user_id) DO UPDATE SET
      rating_snapshot = EXCLUDED.rating_snapshot,
      level_snapshot = EXCLUDED.level_snapshot,
      bookings_snapshot = EXCLUDED.bookings_snapshot,
      is_verified = EXCLUDED.is_verified;

    INSERT INTO public.user_badges (user_id, badge_id, earned_at)
    VALUES (target, 'ambassador', now())
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'unlocked', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'unlocked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_ambassador_status(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Record analytics event
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_growth_analytics(
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.growth_analytics_events (user_id, event_type, metadata)
  VALUES (auth.uid(), p_event_type, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_growth_analytics(text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Referral stats for invite center
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  code_row public.referral_codes%ROWTYPE;
  invited integer;
  successful integer;
  pending integer;
  xp_total integer;
  shares integer;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM public.ensure_referral_code();
  SELECT * INTO code_row FROM public.referral_codes WHERE user_id = caller;

  SELECT COUNT(*) INTO invited FROM public.referrals WHERE referrer_id = caller;
  SELECT COUNT(*) INTO successful FROM public.referrals WHERE referrer_id = caller AND status = 'completed';
  SELECT COUNT(*) INTO pending FROM public.referrals WHERE referrer_id = caller AND status = 'pending';
  SELECT COALESCE(SUM(xp_awarded), 0) INTO xp_total FROM public.referrals WHERE referrer_id = caller AND status = 'completed';

  SELECT COUNT(*) INTO shares
  FROM public.growth_analytics_events
  WHERE user_id = caller AND event_type = 'invite_sent';

  RETURN jsonb_build_object(
    'code', code_row.code,
    'referral_type', code_row.referral_type,
    'referral_link', 'https://hallaqi.app/ref/' || code_row.code,
    'invited_users', invited,
    'successful_referrals', successful,
    'pending_referrals', pending,
    'total_xp_earned', xp_total,
    'invites_sent', shares
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin growth actions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_grant_xp(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'admin')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.xp_ledger (user_id, event_type, amount, dedupe_key, metadata)
  VALUES (p_user_id, 'mission_reward', p_amount, 'admin:' || gen_random_uuid()::text, jsonb_build_object('reason', p_reason));

  INSERT INTO public.user_progress (user_id, total_xp, level, updated_at)
  SELECT p_user_id, COALESCE(SUM(l.amount), 0), public.progression_level_from_xp(COALESCE(SUM(l.amount), 0)::integer), now()
  FROM public.xp_ledger l WHERE l.user_id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET total_xp = EXCLUDED.total_xp, level = EXCLUDED.level, updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_coins(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'admin')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  RETURN public.award_growth_coins(p_user_id, p_amount, 'admin_grant', 'admin:' || gen_random_uuid()::text, jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ban_referral(p_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  UPDATE public.referrals SET status = 'banned' WHERE id = p_referral_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_xp(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_referral(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coins_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral code" ON public.referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Referrals visible to participants" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users read own coins" ON public.user_coins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users read own coin ledger" ON public.coins_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Reward store items are public" ON public.reward_store_items FOR SELECT USING (is_active = true);

CREATE POLICY "Published mini sites are public" ON public.mini_sites FOR SELECT
  USING (is_published = true OR user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users manage own mini site" ON public.mini_sites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Ambassador profiles public" ON public.ambassador_profiles FOR SELECT USING (true);

CREATE POLICY "Users read own analytics" ON public.growth_analytics_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Abuse flags admin only" ON public.abuse_flags FOR SELECT TO authenticated
  USING (public.is_admin());
