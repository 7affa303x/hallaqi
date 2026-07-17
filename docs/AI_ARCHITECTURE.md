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
- `POST /api/ai/barber-assist`

The functions:

1. validate the Supabase bearer token,
2. validate bounded input with Zod,
3. select server-owned Gemini models via `@ai-sdk/google`,
4. read `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` (never exposed to Vite),
5. enforce per-user daily quotas in Postgres,
6. map budget/rate/provider failures to safe unavailable states.

No model key is exposed to the browser. Advice is stateless and does not reuse
human chat conversations.

Current default model identifiers:

- text: `gemini-2.0-flash`
- image reference: `gemini-2.0-flash-preview-image-generation`
- barber assist: same text model

## Activation

Generation turns on when the server has a Gemini key (or when
`AI_GENERATION_ENABLED=true` with a key):

```env
AI_GENERATION_ENABLED=true
AI_TEXT_MODEL=gemini-2.0-flash
AI_IMAGE_MODEL=gemini-2.0-flash-preview-image-generation
GEMINI_API_KEY=your_key_here
# optional alias also supported:
# GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Set these on Vercel Project → Settings → Environment Variables (Production +
Preview). Never prefix the key with `VITE_`.

Daily quotas (Postgres `consume_ai_quota`):

- advice: 20 / day
- style-image: 3 / day
- barber-assist: 30 / day

## Safety boundary

The style-image endpoint generates generic adult hairstyle references only. It
does not accept faces. Face-based virtual try-on remains blocked until Hallaqi
defines explicit consent, private storage, retention/deletion, and provider data
processing policies.

Barber assist is for operational help (briefs, message drafts, service tips). It
must not invent medical diagnoses or claim fabricated market prices as facts.
