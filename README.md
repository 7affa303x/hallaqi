# Hallaqi - حلاقي

**Hallaqi** is a production-ready Algerian barber booking platform. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Barber Discovery** — Search, filter, and browse barbers by location, rating, and services
- **Online Booking** — Book appointments with real-time availability
- **Forum** — Community discussions, tips, and competitions
- **QR Code** — Generate and scan barber QR codes
- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **Real-time** — Live notifications and chat
- **Arabic Interface** — Full RTL Arabic support
- **PWA** — Installable progressive web app

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
2. Run migrations in order:
   ```bash
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_seed_data.sql
   ```
3. Run storage policies:
   ```bash
   supabase/storage/policies.sql
   ```
4. Create Storage buckets: `avatars`, `portfolio`, `id-cards`, `review-images`

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
 
 

