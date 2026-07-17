-- Hallaqi monetization & multi-role marketplace foundation.
-- Roles: store, company, doctor (dermatologist specialty via doctor_profiles).
-- Separate subscription catalogs per business type. Premium item cap = 99.
-- Discovery marketplace only — no commissions / in-app store checkout.

-- ─── 1) Role separation ─────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'store';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'company';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'doctor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public signup may request client | barber | store | company | doctor.
-- Elevated roles remain admin-controlled.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_type text := COALESCE(NEW.raw_user_meta_data->>'account_type', 'client');
  requested_role public.user_role := CASE account_type
    WHEN 'barber' THEN 'barber'::public.user_role
    WHEN 'store' THEN 'store'::public.user_role
    WHEN 'company' THEN 'company'::public.user_role
    WHEN 'doctor' THEN 'doctor'::public.user_role
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
    CASE
      WHEN requested_role IN ('store', 'company', 'doctor') THEN 'pending'::public.user_status
      ELSE 'active'::public.user_status
    END,
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

-- ─── 2) Business entity tables ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  cover_url text,
  short_description text,
  about text,
  website_url text,
  contact_phone text,
  contact_email text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  wilaya_code integer,
  city text,
  delivery_areas text[] NOT NULL DEFAULT '{}',
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  rejection_reason text,
  is_premium boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  premium_item_cap integer NOT NULL DEFAULT 99,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  cover_url text,
  short_description text,
  about text,
  website_url text,
  official_branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  wilaya_code integer,
  city text,
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  rejection_reason text,
  has_company_badge boolean NOT NULL DEFAULT true,
  is_premium boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  premium_item_cap integer NOT NULL DEFAULT 99,
  trust_tag text NOT NULL DEFAULT 'official',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Doctor is a dedicated role. specialty allows future medical specialties
-- without changing the Doctor account model (dermatologist at launch).
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  specialty text NOT NULL DEFAULT 'dermatologist',
  license_number text,
  bio text,
  consultation_content text,
  logo_url text,
  cover_url text,
  website_url text,
  wilaya_code integer,
  city text,
  free_verification boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  trusted_badge boolean NOT NULL DEFAULT false,
  can_recommend boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_approval ON public.stores(approval_status);
CREATE INDEX IF NOT EXISTS idx_companies_approval ON public.companies(approval_status);
CREATE INDEX IF NOT EXISTS idx_doctors_verification ON public.doctor_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctor_profiles(specialty);

-- ─── 3) Marketplace catalog ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text,
  parent_id text REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  icon text
);

