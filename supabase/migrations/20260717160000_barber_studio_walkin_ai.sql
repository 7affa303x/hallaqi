-- Barber studio: walk-in bookings + expand AI daily quotas for barber assist.

ALTER TABLE public.ai_usage_daily
  DROP CONSTRAINT IF EXISTS ai_usage_daily_feature_check;

ALTER TABLE public.ai_usage_daily
  ADD CONSTRAINT ai_usage_daily_feature_check
  CHECK (feature IN ('advice', 'style-image', 'barber-assist'));

CREATE OR REPLACE FUNCTION public.consume_ai_quota(ai_feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  daily_limit integer;
  updated_count integer;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  daily_limit := CASE
    WHEN ai_feature = 'advice' THEN 20
    WHEN ai_feature = 'style-image' THEN 3
    WHEN ai_feature = 'barber-assist' THEN 30
    ELSE 0
  END;
  IF daily_limit = 0 THEN
    RAISE EXCEPTION 'Unknown AI feature' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_usage_daily (
    user_id, usage_date, feature, request_count
  )
  VALUES (caller, current_date, ai_feature, 1)
  ON CONFLICT (user_id, usage_date, feature) DO UPDATE SET
    request_count = public.ai_usage_daily.request_count + 1,
    updated_at = now()
  WHERE public.ai_usage_daily.request_count < daily_limit
  RETURNING request_count INTO updated_count;

  RETURN updated_count IS NOT NULL AND updated_count <= daily_limit;
END;
$$;

-- Walk-in / desk booking created by the professional (no app client required).
CREATE OR REPLACE FUNCTION public.create_walk_in_booking(
  selected_services uuid[],
  starts_at timestamptz DEFAULT now(),
  guest_name text DEFAULT NULL,
  note text DEFAULT NULL,
  payment_method_name text DEFAULT 'cash',
  mark_completed boolean DEFAULT false
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  service_count integer;
  total_amount numeric(10, 2);
  total_duration integer;
  primary_service uuid;
  created_booking public.bookings;
  composed_notes text;
  booking_status public.booking_status;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.professionals p WHERE p.id = caller
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = caller AND pr.user_role IN ('barber', 'specialist', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only professionals can create walk-in bookings' USING ERRCODE = '42501';
  END IF;
  IF selected_services IS NULL OR cardinality(selected_services) = 0 THEN
    RAISE EXCEPTION 'Select at least one service' USING ERRCODE = '22023';
  END IF;

  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(price), 0),
    COALESCE(SUM(duration_minutes), 0),
    (array_agg(id ORDER BY id))[1]
  INTO service_count, total_amount, total_duration, primary_service
  FROM public.services
  WHERE id = ANY(selected_services)
    AND professional_id = caller
    AND is_active = true;

  IF service_count <> cardinality(selected_services) OR total_duration <= 0 THEN
    RAISE EXCEPTION 'One or more services are unavailable' USING ERRCODE = '22023';
  END IF;

  composed_notes := trim(both FROM concat_ws(
    E'\n',
    CASE
      WHEN coalesce(trim(guest_name), '') <> '' THEN '[عميل مباشر: ' || trim(guest_name) || ']'
      ELSE '[عميل مباشر]'
    END,
    nullif(trim(note), '')
  ));

  booking_status := CASE WHEN mark_completed THEN 'completed'::public.booking_status ELSE 'confirmed'::public.booking_status END;

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
    notes
  )
  VALUES (
    NULL,
    caller,
    primary_service,
    starts_at,
    starts_at + make_interval(mins => total_duration),
    booking_status,
    total_amount,
    CASE WHEN mark_completed THEN 'paid'::public.payment_status ELSE 'pending'::public.payment_status END,
    payment_method_name,
    false,
    composed_notes
  )
  RETURNING * INTO created_booking;

  INSERT INTO public.booking_services (
    booking_id, service_id, price_snapshot, duration_snapshot
  )
  SELECT
    created_booking.id, id, price, duration_minutes
  FROM public.services
  WHERE id = ANY(selected_services)
    AND professional_id = caller
    AND is_active = true;

  RETURN created_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.create_walk_in_booking(
  uuid[], timestamptz, text, text, text, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_walk_in_booking(
  uuid[], timestamptz, text, text, text, boolean
) TO authenticated;
