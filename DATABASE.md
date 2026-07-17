# Hallaqi Database

**Source of Truth:** Official production project `cdwzbtjwqybnahhbhldy`
**Last Updated:** 2026-07-16

## Custom ENUM Types

| Type | Values |
|------|--------|
| `user_role` | client, barber, specialist, admin, moderator, store, company, doctor |
| `user_status` | active, inactive, suspended, pending |
| `verification_status` | unverified, pending, verified, premium |
| `booking_status` | pending, confirmed, in_progress, completed, cancelled, no_show |
| `payment_status` | pending, paid, refunded, failed |
| `service_category` | haircut, beard, shave, hair_treatment, facial, coloring, styling, package |
| `moderation_status` | pending, approved, rejected |
| `media_type` | image, video |

## Tables

### `profiles` (extends auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | = auth.users.id |
| updated_at | TIMESTAMPTZ | auto |
| username | TEXT | unique |
| full_name | TEXT | |
| avatar_url | TEXT | Storage URL |
| website | TEXT | |
| phone_number | TEXT | |
| address | TEXT | |
| city | TEXT | |
| country | TEXT | |
| user_role | USER_ROLE | default: client |
| user_status | USER_STATUS | default: active |
| verification_status | VERIFICATION_STATUS | default: unverified |

### `professionals` (extends profiles)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | = profiles.id (1:1) |
| bio | TEXT | |
| average_rating | NUMERIC | default 0.0 |
| review_count | INTEGER | default 0 |
| latitude | NUMERIC | for maps |
| longitude | NUMERIC | for maps |
| business_name | TEXT | |
| business_address | TEXT | |
| business_phone | TEXT | |
| business_email | TEXT | |
| website_url | TEXT | |

### `services`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| professional_id | UUID FK | -> professionals |
| name | TEXT | NOT NULL |
| description | TEXT | |
| price | NUMERIC | NOT NULL (DZD) |
| duration_minutes | INTEGER | NOT NULL |
| category | SERVICE_CATEGORY | |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| client_id | UUID FK | -> profiles |
| professional_id | UUID FK | -> professionals |
| service_id | UUID FK | -> services |
| booking_start_time | TIMESTAMPTZ | |
| booking_end_time | TIMESTAMPTZ | |
| status | BOOKING_STATUS | default: pending |
| total_price | NUMERIC | |
| payment_status | PAYMENT_STATUS | default: pending |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `reviews`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| booking_id | UUID FK | -> bookings |
| reviewer_id | UUID FK | -> profiles |
| professional_id | UUID FK | -> professionals |
| rating | INTEGER | 1-5 CHECK |
| comment | TEXT | |
| is_public | BOOLEAN | default true |
| moderation_status | MODERATION_STATUS | default: pending |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `favorites`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| user_id | UUID FK | -> profiles |
| professional_id | UUID FK | -> professionals |
| created_at | TIMESTAMPTZ | auto |
| UNIQUE | | (user_id, professional_id) |

### `availability_schedules`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| professional_id | UUID FK | -> professionals |
| day_of_week | INTEGER | 0-6 CHECK |
| start_time | TIME | |
| end_time | TIME | |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `availability_exceptions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| professional_id | UUID FK | -> professionals |
| date | DATE | |
| type | TEXT | e.g. 'closed', 'vacation' |
| start_time | TIME | nullable |
| end_time | TIME | nullable |
| reason | TEXT | |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `portfolio_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| professional_id | UUID FK | -> professionals |
| type | MEDIA_TYPE | image/video |
| url | TEXT | NOT NULL |
| thumbnail_url | TEXT | |
| caption | TEXT | |
| sort_order | INTEGER | default 0 |
| created_at | TIMESTAMPTZ | auto |

### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |
| last_message_at | TIMESTAMPTZ | |

### `conversation_members`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| conversation_id | UUID FK | -> conversations |
| user_id | UUID FK | -> profiles |
| joined_at | TIMESTAMPTZ | auto |
| last_read_at | TIMESTAMPTZ | |
| UNIQUE | | (conversation_id, user_id) |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| conversation_id | UUID FK | -> conversations |
| sender_id | UUID FK | -> profiles |
| content | TEXT | NOT NULL |
| type | TEXT | default: text |
| status | TEXT | default: sent |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| user_id | UUID FK | -> profiles |
| type | TEXT | e.g. 'booking', 'message' |
| title | TEXT | |
| message | TEXT | |
| read | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | auto |
| metadata | JSONB | flexible data |

### `forum_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| name | TEXT | NOT NULL |
| slug | TEXT | UNIQUE |
| description | TEXT | |
| icon | TEXT | |
| color | TEXT | |
| sort_order | INTEGER | default 0 |
| created_at | TIMESTAMPTZ | auto |

