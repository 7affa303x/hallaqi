# Hallaqi - حلاقي

**Hallaqi** is an Algerian barber discovery, booking, community, and payments platform built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Barber Discovery** — Search, filter, and browse barbers by location, rating, and services
- **Online Booking** — Book appointments with real-time availability
- **Forum** — Community discussions, tips, and competitions
- **QR Code** — Generate and scan barber QR codes
- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **Real-time** — Live notifications and chat
- **Arabic Interface** — Full RTL Arabic support
- **PWA** — Installable app shell with offline asset caching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| State | Zustand + React Context |
| Backend | Supabase (Auth, Database, Storage, Realtime) |
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
# Edit .env with your Supabase credentials
```

### 3. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Link the official project and apply committed migrations:
   ```bash
   npx supabase link --project-ref cdwzbtjwqybnahhbhldy
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

### 5. Build

```bash
npm run typecheck  # TypeScript check
npm run lint       # ESLint check
npm run build      # Production build
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | For card payments | Stripe publishable key |
| `VITE_CCP_ACCOUNT_NUMBER` | For manual payments | Approved merchant CCP account |
| `VITE_CCP_CARD_NUMBER` | For manual payments | Approved merchant card number |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [DATABASE.md](DATABASE.md) — Database schema and migrations
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guide
- [CHANGELOG.md](CHANGELOG.md) — Version history

## License

MIT
 
 

