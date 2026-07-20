#!/usr/bin/env bash
# Generate and sync VAPID keys for Hallaqi Web Push.
#
# VAPID is split across two places (by design):
#   Vercel  → VITE_VAPID_PUBLIC_KEY   (browser subscribe)
#   Supabase → VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (send-notification edge fn)
#
# Usage:
#   export VERCEL_TOKEN=... SUPABASE_ACCESS_TOKEN=...
#   ./scripts/setup-vapid.sh              # generate new keys + sync
#   ./scripts/setup-vapid.sh --sync-only  # sync existing keys from scripts/.env.vercel.local
#
# Never commit private keys. Add to scripts/.env.vercel.local (gitignored).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SYNC_ONLY=false
if [[ "${1:-}" == "--sync-only" ]]; then
  SYNC_ONLY=true
fi

LOCAL_ENV="${VERCEL_ENV_FILE:-$ROOT/scripts/.env.vercel.local}"
if [[ -f "$LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$LOCAL_ENV" && set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-cdwzbtjwqybnahhbhldy}"
VERCEL_PROJECT="${VERCEL_PROJECT:-hallaqi}"
VAPID_SUBJECT="${VAPID_SUBJECT:-mailto:support@hallaqi.app}"

require() {
  [[ -n "${!1:-}" ]] || { echo "ERROR: Missing $1" >&2; exit 1; }
}

if [[ "$SYNC_ONLY" == false ]]; then
  echo "==> Generating VAPID key pair"
  KEYS_JSON="$(npx --yes web-push@3.6.7 generate-vapid-keys --json)"
  VAPID_PUBLIC_KEY="$(echo "$KEYS_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["publicKey"])')"
  VAPID_PRIVATE_KEY="$(echo "$KEYS_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["privateKey"])')"
  VITE_VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY"
  echo "    public:  ${VAPID_PUBLIC_KEY:0:20}..."
  echo ""
  echo "    Save these in scripts/.env.vercel.local:"
  echo "      VAPID_SUBJECT=$VAPID_SUBJECT"
  echo "      VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY"
  echo "      VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY"
  echo "      VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY"
  echo ""
else
  require VAPID_PUBLIC_KEY
  require VAPID_PRIVATE_KEY
  VITE_VAPID_PUBLIC_KEY="${VITE_VAPID_PUBLIC_KEY:-$VAPID_PUBLIC_KEY}"
fi

require SUPABASE_ACCESS_TOKEN
require VERCEL_TOKEN

echo "==> Supabase secrets ($PROJECT_REF)"
export SUPABASE_ACCESS_TOKEN
npx supabase secrets set \
  "VAPID_SUBJECT=$VAPID_SUBJECT" \
  "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY" \
  "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY" \
  --project-ref "$PROJECT_REF"

echo "==> Deploy send-notification"
npx supabase functions deploy send-notification --project-ref "$PROJECT_REF" --no-verify-jwt

echo "==> Vercel env ($VERCEL_PROJECT)"
for env in production preview development; do
  printf '%s' "$VITE_VAPID_PUBLIC_KEY" | npx vercel@56.3.2 env add VITE_VAPID_PUBLIC_KEY "$env" \
    --force --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" --yes 2>/dev/null \
    || printf '%s' "$VITE_VAPID_PUBLIC_KEY" | npx vercel@56.3.2 env add VITE_VAPID_PUBLIC_KEY "$env" \
      --token "$VERCEL_TOKEN" --project "$VERCEL_PROJECT" --yes
done

echo ""
echo "==> Done. Redeploy production for the public key to ship in the build:"
echo "    npx vercel deploy --prod --project $VERCEL_PROJECT --token \$VERCEL_TOKEN"
