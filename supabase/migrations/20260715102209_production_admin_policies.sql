-- Reconstructed administrator helper and policies from official production.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read all reviews" ON public.reviews;
CREATE POLICY "Admins read all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Admins update reviews" ON public.reviews;
CREATE POLICY "Admins update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read payments" ON public.payments;
CREATE POLICY "Admins read payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Admins update payments" ON public.payments;
CREATE POLICY "Admins update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read all bookings" ON public.bookings;
CREATE POLICY "Admins read all bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_admin());
