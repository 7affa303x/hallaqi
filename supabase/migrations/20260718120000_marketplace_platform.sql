-- Hallaqi Marketplace & Multi-Role Platform Expansion
-- Adds Store / Company / Doctor roles, marketplace catalog, monetization placements,
-- analytics events, and AI listing assist support. No commissions / no in-app checkout.

-- ========== ROLE EXPANSION ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'store'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'store';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'company'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'company';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'doctor'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'doctor';
  END IF;
END $$;

-- ========== MARKETPLACE ENUMS ==========
DO $$ BEGIN
  CREATE TYPE public.marketplace_seller_type AS ENUM ('store', 'company', 'doctor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_plan_tier AS ENUM ('free', 'basic', 'professional', 'business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_product_kind AS ENUM ('physical', 'service_extra', 'course', 'device', 'accessory');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_placement_type AS ENUM (
    'featured_product',
    'featured_store',
    'product_of_the_day',
    'banner',
    'sponsored',
    'premium_badge'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_analytics_event AS ENUM (
    'view',
    'click',
    'save',
    'profile_visit',
    'search_impression',
    'featured_impression',
    'featured_click',
    'visit_store',
    'product_of_day_view',
    'product_of_day_click'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== SELLER PROFILES (Store / Company / Doctor) ==========
CREATE TABLE IF NOT EXISTS public.marketplace_sellers (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_type public.marketplace_seller_type NOT NULL,
  display_name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  cover_url text,
  short_description text,
  about text,
  website_url text,
  contact_email text,
  contact_phone text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  wilaya text,
  delivery_areas text[] NOT NULL DEFAULT '{}',
  brand_name text,
  approval_status public.marketplace_approval_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  is_verified boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  is_company_badge boolean NOT NULL DEFAULT false,
  is_trusted_doctor boolean NOT NULL DEFAULT false,
  subscription_plan public.marketplace_plan_tier NOT NULL DEFAULT 'free',
  subscription_expires_at timestamptz,
  listing_cap integer NOT NULL DEFAULT 12 CHECK (listing_cap > 0 AND listing_cap <= 99),
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  follower_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_sellers_type ON public.marketplace_sellers(seller_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_sellers_status ON public.marketplace_sellers(approval_status);
CREATE INDEX IF NOT EXISTS idx_marketplace_sellers_wilaya ON public.marketplace_sellers(wilaya);

-- ========== CATEGORIES (expandable) ==========
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id text PRIMARY KEY,
  parent_id text REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text,
  name_fr text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_categories (id, parent_id, name_ar, name_en, icon, sort_order) VALUES
  ('hair', NULL, 'شعر', 'Hair', 'Scissors', 1),
  ('beard', NULL, 'لحية', 'Beard', 'User', 2),
  ('skin', NULL, 'بشرة', 'Skin', 'Sparkles', 3),
  ('shaving', NULL, 'حلاقة', 'Shaving', 'Aperture', 4),
  ('devices', NULL, 'أجهزة', 'Devices', 'Cpu', 5),
  ('courses', NULL, 'دورات', 'Courses', 'GraduationCap', 6),
  ('accessories', NULL, 'إكسسوارات', 'Accessories', 'Watch', 7),
  ('professional_tools', NULL, 'أدوات احترافية', 'Professional tools', 'Wrench', 8),
  ('hair_oils', 'hair', 'زيوت الشعر', 'Hair oils', NULL, 11),
  ('hair_styling', 'hair', 'تصفيف', 'Styling', NULL, 12),
  ('beard_oils', 'beard', 'زيوت اللحية', 'Beard oils', NULL, 21),
  ('skin_care', 'skin', 'عناية البشرة', 'Skin care', NULL, 31),
  ('shavers', 'devices', 'ماكينات', 'Shavers', NULL, 51),
  ('clippers', 'professional_tools', 'مقصات وماكينات', 'Clippers', NULL, 81)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id;

-- ========== PRODUCTS ==========
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.marketplace_sellers(id) ON DELETE CASCADE,
  category_id text REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  kind public.marketplace_product_kind NOT NULL DEFAULT 'physical',
  title text NOT NULL,
  slug text,
  description text,
  seo_description text,
  keywords text[] NOT NULL DEFAULT '{}',
  brand text,
  price_dzd numeric(12,2) NOT NULL CHECK (price_dzd >= 0),
  compare_at_price_dzd numeric(12,2),
  currency text NOT NULL DEFAULT 'DZD',
  image_urls text[] NOT NULL DEFAULT '{}',
  image_captions text[] NOT NULL DEFAULT '{}',
  wilaya text,
  delivery_areas text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  is_premium_visibility boolean NOT NULL DEFAULT false,
  is_product_of_the_day boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  popularity_score integer NOT NULL DEFAULT 0,
  external_url text,
  offer_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_seller ON public.marketplace_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON public.marketplace_products(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_featured ON public.marketplace_products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_products_potd ON public.marketplace_products(is_product_of_the_day) WHERE is_product_of_the_day = true;

-- Enforce listing cap (Premium max 99)
CREATE OR REPLACE FUNCTION public.enforce_marketplace_listing_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cap integer;
  current_count integer;
BEGIN
  SELECT listing_cap INTO cap FROM public.marketplace_sellers WHERE id = NEW.seller_id;
  IF cap IS NULL THEN
    RAISE EXCEPTION 'Seller not found' USING ERRCODE = '23503';
  END IF;
  SELECT count(*)::integer INTO current_count
  FROM public.marketplace_products
  WHERE seller_id = NEW.seller_id AND is_active = true
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);
  IF current_count >= LEAST(cap, 99) THEN
    RAISE EXCEPTION 'Listing cap reached (%). Upgrade plan for more visibility slots (max 99).', LEAST(cap, 99)
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_marketplace_listing_cap ON public.marketplace_products;
CREATE TRIGGER trg_enforce_marketplace_listing_cap
  BEFORE INSERT ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_listing_cap();

-- ========== REVIEWS ==========
CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.marketplace_sellers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_seller ON public.marketplace_reviews(seller_id);

-- ========== SUBSCRIPTION PLANS (stores/companies) ==========
CREATE TABLE IF NOT EXISTS public.marketplace_subscription_plans (
  id public.marketplace_plan_tier PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  price_dzd numeric(10,2) NOT NULL CHECK (price_dzd >= 0),
  listing_cap integer NOT NULL DEFAULT 12 CHECK (listing_cap > 0 AND listing_cap <= 99),
  featured_slots integer NOT NULL DEFAULT 0,
  banner_slots integer NOT NULL DEFAULT 0,
  analytics_level text NOT NULL DEFAULT 'basic',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_subscription_plans (id, name_ar, name_en, price_dzd, listing_cap, featured_slots, banner_slots, analytics_level, features)
VALUES
  ('free', 'مجاني', 'Free', 0, 12, 0, 0, 'basic', '["ابدأ مجاناً","Pay as you grow","عرض أساسي"]'::jsonb),
  ('basic', 'أساسي', 'Basic', 1500, 30, 1, 0, 'standard', '["رؤية أفضل","منتج مميز واحد","تحليلات أساسية"]'::jsonb),
  ('professional', 'احترافي', 'Professional', 3500, 60, 3, 1, 'advanced', '["ظهور مميز","3 منتجات مميزة","بانر","تحليلات متقدمة"]'::jsonb),
  ('business', 'أعمال', 'Business', 7000, 99, 8, 3, 'full', '["حد أقصى 99 منتج","أولوية الظهور","منتج اليوم","شارات بريميوم"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  price_dzd = EXCLUDED.price_dzd,
  listing_cap = EXCLUDED.listing_cap,
  featured_slots = EXCLUDED.featured_slots,
  banner_slots = EXCLUDED.banner_slots,
  analytics_level = EXCLUDED.analytics_level,
  features = EXCLUDED.features,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.marketplace_subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.marketplace_sellers(id) ON DELETE CASCADE,
  plan_id public.marketplace_plan_tier NOT NULL REFERENCES public.marketplace_subscription_plans(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'cancelled', 'expired')),
  payment_reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== PAID PLACEMENTS (no commissions) ==========
CREATE TABLE IF NOT EXISTS public.marketplace_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type public.marketplace_placement_type NOT NULL,
  seller_id uuid REFERENCES public.marketplace_sellers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  title text,
  banner_image_url text,
  bid_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_placements_active
  ON public.marketplace_placements(placement_type, is_active, starts_at);

-- Only one active Product of the Day at a time (advertising slot, not random discount)
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_one_product_of_day
  ON public.marketplace_placements ((placement_type))
  WHERE placement_type = 'product_of_the_day' AND is_active = true;

-- ========== ANALYTICS ==========
CREATE TABLE IF NOT EXISTS public.marketplace_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.marketplace_analytics_event NOT NULL,
  seller_id uuid REFERENCES public.marketplace_sellers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  wilaya text,
  category_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_seller_time
  ON public.marketplace_analytics_events(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_type_time
  ON public.marketplace_analytics_events(event_type, created_at DESC);

-- ========== UPDATED_AT TRIGGERS ==========
DROP TRIGGER IF EXISTS update_marketplace_sellers_updated_at ON public.marketplace_sellers;
CREATE TRIGGER update_marketplace_sellers_updated_at
  BEFORE UPDATE ON public.marketplace_sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_products_updated_at ON public.marketplace_products;
CREATE TRIGGER update_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_subscription_plans_updated_at ON public.marketplace_subscription_plans;
CREATE TRIGGER update_marketplace_subscription_plans_updated_at
  BEFORE UPDATE ON public.marketplace_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_subscription_requests_updated_at ON public.marketplace_subscription_requests;
CREATE TRIGGER update_marketplace_subscription_requests_updated_at
  BEFORE UPDATE ON public.marketplace_subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_placements_updated_at ON public.marketplace_placements;
CREATE TRIGGER update_marketplace_placements_updated_at
  BEFORE UPDATE ON public.marketplace_placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== SIGNUP: allow store / company / doctor ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.user_role;
  meta_type text := COALESCE(NEW.raw_user_meta_data->>'account_type', 'client');
BEGIN
  requested_role := CASE meta_type
    WHEN 'barber' THEN 'barber'::public.user_role
    WHEN 'store' THEN 'store'::public.user_role
    WHEN 'company' THEN 'company'::public.user_role
    WHEN 'doctor' THEN 'doctor'::public.user_role
    ELSE 'client'::public.user_role
  END;

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
    CASE WHEN requested_role = 'doctor' THEN 'unverified' ELSE 'unverified' END
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
  ELSIF requested_role IN ('store', 'company', 'doctor') THEN
    INSERT INTO public.marketplace_sellers (
      id, seller_type, display_name, contact_email, approval_status,
      is_company_badge, listing_cap, subscription_plan
    )
    VALUES (
      NEW.id,
      requested_role::text::public.marketplace_seller_type,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      'pending',
      requested_role = 'company',
      12,
      'free'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- ========== ADMIN APPROVAL HELPERS ==========
CREATE OR REPLACE FUNCTION public.admin_review_marketplace_seller(
  target_seller uuid,
  approve boolean,
  notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.marketplace_sellers
  SET
    approval_status = CASE WHEN approve THEN 'approved'::public.marketplace_approval_status ELSE 'rejected'::public.marketplace_approval_status END,
    is_verified = CASE WHEN approve THEN true ELSE false END,
    is_trusted_doctor = CASE WHEN approve AND seller_type = 'doctor' THEN true ELSE is_trusted_doctor END,
    approved_at = CASE WHEN approve THEN now() ELSE NULL END,
    approved_by = auth.uid(),
    updated_at = now()
  WHERE id = target_seller;

  IF notes IS NOT NULL THEN
    UPDATE public.marketplace_subscription_requests
    SET notes = COALESCE(notes, notes)
    WHERE seller_id = target_seller AND status = 'pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_product_of_the_day(target_product uuid, bid numeric DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller uuid;
  placement_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT seller_id INTO seller FROM public.marketplace_products WHERE id = target_product;
  IF seller IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  UPDATE public.marketplace_placements
  SET is_active = false, updated_at = now()
  WHERE placement_type = 'product_of_the_day' AND is_active = true;

  UPDATE public.marketplace_products
  SET is_product_of_the_day = false, updated_at = now()
  WHERE is_product_of_the_day = true;

  UPDATE public.marketplace_products
  SET is_product_of_the_day = true, is_featured = true, updated_at = now()
  WHERE id = target_product;

  INSERT INTO public.marketplace_placements (
    placement_type, seller_id, product_id, bid_amount_dzd, is_active, created_by, title
  )
  VALUES (
    'product_of_the_day', seller, target_product, COALESCE(bid, 0), true, auth.uid(), 'منتج اليوم'
  )
  RETURNING id INTO placement_id;

  RETURN placement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_activate_marketplace_subscription(request_id uuid, approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  plan record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO req FROM public.marketplace_subscription_requests WHERE id = request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF NOT approve THEN
    UPDATE public.marketplace_subscription_requests
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = request_id;
    RETURN;
  END IF;

  SELECT * INTO plan FROM public.marketplace_subscription_plans WHERE id = req.plan_id;

  UPDATE public.marketplace_subscription_requests
  SET status = 'active', starts_at = now(), ends_at = now() + interval '30 days',
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = request_id;

  UPDATE public.marketplace_sellers
  SET
    subscription_plan = req.plan_id,
    listing_cap = LEAST(plan.listing_cap, 99),
    is_premium = req.plan_id IN ('professional', 'business'),
    subscription_expires_at = now() + interval '30 days',
    updated_at = now()
  WHERE id = req.seller_id;
END;
$$;

-- ========== RLS ==========
ALTER TABLE public.marketplace_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Marketplace categories are public" ON public.marketplace_categories;
CREATE POLICY "Marketplace categories are public"
  ON public.marketplace_categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Approved sellers are public" ON public.marketplace_sellers;
CREATE POLICY "Approved sellers are public"
  ON public.marketplace_sellers FOR SELECT
  USING (approval_status = 'approved' AND is_active = true OR id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Sellers manage own profile" ON public.marketplace_sellers;
CREATE POLICY "Sellers manage own profile"
  ON public.marketplace_sellers FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Sellers insert own profile" ON public.marketplace_sellers;
CREATE POLICY "Sellers insert own profile"
  ON public.marketplace_sellers FOR INSERT
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Active products are public" ON public.marketplace_products;
CREATE POLICY "Active products are public"
  ON public.marketplace_products FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.marketplace_sellers s
      WHERE s.id = seller_id AND (s.approval_status = 'approved' OR s.id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Sellers manage own products" ON public.marketplace_products;
CREATE POLICY "Sellers manage own products"
  ON public.marketplace_products FOR ALL
  USING (seller_id = auth.uid() OR public.is_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Reviews are public" ON public.marketplace_reviews;
CREATE POLICY "Reviews are public"
  ON public.marketplace_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users create reviews" ON public.marketplace_reviews;
CREATE POLICY "Authenticated users create reviews"
  ON public.marketplace_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Marketplace plans are public" ON public.marketplace_subscription_plans;
CREATE POLICY "Marketplace plans are public"
  ON public.marketplace_subscription_plans FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Sellers manage own subscription requests" ON public.marketplace_subscription_requests;
CREATE POLICY "Sellers manage own subscription requests"
  ON public.marketplace_subscription_requests FOR ALL
  USING (seller_id = auth.uid() OR public.is_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Active placements are public" ON public.marketplace_placements;
CREATE POLICY "Active placements are public"
  ON public.marketplace_placements FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage placements" ON public.marketplace_placements;
CREATE POLICY "Admins manage placements"
  ON public.marketplace_placements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Sellers read own analytics" ON public.marketplace_analytics_events;
CREATE POLICY "Sellers read own analytics"
  ON public.marketplace_analytics_events FOR SELECT
  USING (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.marketplace_analytics_events;
CREATE POLICY "Anyone can insert analytics"
  ON public.marketplace_analytics_events FOR INSERT
  WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.admin_review_marketplace_seller(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_product_of_the_day(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_marketplace_subscription(uuid, boolean) TO authenticated;
