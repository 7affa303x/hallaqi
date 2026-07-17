-- Preserve every selected service and create bookings atomically from trusted
-- service prices and durations.

CREATE TABLE IF NOT EXISTS public.booking_services (
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  price_snapshot numeric(10, 2) NOT NULL CHECK (price_snapshot >= 0),
  duration_snapshot integer NOT NULL CHECK (duration_snapshot > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_services_service
  ON public.booking_services (service_id);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants read booking services" ON public.booking_services;
CREATE POLICY "Booking participants read booking services"
  ON public.booking_services FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings booking
      WHERE booking.id = booking_services.booking_id
        AND (
          booking.client_id = auth.uid()
          OR booking.professional_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.create_booking_with_services(
  professional uuid,
  selected_services uuid[],
  starts_at timestamptz,
  note text DEFAULT NULL,
  payment_method_name text DEFAULT 'cash',
  mobile_service boolean DEFAULT false,
  mobile_address text DEFAULT NULL
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
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF selected_services IS NULL OR cardinality(selected_services) = 0 THEN
    RAISE EXCEPTION 'Select at least one service' USING ERRCODE = '22023';
  END IF;
  IF starts_at <= now() THEN
    RAISE EXCEPTION 'Booking must be in the future' USING ERRCODE = '22023';
  END IF;
  IF mobile_service AND COALESCE(trim(mobile_address), '') = '' THEN
    RAISE EXCEPTION 'Mobile service address is required' USING ERRCODE = '22023';
  END IF;

  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(price), 0),
    COALESCE(SUM(duration_minutes), 0),
    (array_agg(id ORDER BY id))[1]
  INTO service_count, total_amount, total_duration, primary_service
  FROM public.services
  WHERE id = ANY(selected_services)
    AND professional_id = professional
    AND is_active = true;

  IF service_count <> cardinality(selected_services) OR total_duration <= 0 THEN
    RAISE EXCEPTION 'One or more services are unavailable' USING ERRCODE = '22023';
  END IF;

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
    notes
  )
  VALUES (
    caller,
    professional,
    primary_service,
    starts_at,
    starts_at + make_interval(mins => total_duration),
    'pending',
    total_amount,
    'pending',
    payment_method_name,
    mobile_service,
    CASE WHEN mobile_service THEN mobile_address ELSE NULL END,
    note
  )
  RETURNING * INTO created_booking;

  INSERT INTO public.booking_services (
    booking_id, service_id, price_snapshot, duration_snapshot
  )
  SELECT
    created_booking.id, id, price, duration_minutes
  FROM public.services
  WHERE id = ANY(selected_services)
    AND professional_id = professional
    AND is_active = true;

  RETURN created_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_with_services(
  uuid, uuid[], timestamptz, text, text, boolean, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_with_services(
  uuid, uuid[], timestamptz, text, text, boolean, text
) TO authenticated;

-- Backfill the primary service for historical bookings.
INSERT INTO public.booking_services (
  booking_id, service_id, price_snapshot, duration_snapshot
)
SELECT
  booking.id,
  service.id,
  service.price,
  service.duration_minutes
FROM public.bookings booking
JOIN public.services service ON service.id = booking.service_id
ON CONFLICT (booking_id, service_id) DO NOTHING;
