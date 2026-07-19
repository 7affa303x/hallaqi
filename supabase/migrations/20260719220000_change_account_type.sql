-- Allow authenticated users to switch among public account types.
-- Company remains a marketplace subscription / seller badge — not a selectable account type.

CREATE OR REPLACE FUNCTION public.change_account_type(target_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_name text;
  caller_email text;
  next_role public.user_role;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF target_role NOT IN ('client', 'barber', 'doctor', 'store') THEN
    RAISE EXCEPTION 'Invalid account type' USING ERRCODE = '22023';
  END IF;

  next_role := target_role::public.user_role;

  SELECT p.full_name, au.email
  INTO caller_name, caller_email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE p.id = caller_id;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller_id AND user_role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Privileged accounts cannot self-convert' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET user_role = next_role, updated_at = now()
  WHERE id = caller_id
    AND user_role IN ('client', 'barber', 'doctor', 'store', 'company', 'specialist');

  IF next_role = 'barber' THEN
    INSERT INTO public.professionals (id, business_name, business_email)
    VALUES (caller_id, COALESCE(caller_name, caller_email, 'حلاق'), caller_email)
    ON CONFLICT (id) DO NOTHING;
  ELSIF next_role IN ('store', 'doctor') THEN
    INSERT INTO public.marketplace_sellers (
      id, seller_type, display_name, contact_email, approval_status,
      is_company_badge, listing_cap, subscription_plan,
      social_links, delivery_areas
    )
    VALUES (
      caller_id,
      next_role::text::public.marketplace_seller_type,
      COALESCE(caller_name, caller_email, 'بائع'),
      caller_email,
      'pending',
      false,
      12,
      'free',
      '{}'::jsonb,
      '{}'::text[]
    )
    ON CONFLICT (id) DO UPDATE
      SET seller_type = EXCLUDED.seller_type,
          display_name = COALESCE(marketplace_sellers.display_name, EXCLUDED.display_name),
          updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.change_account_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_account_type(text) TO authenticated;

-- Company is a subscription — map accidental company signup metadata to store.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.user_role;
  meta_type text := lower(COALESCE(NEW.raw_user_meta_data->>'account_type', 'client'));
  display text;
BEGIN
  display := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NEW.email,
    'مستخدم حلاقي'
  );

  -- company is subscription-only; treat as store account
  IF meta_type = 'company' THEN
    meta_type := 'store';
  END IF;

  requested_role := CASE meta_type
    WHEN 'barber' THEN 'barber'::public.user_role
    WHEN 'store' THEN 'store'::public.user_role
    WHEN 'doctor' THEN 'doctor'::public.user_role
    ELSE 'client'::public.user_role
  END;

  BEGIN
    INSERT INTO public.profiles (
      id, full_name, avatar_url, user_role, user_status, verification_status
    )
    VALUES (
      NEW.id,
      display,
      NEW.raw_user_meta_data->>'avatar_url',
      requested_role,
      'active',
      'unverified'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profiles insert failed for %: %', NEW.id, SQLERRM;
    BEGIN
      INSERT INTO public.profiles (id, full_name, user_role, user_status, verification_status)
      VALUES (NEW.id, display, 'client', 'active', 'unverified')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user minimal profile failed for %: %', NEW.id, SQLERRM;
    END;
  END;

  BEGIN
    IF requested_role = 'barber' THEN
      INSERT INTO public.professionals (id, business_name, business_email)
      VALUES (NEW.id, display, NEW.email)
      ON CONFLICT (id) DO NOTHING;
    ELSIF requested_role IN ('store', 'doctor') THEN
      INSERT INTO public.marketplace_sellers (
        id, seller_type, display_name, contact_email, approval_status,
        is_company_badge, listing_cap, subscription_plan,
        social_links, delivery_areas
      )
      VALUES (
        NEW.id,
        requested_role::text::public.marketplace_seller_type,
        display,
        NEW.email,
        'pending',
        false,
        12,
        'free',
        '{}'::jsonb,
        '{}'::text[]
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role side-table failed for % (%): %', NEW.id, requested_role, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
