-- Persist locale prefs (language / country / currency) with the user account.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'ar';

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'DZ';

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'DZD';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_language_check'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_language_check
      CHECK (language IN ('ar', 'fr', 'en'));
  END IF;
END $$;

COMMENT ON COLUMN public.user_settings.language IS 'UI language preference synced from client';
COMMENT ON COLUMN public.user_settings.country_code IS 'ISO 3166-1 alpha-2 country for display';
COMMENT ON COLUMN public.user_settings.currency_code IS 'Display currency code (indicative conversion from DZD)';
