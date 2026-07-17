# Hallaqi Changelog

## v12.2.1 — Marketplace Wave 2 UX

### Discovery & seller tools
- Shared MarketUI helpers (stars, banners, progress, saved/recent products)
- Seller catalog: progress bar, draft notes, duplicate/bulk deactivate, URL/title validation
- Store/company detail polish: review sort & counters, delivery chips, share toast, safe-area CTA
- Analytics refresh/export, saves rate, visit-store goal teaser
- Admin: pending business count, reject reason prompt, POTD bid > 0, placement stamp
- Bottom nav radial backdrop, haptic long-press, Discover POTD sparkle
- i18n keys for saved/filters/trust strip; version bump

---

## v12.2.0 — Monetization & Multi-Role Marketplace

### Platform Expansion
- Separate roles: store, company, doctor (plus existing client/barber/admin)
- Marketplace discovery layer inside Discover (not a bottom tab)
- Central AI button with long-press radial (AI / QR / Camera / Gallery)
- Visit Store WebView with external browser fallback
- Independent subscription catalogs per business type; premium capped at 99
- Product of the Day as paid placement (admin-controlled)
- Store/company analytics, seller catalog, barber service extras, AI listing assist
- Admin queues for business approvals and placements

See `docs/MONETIZATION_BACKLOG_100.md` for the 100+ follow-up roadmap.

---

## v12.1.0 — Product Completion & Growth

### Customer Experience
- Atomic multi-service bookings with trusted server prices, durations, overlap protection, rebooking, and loyalty vouchers
- Geolocation distance sorting, wilaya filters, favorites discovery, actionable notifications, and a returning chat inbox
- End-to-end Web Push with VAPID, deep links, preference sync, and expired-subscription cleanup
- Arabic/French/English primary navigation plus working accessibility controls

### Barber & Community
- Working phone, chat, share, favorite, QR, and coordinate-aware map actions
- Real forum sorting, bookmarks, comment likes, competitions, and participation
- Professional onboarding score and lifecycle-derived response, acceptance, and completion metrics

### Trust, Admin & Security
- TOTP MFA with AAL2 enforcement for enrolled administrators
- User block lists and database-enforced messaging preferences
- Admin queues for subscriptions, reports, bookings, payments, reviews, and identity
- CSP/HSTS/permissions headers, restricted Edge CORS, AI quotas, client-error intake, and CI

### Platform
- Rebuilt valid PNG/SVG branding and PWA icons
- Dynamic sitemap and HairSalon structured data
- Unified custom routing, lazy QR decoder, optimized assets, and Vercel funnel analytics

---

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

### Autonomous Product Evolution
- Added explainable, deterministic professional recommendations
- Added personalized time-slot optimization from booking history
- Added authenticated Vercel AI Gateway endpoints and safe disabled capability UI
- Added loyalty points, tiers, reward vouchers, and redemption controls
- Added Vercel Web Analytics and Speed Insights

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