### `forum_posts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| category_id | UUID FK | -> forum_categories |
| author_id | UUID FK | -> profiles |
| title | TEXT | NOT NULL |
| content | TEXT | NOT NULL |
| image_url | TEXT | |
| type | TEXT | default: discussion |
| likes_count | INTEGER | default 0 |
| comments_count | INTEGER | default 0 |
| views_count | INTEGER | default 0 |
| is_pinned | BOOLEAN | default false |
| is_locked | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `forum_comments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| post_id | UUID FK | -> forum_posts |
| author_id | UUID FK | -> profiles |
| content | TEXT | NOT NULL |
| parent_id | UUID FK | -> forum_comments (replies) |
| likes_count | INTEGER | default 0 |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### `forum_likes`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| user_id | UUID FK | -> profiles |
| post_id | UUID FK | -> forum_posts |
| comment_id | UUID FK | -> forum_comments |
| created_at | TIMESTAMPTZ | auto |

### `forum_reports`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto |
| reporter_id | UUID FK | -> profiles |
| post_id | UUID FK | -> forum_posts |
| comment_id | UUID FK | -> forum_comments |
| reason | TEXT | NOT NULL |
| status | TEXT | default: pending |
| created_at | TIMESTAMPTZ | auto |

## Functions

| Function | Type | Purpose |
|----------|------|---------|
| `handle_new_user()` | TRIGGER | Auto-create profile on auth signup |
| `get_or_create_conversation(u1, u2)` | RPC | Find or create 1:1 chat |
| `update_conversation_last_message()` | TRIGGER | Update conv timestamp |
| `mark_conversation_messages_as_read()` | RPC | Mark messages read |
| `update_professional_rating()` | TRIGGER | Recalculate avg rating |
| `update_forum_post_counts()` | TRIGGER | Update like/comment counts |

## Triggers

| Table | Trigger | Event | Function |
|-------|---------|-------|----------|
| auth.users | on_auth_user_created | AFTER INSERT | handle_new_user |
| messages | on_new_message | AFTER INSERT | update_conversation_last_message |
| reviews | update_professional_rating_trigger | AFTER INSERT/UPDATE | update_professional_rating |
| forum_comments | on_forum_comment_change | AFTER INSERT/DELETE | update_forum_post_counts |
| forum_likes | on_forum_like_change | AFTER INSERT/DELETE | update_forum_post_counts |

## Storage Buckets

| Bucket | Public | Size Limit | MIME Types |
|--------|--------|------------|------------|
| avatars | true | 5MB | jpeg, png, webp |
| covers | true | 5MB | jpeg, png, webp |
| portfolio | true | 10MB | jpeg, png, webp |
| reviews | true | 5MB | jpeg, png, webp |

## Key Indexes

| Table | Index | Columns |
|-------|-------|---------|
| profiles | username_key | username (UNIQUE) |
| professionals | pkey | id |
| services | idx_services_professional | professional_id (WHERE is_active) |
| bookings | idx_bookings_time_range | professional_id, booking_start_time, booking_end_time |
| bookings | idx_bookings_no_double_booking | professional_id, booking_start_time (WHERE status NOT cancelled/no_show) |
| favorites | user_id_professional_id_key | user_id, professional_id (UNIQUE) |
| conversation_members | conversation_id_user_id_key | conversation_id, user_id (UNIQUE) |
| forum_categories | slug_key | slug (UNIQUE) |
| forum_likes | user_id_post_id_key | user_id, post_id (UNIQUE) |
| forum_likes | user_id_comment_id_key | user_id, comment_id (UNIQUE) |
| reviews | idx_reviews_professional | professional_id (WHERE is_public AND approved) |

## RLS Policies

All exposed tables have RLS enabled. Key patterns:
- **Public read:** professionals, services, availability, portfolio, forum posts/comments/likes/categories
- **Own only:** profiles (update), favorites, notifications, bookings, forum reports
- **Member-only:** conversations, conversation_members, messages
- **Author:** forum posts/comments (update/delete)

## Foundation Additions

The production foundation migrations also provide:

- `payments` and private `payment-receipts` storage
- `user_settings` for notification, privacy, and accessibility preferences
- `id_verification_requests` with administrator review RPC
- `professional_reports`
- `subscription_plans` and `subscription_requests`
- `booking_services` and atomic multi-service booking RPC
- `push_subscriptions` for browser Web Push
- `booking_status_events` and professional response metrics
- `competitions` and `competition_entries`
- `user_blocks` and messaging privacy enforcement
- `ai_usage_daily` with server-enforced quotas
- loyalty voucher reservations and checkout discounts
- database-level non-overlapping booking constraints
- protected profile/review moderation fields
- administrator booking, review, payment, report, and identity policies

Apply and inspect migrations with the Supabase CLI; do not run the legacy SQL
files manually against production:

```bash
npx supabase link --project-ref cdwzbtjwqybnahhbhldy
npx supabase migration list --linked
npx supabase db push
```
