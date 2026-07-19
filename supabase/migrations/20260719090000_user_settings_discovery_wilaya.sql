-- Discovery wilaya preference synced with the user account (#31).
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS discovery_wilaya text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.user_settings.discovery_wilaya IS 'Preferred wilaya filter for booking discovery';
