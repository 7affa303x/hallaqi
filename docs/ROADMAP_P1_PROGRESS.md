# Progress — first 100 suggestions (internal)

Status after P1 implementation pass (July 2026). Not shown in the app UI.

## Done / improved this pass
- Removed in-app 200-suggestions report (unprofessional for end users)
- Fixed analytics consent banner reappearing after Accept/Decline
- #1 SITE_URL via getSiteUrl in AI identity
- #2 Client error beacon kept; Sentry flagged `sentryApmEnabled: false` (قريباً)
- #3 `/status` → `/api/status` HTML+JSON probes
- #26–29 GPS distance + smart sort + open-now filter
- #28 Inactive services filtered in transformToBarber
- #33 Popular service search chips
- #34 Mobile-only filter
- #45 Live result count
- #51 Already had server exclusion (unchanged)
- #52 In-app notify on accept; SMS `smsNotificationsEnabled: false` (قريباً)
- #53 Cancel policy on booking steps 1–3 (ar/fr/en)
- #56 Display-currency note + DZD settlement reminder
- #57 Offline booking draft in localStorage
- #73 ServicesManagement id-based save + plausible price/duration bounds
- #74 Busy/available one-tap in barber studio
- #91 CookieConsent + SoftOnboarding language coverage expanded
- #92 Locale columns migration + sync in user_settings
- #93 Language switcher on first-visit SoftOnboarding

## Explicitly قريباً / skipped (needs external or large effort)
- #2 Sentry account
- #4 Capacitor split
- #5 Partial SSR
- #32 Map clusters (external Maps link remains)
- #35 Compare 2–3 barbers (deferred)
- #52 SMS gateway
- Remaining nice-to-haves 96–100 partially: region settings already exist as separate selectors (#100)

Keep `docs/SUGGESTIONS_200.md` as the written roadmap; do not surface it inside the product UI.
