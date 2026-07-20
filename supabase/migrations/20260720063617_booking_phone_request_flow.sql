-- Booking request flow:
-- 1) Client must have a phone number to book
-- 2) New bookings are soft "pending" requests (do not lock the calendar)
-- 3) Barber chooses the real start time when accepting after a phone call

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS preferred_time_of_day text
    CHECK (
      preferred_time_of_day IS NULL
      OR preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'any')
    ),
  ADD COLUMN IF NOT EXISTS time_set_by_barber boolean NOT NULL DEFAULT false;

-- Soft-hold: pending requests must NOT block confirmed appointments.
DROP INDEX IF EXISTS public.idx_bookings_no_double_booking;
CREATE UNIQUE INDEX idx_bookings_no_double_booking
  ON public.bookings (professional_id, booking_start_time)
  WHERE status IN ('confirmed', 'in_progress');

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlapping_active_slots;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlapping_active_slots
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(booking_start_time, booking_end_time, '[)') WITH &&
  )
  WHERE (status IN ('confirmed', 'in_progress'));

-- Persist phone from signup metadata so Google/email users can be gated later.
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
  phone text;
BEGIN
  display := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NEW.email,
    'مستخدم حلاقي'
  );

  phone := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'phone',
    ''
  )), '');

  requested_role := CASE meta_type
    WHEN 'barber' THEN 'barber'::public.user_role
    WHEN 'store' THEN 'store'::public.user_role
    WHEN 'company' THEN 'company'::public.user_role
    WHEN 'doctor' THEN 'doctor'::public.user_role
    ELSE 'client'::public.user_role
  END;

  BEGIN
    INSERT INTO public.profiles (
      id, full_name, avatar_url, phone_number, user_role, user_status, verification_status
    )
    VALUES (
      NEW.id,
      display,
      NEW.raw_user_meta_data->>'avatar_url',
      phone,
      requested_role,
      'active',
      'unverified'
    )
    ON CONFLICT (id) DO UPDATE
      SET phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
          full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profiles insert failed for %: %', NEW.id, SQLERRM;
    BEGIN
      INSERT INTO public.profiles (id, full_name, phone_number, user_role, user_status, verification_status)
      VALUES (NEW.id, display, phone, 'client', 'active', 'unverified')
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
    ELSIF requested_role IN ('store', 'company', 'doctor') THEN
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
        requested_role = 'company',
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

DROP FUNCTION IF EXISTS public.create_booking_with_services(
  uuid, uuid[], timestamptz, text, text, boolean, text, text
);

