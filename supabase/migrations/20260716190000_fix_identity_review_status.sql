CREATE OR REPLACE FUNCTION public.review_id_verification(
  request_id uuid,
  approve boolean,
  reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.id_verification_requests
  SET
    status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
    rejection_reason = CASE WHEN approve THEN NULL ELSE reason END,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = request_id AND status = 'pending'
  RETURNING user_id INTO target_user;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'Pending verification request not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
  SET
    verification_status = (
      CASE WHEN approve THEN 'verified' ELSE 'unverified' END
    )::public.verification_status,
    updated_at = now()
  WHERE id = target_user;

  UPDATE public.professionals
  SET has_id_card = true,
      id_card_verified = approve,
      updated_at = now()
  WHERE id = target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.review_id_verification(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_id_verification(uuid, boolean, text) TO authenticated;