INSERT INTO public.marketplace_categories (id, name_ar, name_en, sort_order, icon) VALUES
  ('hair', 'شعر', 'Hair', 10, 'scissors'),
  ('beard', 'لحية', 'Beard', 20, 'beard'),
  ('skin', 'بشرة', 'Skin', 30, 'sparkles'),
  ('shaving', 'حلاقة', 'Shaving', 40, 'razor'),
  ('devices', 'أجهزة', 'Devices', 50, 'cpu'),
  ('courses', 'دورات', 'Courses', 60, 'graduation-cap'),
  ('accessories', 'إكسسوارات', 'Accessories', 70, 'watch'),
  ('professional_tools', 'أدوات احترافية', 'Professional tools', 80, 'wrench')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('store', 'company')),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id text REFERENCES public.marketplace_categories(id),
  title text NOT NULL,
  description text,
  seo_text text,
  keywords text[] NOT NULL DEFAULT '{}',
  brand text,
  price_dzd numeric(12,2),
  compare_at_price_dzd numeric(12,2),
  currency text NOT NULL DEFAULT 'DZD',
  image_urls text[] NOT NULL DEFAULT '{}',
  external_url text,
  wilaya_code integer,
  delivery_areas text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_premium_placement boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  popularity_score integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_products_owner_chk CHECK (
    (owner_type = 'store' AND store_id IS NOT NULL AND company_id IS NULL) OR
    (owner_type = 'company' AND company_id IS NOT NULL AND store_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_mp_products_category ON public.marketplace_products(category_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_store ON public.marketplace_products(store_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_company ON public.marketplace_products(company_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_featured ON public.marketplace_products(is_featured) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_mp_products_active ON public.marketplace_products(is_active, popularity_score DESC);

-- Barber service extras (not physical store products)
CREATE TABLE IF NOT EXISTS public.barber_service_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'extra'
    CHECK (category IN ('extra', 'premium_treatment', 'vip', 'beard_care', 'skin_care', 'hair_treatment')),
  price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  duration_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barber_extras_pro ON public.barber_service_extras(professional_id);

-- Product of the Day = paid advertising placement (not random discount)
CREATE TABLE IF NOT EXISTS public.product_of_the_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  placement_date date NOT NULL DEFAULT CURRENT_DATE,
  bid_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  display_discount_percent integer,
  headline_ar text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (placement_date)
);

CREATE TABLE IF NOT EXISTS public.marketplace_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type text NOT NULL
    CHECK (placement_type IN ('featured_store', 'featured_product', 'banner', 'sponsored', 'product_of_day')),
  target_type text NOT NULL CHECK (target_type IN ('store', 'company', 'product')),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  bid_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 4) Subscriptions per business type (independent catalogs) ──────────────
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'barber'
    CHECK (business_type IN ('barber', 'store', 'company')),
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'basic', 'professional', 'business')),
  ADD COLUMN IF NOT EXISTS max_items integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS tagline_ar text DEFAULT 'ابدأ مجاناً وادفع كلما كبرت';

-- Keep legacy barber seeds mapped; add store/company catalogs.
UPDATE public.subscription_plans
SET business_type = 'barber',
    tier = CASE id
      WHEN 'free' THEN 'free'
      WHEN 'basic' THEN 'basic'
      WHEN 'pro' THEN 'professional'
      WHEN 'premium' THEN 'business'
      ELSE tier
    END,
    max_items = CASE id
      WHEN 'free' THEN 5
      WHEN 'basic' THEN 25
      WHEN 'pro' THEN 50
      WHEN 'premium' THEN 99
      ELSE LEAST(COALESCE(max_items, 10), 99)
    END,
    tagline_ar = COALESCE(tagline_ar, 'ابدأ مجاناً وادفع كلما كبرت')
WHERE business_type = 'barber' OR business_type IS NULL;

INSERT INTO public.subscription_plans (id, name_ar, price_dzd, billing_period, features, is_active, business_type, tier, max_items, tagline_ar)
VALUES
  ('store_free', 'متجر — مجاني', 0, 'monthly', '["عرض محدود","صفحة متجر أساسية"]'::jsonb, true, 'store', 'free', 5, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('store_basic', 'متجر — أساسي', 2500, 'monthly', '["رؤية أفضل","فلاتر","تحليلات أساسية"]'::jsonb, true, 'store', 'basic', 25, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('store_professional', 'متجر — احترافي', 5500, 'monthly', '["مميزة","بانرات","تحليلات متقدمة"]'::jsonb, true, 'store', 'professional', 50, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('store_business', 'متجر — أعمال', 9900, 'monthly', '["حتى 99 منتج","منتج اليوم","ترتيب أعلى"]'::jsonb, true, 'store', 'business', 99, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('company_free', 'شركة — مجاني', 0, 'monthly', '["شارة شركة","حضور أساسي"]'::jsonb, true, 'company', 'free', 5, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('company_basic', 'شركة — أساسي', 4500, 'monthly', '["ثقة أعلى","محتوى علامة"]'::jsonb, true, 'company', 'basic', 25, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('company_professional', 'شركة — احترافي', 9500, 'monthly', '["مميزة","بانرات","تحليلات"]'::jsonb, true, 'company', 'professional', 50, 'ابدأ مجاناً وادفع كلما كبرت'),
  ('company_business', 'شركة — أعمال', 14900, 'monthly', '["حتى 99 عنصر","رعاية مدفوعة"]'::jsonb, true, 'company', 'business', 99, 'ابدأ مجاناً وادفع كلما كبرت')
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  price_dzd = EXCLUDED.price_dzd,
  features = EXCLUDED.features,
  business_type = EXCLUDED.business_type,
  tier = EXCLUDED.tier,
  max_items = LEAST(EXCLUDED.max_items, 99),
  tagline_ar = EXCLUDED.tagline_ar,
  is_active = true;

-- Enforce premium never unlimited
UPDATE public.subscription_plans SET max_items = LEAST(max_items, 99);

ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS business_type text
    CHECK (business_type IS NULL OR business_type IN ('barber', 'store', 'company'));

-- ─── 5) Account approval queue (store / company / doctor) ───────────────────
CREATE TABLE IF NOT EXISTS public.business_account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('store', 'company', 'doctor')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_type, status)
);

-- Soft uniqueness for pending only via partial index
DROP INDEX IF EXISTS uniq_pending_business_account_request;
CREATE UNIQUE INDEX uniq_pending_business_account_request
  ON public.business_account_requests (user_id, account_type)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.review_business_account_request(
  p_request_id uuid,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.business_account_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO req FROM public.business_account_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already reviewed';
  END IF;

  UPDATE public.business_account_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_notes
  WHERE id = p_request_id;

  IF p_approve THEN
    UPDATE public.profiles
    SET user_status = 'active',
        verification_status = CASE
          WHEN req.account_type = 'doctor' THEN 'verified'
          ELSE verification_status
        END,
        updated_at = now()
    WHERE id = req.user_id;

    IF req.account_type = 'store' THEN
      INSERT INTO public.stores (id, store_name, short_description, website_url, approval_status, approved_at, approved_by)
      VALUES (
        req.user_id,
        COALESCE(req.payload->>'store_name', 'متجر جديد'),
        req.payload->>'short_description',
        req.payload->>'website_url',
        'approved', now(), auth.uid()
      )
      ON CONFLICT (id) DO UPDATE SET
        approval_status = 'approved',
        approved_at = now(),
        approved_by = auth.uid(),
        rejection_reason = NULL;
    ELSIF req.account_type = 'company' THEN
      INSERT INTO public.companies (id, company_name, short_description, website_url, approval_status, approved_at, approved_by)
      VALUES (
        req.user_id,
        COALESCE(req.payload->>'company_name', 'شركة جديدة'),
        req.payload->>'short_description',
        req.payload->>'website_url',
        'approved', now(), auth.uid()
      )
      ON CONFLICT (id) DO UPDATE SET
        approval_status = 'approved',
        approved_at = now(),
        approved_by = auth.uid(),
        rejection_reason = NULL;
    ELSIF req.account_type = 'doctor' THEN
      INSERT INTO public.doctor_profiles (
        id, display_name, specialty, bio, free_verification, verification_status, verified_at, verified_by, trusted_badge
      )
      VALUES (
        req.user_id,
        COALESCE(req.payload->>'display_name', 'طبيب'),
        COALESCE(req.payload->>'specialty', 'dermatologist'),
        req.payload->>'bio',
        true,
        'verified', now(), auth.uid(), true
      )
      ON CONFLICT (id) DO UPDATE SET
        verification_status = 'verified',
        verified_at = now(),
        verified_by = auth.uid(),
        trusted_badge = true,
        free_verification = true;
    END IF;
  ELSE
    UPDATE public.profiles
    SET user_status = 'inactive', updated_at = now()
    WHERE id = req.user_id;

    IF req.account_type = 'store' THEN
      UPDATE public.stores SET approval_status = 'rejected', rejection_reason = p_notes WHERE id = req.user_id;
    ELSIF req.account_type = 'company' THEN
      UPDATE public.companies SET approval_status = 'rejected', rejection_reason = p_notes WHERE id = req.user_id;
    ELSIF req.account_type = 'doctor' THEN
      UPDATE public.doctor_profiles SET verification_status = 'rejected' WHERE id = req.user_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_business_account_request(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_business_account_request(uuid, boolean, text) TO authenticated;

-- Premium product cap enforcement (never unlimited; hard max 99)
CREATE OR REPLACE FUNCTION public.enforce_marketplace_item_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  owner_uuid uuid;
  item_cap integer := 5;
  current_count integer := 0;
BEGIN
  owner_uuid := COALESCE(NEW.store_id, NEW.company_id);
  IF NEW.store_id IS NOT NULL THEN
    SELECT COALESCE(s.premium_item_cap, 99) INTO item_cap FROM public.stores s WHERE s.id = NEW.store_id;
  ELSIF NEW.company_id IS NOT NULL THEN
    SELECT COALESCE(c.premium_item_cap, 99) INTO item_cap FROM public.companies c WHERE c.id = NEW.company_id;
  END IF;
  item_cap := LEAST(COALESCE(item_cap, 99), 99);

  SELECT COUNT(*) INTO current_count
  FROM public.marketplace_products p
  WHERE (NEW.store_id IS NOT NULL AND p.store_id = NEW.store_id)
     OR (NEW.company_id IS NOT NULL AND p.company_id = NEW.company_id);

  IF TG_OP = 'INSERT' AND current_count >= item_cap THEN
    RAISE EXCEPTION 'Item cap reached (%). Premium is capped at 99 — not unlimited.', item_cap
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_marketplace_item_cap_trigger ON public.marketplace_products;
CREATE TRIGGER enforce_marketplace_item_cap_trigger
  BEFORE INSERT ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_item_cap();

-- ─── 6) Analytics events (store / company dashboards) ───────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN (
    'view', 'click', 'save', 'profile_visit', 'search_impression',
    'category_view', 'product_of_day_view', 'featured_slot_view',
    'visit_store_click', 'conversion_indicator'
  )),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
  category_id text,
  wilaya_code integer,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_analytics_store ON public.marketplace_analytics_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_analytics_company ON public.marketplace_analytics_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_analytics_type ON public.marketplace_analytics_events(event_type, created_at DESC);

-- ─── 7) RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_service_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stores_public_read ON public.stores;
CREATE POLICY stores_public_read ON public.stores FOR SELECT
  USING (approval_status = 'approved' OR id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS stores_owner_write ON public.stores;
CREATE POLICY stores_owner_write ON public.stores FOR ALL
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS companies_public_read ON public.companies;
CREATE POLICY companies_public_read ON public.companies FOR SELECT
  USING (approval_status = 'approved' OR id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS companies_owner_write ON public.companies;
CREATE POLICY companies_owner_write ON public.companies FOR ALL
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS doctors_public_read ON public.doctor_profiles;
CREATE POLICY doctors_public_read ON public.doctor_profiles FOR SELECT
  USING (verification_status = 'verified' OR id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS doctors_owner_write ON public.doctor_profiles;
CREATE POLICY doctors_owner_write ON public.doctor_profiles FOR ALL
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS mp_categories_read ON public.marketplace_categories;
CREATE POLICY mp_categories_read ON public.marketplace_categories FOR SELECT USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS mp_categories_admin ON public.marketplace_categories;
CREATE POLICY mp_categories_admin ON public.marketplace_categories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS mp_products_public_read ON public.marketplace_products;
CREATE POLICY mp_products_public_read ON public.marketplace_products FOR SELECT
  USING (
    is_active = true
    OR store_id = auth.uid()
    OR company_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS mp_products_owner_write ON public.marketplace_products;
CREATE POLICY mp_products_owner_write ON public.marketplace_products FOR ALL
  USING (store_id = auth.uid() OR company_id = auth.uid() OR public.is_admin())
  WITH CHECK (store_id = auth.uid() OR company_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS barber_extras_read ON public.barber_service_extras;
CREATE POLICY barber_extras_read ON public.barber_service_extras FOR SELECT
  USING (is_active OR professional_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS barber_extras_write ON public.barber_service_extras;
CREATE POLICY barber_extras_write ON public.barber_service_extras FOR ALL
  USING (professional_id = auth.uid() OR public.is_admin())
  WITH CHECK (professional_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS potd_read ON public.product_of_the_day;
CREATE POLICY potd_read ON public.product_of_the_day FOR SELECT USING (true);

DROP POLICY IF EXISTS potd_admin ON public.product_of_the_day;
CREATE POLICY potd_admin ON public.product_of_the_day FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS placements_read ON public.marketplace_placements;
CREATE POLICY placements_read ON public.marketplace_placements FOR SELECT
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS placements_admin ON public.marketplace_placements;
CREATE POLICY placements_admin ON public.marketplace_placements FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS biz_req_owner ON public.business_account_requests;
CREATE POLICY biz_req_owner ON public.business_account_requests FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS biz_req_insert ON public.business_account_requests;
CREATE POLICY biz_req_insert ON public.business_account_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS biz_req_admin ON public.business_account_requests;
CREATE POLICY biz_req_admin ON public.business_account_requests FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS analytics_insert ON public.marketplace_analytics_events;
CREATE POLICY analytics_insert ON public.marketplace_analytics_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS analytics_owner_read ON public.marketplace_analytics_events;
CREATE POLICY analytics_owner_read ON public.marketplace_analytics_events FOR SELECT
  USING (
    store_id = auth.uid()
    OR company_id = auth.uid()
    OR public.is_admin()
  );

GRANT SELECT ON public.marketplace_categories TO anon, authenticated;
GRANT SELECT ON public.product_of_the_day TO anon, authenticated;
GRANT SELECT ON public.marketplace_products TO anon, authenticated;
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT SELECT ON public.doctor_profiles TO anon, authenticated;