-- Create a soft booking request for a preferred date (barber sets the real time later).
CREATE OR REPLACE FUNCTION public.create_booking_with_services(
  professional uuid,
  selected_services uuid[],
  starts_at timestamptz,
  note text DEFAULT NULL,
  payment_method_name text DEFAULT 'cash',
  mobile_service boolean DEFAULT false,
  mobile_address text DEFAULT NULL,
  loyalty_voucher text DEFAULT NULL,
  preferred_period text DEFAULT 'any'
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  service_count integer;
  gross_amount numeric(10, 2);
  net_amount numeric(10, 2);
  discount_value numeric(10, 2) := 0;
  total_duration integer;
  primary_service uuid;
  redemption_id uuid;
  reward_discount integer;
  created_booking public.bookings;
  client_phone text;
  pref_date date;
  pref_period text;
  provisional_start timestamptz;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF selected_services IS NULL OR cardinality(selected_services) = 0 THEN
    RAISE EXCEPTION 'Select at least one service' USING ERRCODE = '22023';
  END IF;
  IF starts_at::date < (timezone('Africa/Algiers', now()))::date THEN
    RAISE EXCEPTION 'Preferred date must be today or later' USING ERRCODE = '22023';
  END IF;
  IF mobile_service AND COALESCE(trim(mobile_address), '') = '' THEN
    RAISE EXCEPTION 'Mobile service address is required' USING ERRCODE = '22023';
  END IF;

  SELECT NULLIF(trim(phone_number), '')
  INTO client_phone
  FROM public.profiles
  WHERE id = caller;

  IF client_phone IS NULL THEN
    RAISE EXCEPTION 'PHONE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  pref_date := (starts_at AT TIME ZONE 'Africa/Algiers')::date;
  pref_period := CASE lower(COALESCE(preferred_period, 'any'))
    WHEN 'morning' THEN 'morning'
    WHEN 'afternoon' THEN 'afternoon'
    WHEN 'evening' THEN 'evening'
    ELSE 'any'
  END;

  -- Provisional placeholder only — pending rows no longer lock the calendar.
  provisional_start := (pref_date::text || ' 12:00:00')::timestamp
    AT TIME ZONE 'Africa/Algiers';

  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(price), 0),
    COALESCE(SUM(duration_minutes), 0),
    (array_agg(id ORDER BY id))[1]
  INTO service_count, gross_amount, total_duration, primary_service
  FROM public.services
  WHERE id = ANY(selected_services)
    AND professional_id = professional
    AND is_active = true;

  IF service_count <> cardinality(selected_services) OR total_duration <= 0 THEN
    RAISE EXCEPTION 'One or more services are unavailable' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(trim(loyalty_voucher), '') <> '' THEN
    SELECT redemption.id, reward.discount_percent
    INTO redemption_id, reward_discount
    FROM public.loyalty_redemptions redemption
    JOIN public.loyalty_rewards reward ON reward.id = redemption.reward_id
    WHERE redemption.user_id = caller
      AND redemption.voucher_code = upper(trim(loyalty_voucher))
      AND redemption.status = 'available'
      AND redemption.expires_at > now()
      AND reward.is_active = true
    FOR UPDATE OF redemption;

    IF redemption_id IS NULL THEN
      RAISE EXCEPTION 'Voucher is invalid or unavailable' USING ERRCODE = '22023';
    END IF;
    discount_value := ROUND(gross_amount * reward_discount / 100.0, 2);
  END IF;

  net_amount := GREATEST(0, gross_amount - discount_value);

  INSERT INTO public.bookings (
    client_id,
    professional_id,
    service_id,
    booking_start_time,
    booking_end_time,
    status,
    total_price,
    payment_status,
    payment_method,
    is_mobile_service,
    service_address,
    notes,
    loyalty_redemption_id,
    discount_amount,
    preferred_date,
    preferred_time_of_day,
    time_set_by_barber
  )
  VALUES (
    caller,
    professional,
    primary_service,
    provisional_start,
    provisional_start + make_interval(mins => total_duration),
    'pending',
    net_amount,
    'pending',
    payment_method_name,
    mobile_service,
    CASE WHEN mobile_service THEN mobile_address ELSE NULL END,
    note,
    redemption_id,
    discount_value,
    pref_date,
    pref_period,
    false
  )
  RETURNING * INTO created_booking;

  INSERT INTO public.booking_services (
    booking_id, service_id, price_snapshot, duration_snapshot
  )
  SELECT created_booking.id, id, price, duration_minutes
  FROM public.services
  WHERE id = ANY(selected_services)
    AND professional_id = professional
    AND is_active = true;

  IF redemption_id IS NOT NULL THEN
    UPDATE public.loyalty_redemptions
    SET status = 'reserved',
        booking_id = created_booking.id,
        used_at = now()
    WHERE id = redemption_id;
  END IF;

  RETURN created_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_with_services(
  uuid, uuid[], timestamptz, text, text, boolean, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_with_services(
  uuid, uuid[], timestamptz, text, text, boolean, text, text, text
) TO authenticated;

-- Barber accepts a pending request and sets the real appointment time.
CREATE OR REPLACE FUNCTION public.accept_booking_with_time(
  booking uuid,
  starts_at timestamptz
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  row_booking public.bookings;
  duration_mins integer;
  ends_at timestamptz;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF starts_at <= now() THEN
    RAISE EXCEPTION 'Appointment time must be in the future' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO row_booking
  FROM public.bookings
  WHERE id = booking
  FOR UPDATE;

  IF row_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF row_booking.professional_id IS DISTINCT FROM caller THEN
    RAISE EXCEPTION 'Only the barber can accept this booking' USING ERRCODE = '42501';
  END IF;
  IF row_booking.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be accepted' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(duration_snapshot), 30)::integer
  INTO duration_mins
  FROM public.booking_services
  WHERE booking_id = booking;

  IF duration_mins IS NULL OR duration_mins <= 0 THEN
    duration_mins := GREATEST(
      15,
      EXTRACT(EPOCH FROM (row_booking.booking_end_time - row_booking.booking_start_time))::integer / 60
    );
  END IF;

  ends_at := starts_at + make_interval(mins => duration_mins);

  IF EXISTS (
    SELECT 1
    FROM public.bookings other
    WHERE other.professional_id = caller
      AND other.id <> booking
      AND other.status IN ('confirmed', 'in_progress')
      AND tstzrange(other.booking_start_time, other.booking_end_time, '[)')
          && tstzrange(starts_at, ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE = '23P01';
  END IF;

  UPDATE public.bookings
  SET
    booking_start_time = starts_at,
    booking_end_time = ends_at,
    preferred_date = (starts_at AT TIME ZONE 'Africa/Algiers')::date,
    status = 'confirmed',
    time_set_by_barber = true,
    updated_at = now()
  WHERE id = booking
  RETURNING * INTO row_booking;

  RETURN row_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_booking_with_time(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_booking_with_time(uuid, timestamptz) TO authenticated;

-- Allow the barber to read the client phone for their own bookings only.
CREATE OR REPLACE FUNCTION public.get_booking_client_phone(booking uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  phone text;
BEGIN
  IF caller IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT NULLIF(trim(profile.phone_number), '')
  INTO phone
  FROM public.bookings booking_row
  JOIN public.profiles profile ON profile.id = booking_row.client_id
  WHERE booking_row.id = booking
    AND booking_row.professional_id = caller;

  RETURN phone;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_client_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_client_phone(uuid) TO authenticated;
