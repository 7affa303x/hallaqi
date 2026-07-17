#!/usr/bin/env bash
# One-shot launch helper for Barber Studio + Gemini.
# Requires env vars (never commit secrets):
#   SUPABASE_ACCESS_TOKEN   — from https://supabase.com/dashboard/account/tokens
#   SUPABASE_DB_PASSWORD    — database password (for `supabase link`)
#   VERCEL_TOKEN            — from https://vercel.com/account/tokens
#   GEMINI_API_KEY          — Google AI Studio auth key
# Optional:
#   SUPABASE_PROJECT_REF    — default: cdwzbtjwqybnahhbhldy
#   VERCEL_PROJECT          — default: hallaqi (or your linked project name)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-cdwzbtjwqybnahhbhldy}"
VERCEL_PROJECT="${VERCEL_PROJECT:-hallaqi}"

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "❌ Missing required env var: $name" >&2
    exit 1
  fi
}

echo "==> Hallaqi Barber Studio launch setup"
require SUPABASE_ACCESS_TOKEN
require SUPABASE_DB_PASSWORD
require VERCEL_TOKEN
require GEMINI_API_KEY

export SUPABASE_ACCESS_TOKEN

echo "==> 1/3 Apply Supabase migration"
npx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" --yes
npx supabase migration list --linked
npx supabase db push --linked --yes

echo "==> 2/3 Configure Vercel server env (Production + Preview)"
export VERCEL_TOKEN
for env in production preview; do
  printf '%s' "$GEMINI_API_KEY" | npx vercel env add GEMINI_API_KEY "$env" --force --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" 2>/dev/null || \
    printf '%s' "$GEMINI_API_KEY" | npx vercel env add GEMINI_API_KEY "$env" --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT"
  printf '%s' "$GEMINI_API_KEY" | npx vercel env add GOOGLE_GENERATIVE_AI_API_KEY "$env" --force --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" 2>/dev/null || true
  printf 'true' | npx vercel env add AI_GENERATION_ENABLED "$env" --force --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" 2>/dev/null || \
    printf 'true' | npx vercel env add AI_GENERATION_ENABLED "$env" --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT"
  printf 'gemini-2.0-flash' | npx vercel env add AI_TEXT_MODEL "$env" --force --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" 2>/dev/null || true
  printf 'gemini-2.0-flash-preview-image-generation' | npx vercel env add AI_IMAGE_MODEL "$env" --force --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" 2>/dev/null || true
done

echo "==> 3/3 Redeploy production (optional)"
npx vercel deploy --prod --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" --yes || echo "⚠️  Deploy skipped — trigger redeploy from Vercel dashboard if needed."

echo "✅ Launch setup complete."
echo "   Verify: curl https://www.hallaqi.app/api/ai/capabilities"
echo "   Rotate GEMINI_API_KEY if it was ever shared in chat."
