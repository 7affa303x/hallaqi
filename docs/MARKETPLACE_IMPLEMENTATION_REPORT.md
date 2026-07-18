# Hallaqi Monetization & Platform Expansion — Implementation Report

Updated: 2026-07-18 (gap-closure + status table pass)

## Navigation (final)

RTL right → left:

1. **الحجز** (`booking`)
2. **المنتدى** (`forum`)
3. **المساعد** central AI (`ai-hub`) — tap → AI Advisor · long-press → radial (Heart+Sparkles)
4. **السوق** (`marketplace`)
5. **البروفايل** (`profile`)

## Full status table

See **[MARKETPLACE_STATUS_TABLE.md](./MARKETPLACE_STATUS_TABLE.md)** for the complete §1–§20 matrix (updated after gap closure).

## This pass closed

| Gap | Fix |
|-----|-----|
| Barber extras typed as store | `sellerType: 'barber'` |
| Social links missing | Edit form + store/company display |
| Plan-gated analytics/AI | `planAccess.ts` |
| Tier-weighted ranking | `filters.ts` + product `subscriptionPlan` |
| Admin live sellers | `getMarketplaceSellersForAdmin` |
| Marketplace section control | `sectionConfig.ts` + admin toggles |
| Marketplace reports | product report → admin queue |
| Conversion metric + saves | analytics + ProductDetail bookmark |
| Doctor verify persistence | `requestDoctorFreeVerification` |
| Doctor consultancy + disclaimer | DoctorDetailPage |
| Company distinct page + pricing | CompanyDetailPage + `companyMarketplacePlans` |
| Heart+Sparkles center button | BottomNav |
| Barber plan names Professional/Business | `mockData.subscriptionPlans` |

## Remaining production blocker

- Apply Supabase migrations with real `VITE_SUPABASE_URL` + anon key, then `supabase db push`.
- Until then: seed + localStorage fallback.

## Intentionally NOT implemented (brief exclusions)

- Commissions, affiliates, in-app product checkout, unlimited premium, random daily discounts
- Loyalty UI gated off (`FEATURE_FLAGS.loyaltyEnabled = false`)
