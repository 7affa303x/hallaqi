# Hallaqi Supabase Backend

Supabase backend configuration for the official Hallaqi production project
`cdwzbtjwqybnahhbhldy`.

## Setup Order

1. `npx supabase link --project-ref cdwzbtjwqybnahhbhldy`
2. `npx supabase migration list --linked`
3. `npx supabase db push`
4. `npx supabase functions deploy`
5. `npx supabase db lint --linked --schema public`

## Files

| File | Purpose |
|------|---------|
| `migrations/001_initial_schema.sql` | Database schema (tables, indexes, RLS) |
| `migrations/002_seed_data.sql` | Forum seed data |
| `migrations/003_payments_table.sql` | Payment records and base policies |
| `migrations/004_payment_receipts_storage.sql` | Private receipt storage |
| `migrations/20260716*.sql` | Foundation security and workflow completion |
| `storage/policies.sql` | Legacy bootstrap policies; migrations are authoritative |
| `functions/` | Secured payment, notification, webhook, and account functions |

## Environment Variables (Frontend)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Storage Buckets Required

- `avatars` — User profile photos
- `covers` — Professional cover images
- `portfolio` — Barber gallery images
- `forum-images` — Forum attachments
- `id-cards` — ID verification documents
- `review-images` — Review photos
- `payment-receipts` — Private manual payment receipts
