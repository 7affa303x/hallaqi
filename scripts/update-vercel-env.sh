#!/usr/bin/env bash
# Sync Hallaqi secrets to the canonical Vercel project (hallaqi on team souf303x).
#
# Never commit real keys. Load from a local file, then run:
#   cp scripts/vercel-env.example scripts/.env.vercel.local  # then fill values
#   set -a && source scripts/.env.vercel.local && set +a
#   ./scripts/update-vercel-env.sh
#
# Required env vars:
#   VERCEL_TOKEN
#   VITE_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#
# Optional (set only what you want to update):
#   GROQ_API_KEY, GEMINI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
#
# Canonical targets (do not change):
#   Vercel project: hallaqi  (prj_MnuU0K6uk3nXeBwmEHZMVayhZy51)
#   Supabase ref:   cdwzbtjwqybnahhbhldy  (org: souf)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Canonical IDs (hallaqi only — never hallaqi-*) ---
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-team_9Wfao03YeLV9wamY5Qz0f54A}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_MnuU0K6uk3nXeBwmEHZMVayhZy51}"
VERCEL_PROJECT_NAME="${VERCEL_PROJECT:-hallaqi}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-cdwzbtjwqybnahhbhldy}"
VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://${SUPABASE_PROJECT_REF}.supabase.co}"

# Auto-load local secrets file if present (gitignored).
LOCAL_ENV="${VERCEL_ENV_FILE:-$ROOT/scripts/.env.vercel.local}"
if [[ -f "$LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$LOCAL_ENV" && set +a
fi

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: Missing required env var: $name" >&2
    echo "       Copy scripts/vercel-env.example → scripts/.env.vercel.local and fill values." >&2
    exit 1
  fi
}

jwt_ref() {
  local token="$1"
  python3 - "$token" <<'PY'
import base64, json, sys
token = sys.argv[1]
try:
    payload = token.split(".")[1]
    pad = "=" * (-len(payload) % 4)
    data = json.loads(base64.urlsafe_b64decode(payload + pad).decode())
    print(data.get("ref", ""))
except Exception:
    print("")
PY
}

assert_supabase_jwt() {
  local label="$1"
  local token="$2"
  local ref
  ref="$(jwt_ref "$token")"
  if [[ -z "$ref" ]]; then
    echo "ERROR: $label is not a valid Supabase JWT." >&2
    exit 1
  fi
  if [[ "$ref" != "$SUPABASE_PROJECT_REF" ]]; then
    echo "ERROR: $label belongs to project '$ref', expected '$SUPABASE_PROJECT_REF'." >&2
    echo "       Refuse to sync keys from the wrong Supabase project." >&2
    exit 1
  fi
}

api() {
  curl -sS "$@"
}

remove_all_env() {
  local key="$1"
  echo "  Removing existing entries for $key..."
  RESP="$(api "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN")"
  IDS="$(echo "$RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for e in d.get('envs', []):
    if e.get('key') == '$key':
        print(e['id'])
" 2>/dev/null || true)"
  for ID in $IDS; do
    api -X DELETE \
      "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$ID?teamId=$VERCEL_TEAM_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" >/dev/null
    echo "    removed id=$ID"
  done
}

upsert_env() {
  local key="$1"
  local value="$2"
  local type="${3:-plain}"
  shift 3
  local targets_json
  targets_json="$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1:]))' "$@")"

  remove_all_env "$key"

  python3 - "$key" "$value" "$type" "$targets_json" <<'PY' | api -X POST \
    "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d @-
import json, sys
key, value, typ, targets_json = sys.argv[1:5]
targets = json.loads(targets_json)
print(json.dumps({
    "key": key,
    "value": value,
    "type": typ,
    "target": targets,
}))
PY
  echo "  set $key ($type) → ${targets_json}"
}

echo "==> Hallaqi Vercel env sync"
echo "    project: $VERCEL_PROJECT_NAME ($VERCEL_PROJECT_ID)"
echo "    supabase: $SUPABASE_PROJECT_REF"

require VERCEL_TOKEN
require VITE_SUPABASE_ANON_KEY
require SUPABASE_SERVICE_ROLE_KEY

assert_supabase_jwt "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY"
assert_supabase_jwt "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"

if [[ "$VITE_SUPABASE_URL" != "https://${SUPABASE_PROJECT_REF}.supabase.co" ]]; then
  echo "ERROR: VITE_SUPABASE_URL must be https://${SUPABASE_PROJECT_REF}.supabase.co" >&2
  exit 1
fi

echo ""
echo "==> Supabase (souf / $SUPABASE_PROJECT_REF)"
upsert_env "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" plain production preview development
upsert_env "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" plain production preview development
upsert_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" sensitive production preview development

if [[ -n "${GROQ_API_KEY:-}" ]]; then
  echo ""
  echo "==> AI (Groq)"
  upsert_env "GROQ_API_KEY" "$GROQ_API_KEY" sensitive production preview development
  upsert_env "AI_GENERATION_ENABLED" "true" plain production preview development
fi

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  echo ""
  echo "==> AI (Gemini)"
  upsert_env "GEMINI_API_KEY" "$GEMINI_API_KEY" sensitive production preview development
  upsert_env "GOOGLE_GENERATIVE_AI_API_KEY" "$GEMINI_API_KEY" sensitive production preview development
  upsert_env "AI_GENERATION_ENABLED" "true" plain production preview development
fi

if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  echo ""
  echo "==> Stripe"
  upsert_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" sensitive production preview
fi

if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  upsert_env "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" sensitive production preview
fi

if [[ -n "${VITE_STRIPE_PUBLISHABLE_KEY:-}" ]]; then
  upsert_env "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" plain production preview development
fi

echo ""
echo "==> Done. Redeploy production for changes to take effect:"
echo "    npx vercel deploy --prod --project $VERCEL_PROJECT_NAME"
