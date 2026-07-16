# Services Data Flow

Hallaqi uses a normalized PostgreSQL model. The former `barbers.services` JSONB
design and `/api/barbers` endpoint are obsolete.

## Schema

- `profiles`: public account identity
- `professionals`: one-to-one professional extension of a profile
- `services`: one row per service, linked by `professional_id`

Service fields include `name`, `description`, `price`, `duration_minutes`,
`category`, and `is_active`. RLS permits public reads of active services and
allows professionals to manage only their own rows.

## Read Flow

1. `getProfessionals()` in `src/supabase/database.ts` queries professionals
   with nested profile, service, and availability records.
2. `transformToBarber()` in `src/lib/utils.ts` maps database rows into the
   application `Barber` and `Service` models.
3. `BookingTab`, `BarberDetailPage`, and `BookingFlowPage` consume those models.

The booking flow persists `service_id` and uses the database service price and
duration presented by the application. A database exclusion constraint prevents
overlapping active appointments.

## Write Flow

`ServicesManagement` calls the typed helpers in `src/supabase/database.ts`:

- `getProfessionalServices`
- `createService`
- `updateService`
- `deleteService`

All writes run through the authenticated Supabase client and are enforced by
RLS. There is no custom `/api/barbers` intermediary.
