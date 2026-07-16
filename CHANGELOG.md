# Hallaqi Changelog

## v12.0.0 — Verified Production Foundation

### Product
- Wired availability exceptions into booking availability
- Completed forum post, comment, like, image, and report flows
- Added persisted notification preferences, realtime delivery, and read state
- Added barber onboarding, review submission, ID verification, account export,
  account deletion, and administrator booking/identity management
- Replaced simulated QR scanning with real browser QR decoding

### Reliability and Security
- Added database overlap constraints and repaired invalid legacy booking duration
- Protected privileged profile and review moderation fields
- Secured chat RPCs, notification delivery, checkout, and payment verification
- Made Stripe webhooks fail closed until signature verification is configured
- Consolidated private receipt and identity-document access

### Platform
- Added PWA service worker, SEO metadata, sitemap, robots policy, image
  optimization, lazy tab loading, Vitest, and npm-only dependency management
- Verified the official Supabase project `cdwzbtjwqybnahhbhldy`

---

## v11.0.0 — Production Foundation

### Infrastructure
- Complete Supabase backend (Auth, Database, Storage, Realtime)
- Full database schema with UUIDs, FKs, indexes, RLS
- Row Level Security policies on all tables
- Storage buckets: avatars, portfolio, id-cards, review-images
- Edge function: send-notification
- API layer: centralized auth/database/storage services
- Demo mode completely removed — pure Supabase only

### Authentication
- Supabase Auth (email/password)
- Google OAuth support
- Session persistence and auto-restore
- Password reset via email
- User profile creation on signup
- Protected routes with auth guards

### Data
- All mock data removed from runtime
- Real Supabase queries for barbers, bookings, forum
- Seed data SQL for initial barbers
- Empty states for all data-dependent screens

### Error Handling
- Arabic error messages throughout
- Graceful handling of auth/network/database/storage errors
- Error boundary to prevent React crashes

### Loading UX
- Skeleton loaders for all data sections
- Loading spinners on async operations
- Empty states with helpful messaging
- Retry capability on errors

### Security
- Input validation on all forms
- File upload validation (size + type)
- RLS policies on every table
- No hardcoded secrets
- Environment variables for all config

### Documentation
- README.md
- ARCHITECTURE.md
- DATABASE.md
- DEPLOYMENT.md
- CHANGELOG.md
- supabase/README.md

### Build
- Zero TypeScript errors
- Zero ESLint errors
- Zero build errors

---

## v10.0.0

### Infrastructure
- Migrated from Firebase to Supabase
- Demo mode removed
- Supabase setup screen for missing env vars

---

## Previous Versions

- v1-v9: Development iterations with feature building
