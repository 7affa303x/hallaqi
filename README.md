# Hallaqi - حلاقي

**Hallaqi** is an Algerian barber discovery, booking, community, and marketplace platform built with React, TypeScript, Tailwind CSS, and Supabase.

**Production:** https://hallaqi.app

## Features

- **Barber Discovery** — Search, filter, and browse barbers by location, rating, and services
- **Online Booking** — Atomic multi-service appointments (**cash** at soft launch)
- **Marketplace** — Stores / companies / doctors with external Visit Store (https only)
- **Forum** — Community discussions, likes, device bookmarks, reports, and competitions
- **QR Code** — Generate and scan barber QR codes
- **Smart Matching** — Explainable barber recommendations and optimized appointment times
- **AI Advisor** — Groq-powered Arabic grooming advice (free tier; image gen paused)
- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **Security** — Optional TOTP two-factor authentication and administrator AAL2
- **Real-time** — Live in-app notifications and conversation inbox
- **Arabic Interface** — Full RTL Arabic (partial fr/en nav i18n)
- **PWA** — Installable app shell with offline asset caching + offline.html

### Paused at soft launch (متوقف)
- Card / CCP / Baridi Mob payments
- Paid subscription upgrades & ad placements
- Loyalty program
- In-app product checkout / commissions / shipping
- Web Push (needs VAPID), WhatsApp support, Gemini images
- Full fr/en UI, React Query, E2E CI, dynamic OG

See [docs/LAUNCH_NOTES.md](docs/LAUNCH_NOTES.md) for the full launch checklist.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| State | Zustand + React Context |
| Backend | Supabase (Auth, Database, Storage, Realtime) |
| Intelligence | Deterministic ranking + Groq / Vercel AI SDK |
| Observability | Vercel Web Analytics + Speed Insights (consent) |
| Icons | Lucide React |

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd hallaqi
npm install
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your Supabase + GROQ_API_KEY credentials
```

### 3. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Link the official project and apply committed migrations:
   ```bash
   npx supabase link --project-ref npkmqlupkvijhumkldpm
   npx supabase db push
   ```
3. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy
   ```
4. The migrations provision the canonical buckets: `avatars`, `covers`, `portfolio`, `forum-images`, `review-images`, `id-cards`, and `payment-receipts`.

### 4. Run

```bash
npm run dev
```

### 5. Quality checks

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
# or all: npm run check
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role for privileged APIs |
| `GROQ_API_KEY` | For AI text | Free Groq key for Arabic advice |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Card payments | Stripe publishable key (paused) |
| `VITE_CCP_ACCOUNT_NUMBER` | Manual payments | CCP account (paused) |
| `VITE_CCP_CARD_NUMBER` | Manual payments | CCP card (paused) |
| `VITE_VAPID_PUBLIC_KEY` | Web Push | Public VAPID key (paused) |
| `VITE_SUPPORT_WHATSAPP` | Support chat | E.164 number (paused) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run test:run` | Unit tests (Vitest) |
| `npm run check` | typecheck + lint + test + build |
| `npm run preview` | Preview production build |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [DATABASE.md](DATABASE.md) — Database schema and migrations
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guide
- [docs/LAUNCH_NOTES.md](docs/LAUNCH_NOTES.md) — Soft-launch status
- [CHANGELOG.md](CHANGELOG.md) — Version history

## License

MIT
