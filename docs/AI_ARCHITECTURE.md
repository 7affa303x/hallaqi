# Hallaqi Intelligence Architecture

Hallaqi separates reliable decision support from optional generative AI.
Recommendations and scheduling must continue working when every external model
provider is unavailable.

## Deterministic intelligence

These capabilities execute locally in the browser over data already returned by
Supabase:

- `src/lib/recommendations.ts`: explainable professional ranking using service
  fit, location, price, rating, verification, favorites, and booking history.
- `src/lib/scheduling.ts`: ranks valid time slots using booking history,
  proximity, and schedule-gap reduction.

They do not send personal data to an AI provider, incur model cost, or fabricate
availability. PostgreSQL constraints remain the final booking-integrity guard.

## Generative intelligence

Vercel Functions own all model calls:

- `GET /api/ai/capabilities`
- `POST /api/ai/advice`
- `POST /api/ai/style-image`

The functions:

1. validate the Supabase bearer token,
2. validate bounded input with Zod,
3. select server-owned models,
4. route through Vercel AI Gateway using deployment OIDC,
5. tag usage by user and feature,
6. map budget/rate/provider failures to safe unavailable states.

No model key, model identifier, or cost control is exposed to the browser.
Advice is stateless and does not reuse human chat conversations.

Current verified model identifiers:

- text: `openai/gpt-5.4`
- image reference: `google/gemini-3.1-flash-image-preview`

## Activation

Generation is intentionally off unless the server environment contains:

```env
AI_GENERATION_ENABLED=true
AI_TEXT_MODEL=openai/gpt-5.4
AI_IMAGE_MODEL=google/gemini-3.1-flash-image-preview
```

The linked Vercel OIDC flow is valid, but a live request currently returns
`customer_verification_required`: the Vercel team must add a valid billing card
to unlock Gateway credits. Configure per-user rate limits and a hard budget
before setting `AI_GENERATION_ENABLED=true`.

## Safety boundary

The style-image endpoint generates generic adult hairstyle references only. It
does not accept faces. Face-based virtual try-on remains blocked until Hallaqi
defines explicit consent, private storage, retention/deletion, and provider data
processing policies.
