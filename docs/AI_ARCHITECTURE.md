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
3. select a text provider via `api/_lib/ai-provider.ts`,
4. read server-only keys (never exposed to Vite),
5. enforce per-user daily quotas in Postgres,
6. map budget/rate/provider failures to safe unavailable states.

### Provider priority (text)

| Priority | Provider | Env | Default model |
|----------|----------|-----|---------------|
| 1 | **Groq** (free) | `GROQ_API_KEY` (`gsk_…`) | `llama-3.3-70b-versatile` |
| 2 | **xAI Grok** | `XAI_API_KEY` (`xai-…`) or legacy `GROQ_API_KEY` starting with `xai-` | `grok-3-latest` |
| 3 | **Gemini** | `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.0-flash` |

Image generation (optional, costly) still requires Gemini +
`AI_IMAGE_GENERATION_ENABLED=true` + client `FEATURE_FLAGS.aiImageGenerationEnabled`.

No model key is exposed to the browser. Advice is stateless and does not reuse
human chat conversations.

## Activation

```env
AI_GENERATION_ENABLED=true
# Groq (recommended free path):
GROQ_API_KEY=gsk_...
AI_TEXT_MODEL=llama-3.3-70b-versatile
# OR xAI Grok:
# XAI_API_KEY=xai-...
# AI_TEXT_MODEL=grok-3-latest
# OR Gemini fallback:
# GEMINI_API_KEY=...
AI_IMAGE_GENERATION_ENABLED=false
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
