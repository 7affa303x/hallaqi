-- Durable booking lifecycle events and trustworthy professional response metrics.

CREATE TABLE IF NOT EXISTS public.booking_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_events_booking
  ON public.booking_status_events (booking_id, created_at);

ALTER TABLE public.booking_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants read status history"
  ON public.booking_status_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings booking
      WHERE booking.id = booking_status_events.booking_id
        AND (
          booking.client_id = auth.uid()
          OR booking.professional_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.record_booking_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_events (
      booking_id, status, changed_by, created_at
    ) VALUES (
      NEW.id, NEW.status, auth.uid(), now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_booking_status_insert_trigger ON public.bookings;
CREATE TRIGGER record_booking_status_insert_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.record_booking_status_event();

DROP TRIGGER IF EXISTS record_booking_status_update_trigger ON public.bookings;
CREATE TRIGGER record_booking_status_update_trigger
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.record_booking_status_event();

INSERT INTO public.booking_status_events (
  booking_id, status, changed_by, created_at
)
SELECT booking.id, booking.status, NULL, COALESCE(booking.updated_at, booking.created_at, now())
FROM public.bookings booking
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_status_events event
  WHERE event.booking_id = booking.id
);

CREATE OR REPLACE FUNCTION public.get_professional_metrics(professional uuid)
RETURNS TABLE (
  average_response_minutes numeric,
  acceptance_rate numeric,
  completed_bookings bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH professional_bookings AS (
    SELECT *
    FROM public.bookings
    WHERE professional_id = professional
  ),
  responses AS (
    SELECT EXTRACT(EPOCH FROM (MIN(event.created_at) - booking.created_at)) / 60.0 AS minutes
    FROM professional_bookings booking
    JOIN public.booking_status_events event ON event.booking_id = booking.id
    WHERE event.status IN ('confirmed', 'in_progress', 'completed')
      AND booking.created_at IS NOT NULL
    GROUP BY booking.id, booking.created_at
    HAVING MIN(event.created_at) >= booking.created_at
  )
  SELECT
    ROUND(COALESCE((SELECT AVG(minutes) FROM responses), 0)::numeric, 0),
    ROUND(
      CASE WHEN COUNT(*) = 0 THEN 0
      ELSE COUNT(*) FILTER (
        WHERE status IN ('confirmed', 'in_progress', 'completed')
      )::numeric / COUNT(*) * 100 END,
      0
    ),
    COUNT(*) FILTER (WHERE status = 'completed')
  FROM professional_bookings;
$$;

GRANT EXECUTE ON FUNCTION public.get_professional_metrics(uuid) TO anon, authenticated;
