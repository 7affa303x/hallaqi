#!/usr/bin/env bash
# Updates Vercel environment variables for the new Supabase project.
set -euo pipefail

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
TEAM_ID="team_9Wfao03YeLV9wamY5Qz0f54A"
PROJECT_ID="prj_MYHfKm7hpMxRvYFcEKjH64qoR4WE"

if [[ -z "$VERCEL_TOKEN" ]]; then
  echo "ERROR: VERCEL_TOKEN is not set"
  exit 1
fi

# Step 1: Remove ALL env vars matching the key (sensitive ones can only be removed via ID)
remove_all_env() {
  local key="$1"
  echo "  Getting all entries for $key..."
  RESP=$(curl -sS "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN")
  IDS=$(echo "$RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for e in d.get('envs', []):
    if e.get('key') == '$key':
        print(e['id'])
" 2>/dev/null)
  for ID in $IDS; do
    echo "  Removing id=$ID"
    curl -sS -X DELETE "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ID?teamId=$TEAM_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN"
    echo ""
  done
}

echo "==> Step 1: Removing old VITE_SUPABASE_URL"
remove_all_env "VITE_SUPABASE_URL"

echo "==> Step 1b: Removing old VITE_SUPABASE_ANON_KEY"
remove_all_env "VITE_SUPABASE_ANON_KEY"

echo "==> Step 1c: Removing old SUPABASE_SERVICE_ROLE_KEY"
remove_all_env "SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "==> Step 2: Setting new VITE_SUPABASE_URL"
curl -sS -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "VITE_SUPABASE_URL",
    "value": "https://npkmqlupkvijhumkldpm.supabase.co",
    "type": "plain",
    "target": ["production", "preview", "development"]
  }'
echo ""

echo "==> Step 3: Setting new VITE_SUPABASE_ANON_KEY"
curl -sS -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "VITE_SUPABASE_ANON_KEY",
    "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wa21xbHVwa3Zpamh1bWtsZHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjU0MDAsImV4cCI6MjA5OTI0MTQwMH0.8TcARSew4d_UQwKOany8OJIcs69Gqpy2ka7QEPXTK1Q",
    "type": "plain",
    "target": ["production", "preview", "development"]
  }'
echo ""

echo "==> Step 4: Setting new SUPABASE_SERVICE_ROLE_KEY (sensitive, production+preview only)"
curl -sS -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "SUPABASE_SERVICE_ROLE_KEY",
    "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wa21xbHVwa3Zpamh1bWtsZHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2NTQwMCwiZXhwIjoyMDk5MjQxNDAwfQ.Zpjtrurv5QWIr86AdLhDtpCoEZ1BSfFq3CySY2l4fFo",
    "type": "sensitive",
    "target": ["production", "preview"]
  }'
echo ""

echo "==> Done. Redeploy for changes to take effect."
