# Hallaqi Deployment Guide

## Prerequisites

- Supabase account (free tier works)
- Vercel account (free tier works)
- Git repository

## Step 1: Supabase

### 1.1 Official Project
Production uses Supabase project `cdwzbtjwqybnahhbhldy`. Do not deploy Hallaqi
schema or functions to similarly named projects.

### 1.2 Run Migrations
1. Run `npx supabase link --project-ref cdwzbtjwqybnahhbhldy`
2. Review with `npx supabase migration list --linked`
3. Apply with `npx supabase db push`

### 1.3 Create Storage Buckets
Buckets and policies are migration-managed. Public: `avatars`, `covers`,
`portfolio`, `forum-images`, `review-images`. Private: `id-cards`,
`payment-receipts`.

### 1.4 Auth Settings
1. Go to Authentication → Settings
2. Enable Email provider
3. Enable Google OAuth
4. Set **Site URL** to the canonical apex: `https://hallaqi.app` (must match `VITE_SITE_URL` / production redirects)
5. Redirect URLs allow-list (all required):
   - `https://hallaqi.app/**`
   - `https://www.hallaqi.app/**` (if www still resolves — redirect www→apex at DNS/Vercel)
   - `http://localhost:5173/**` (or your Vite port)
   - `https://*.vercel.app/**` (preview testing only; tighten before hard launch if desired)
6. Prefer a single apex host: configure Vercel domain redirect `www` → `hallaqi.app` so OAuth never bounces between hosts

## Step 2: Vercel

### 2.1 Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### 2.2 Environment Variables
Add these in Project Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### 2.3 Deploy
Click Deploy. The app will build and deploy automatically.

## Step 3: Verify

After deployment, verify:
- [ ] App loads without errors
- [ ] Supabase setup screen shows if env vars missing
- [ ] Authentication works (sign up / sign in)
- [ ] Barbers load from database
- [ ] Forum posts display
- [ ] Forum post/comment/like writes persist
- [ ] Profile page loads
- [ ] Cash booking completes and appears in appointments
- [ ] Edge Functions reject unauthenticated calls
- [ ] Web Push subscription persists and a test notification is delivered
- [ ] TOTP enrollment/challenge works for an administrator test account
- [ ] `/sitemap.xml` returns active barber and forum URLs
- [ ] No console errors

## Local Development

```bash
# 1. Clone repo
git clone <repo-url>
cd hallaqi

# 2. Install dependencies
npm install

# 3. Create .env
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Run dev server
npm run dev
# Opens at http://localhost:3000

# 5. Run checks
npm run typecheck
npm run lint
npm run build
```

## Troubleshooting

### White screen after deploy
- Check browser console for errors
- Verify `VITE_SUPABASE_URL` is set correctly
- Check that `dist/` folder contains all assets

### Auth not working
- Verify Supabase Anon Key is correct
- Check that `auth.users` table has users
- Check `users` profile table has matching rows

### Images not loading
- Verify Storage buckets exist and are public
- Check bucket policies are applied

## Updating

After code changes:
1. Push to Git
2. Vercel auto-deploys
3. If database changes: run new migration in Supabase SQL Editor
