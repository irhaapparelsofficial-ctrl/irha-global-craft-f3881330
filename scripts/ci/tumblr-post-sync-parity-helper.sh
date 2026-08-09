#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID='pvzjiozismyxqrzmtfbi'
EXPECTED_MAIN_SHA='77555db961edcb621ed921a3e0d333a12cb7addb'
PARITY_REFRESH_FILE='supabase/reconciliation/sec-m03-parity-refresh.json'
HELPER_WORKFLOW='.github/workflows/tumblr-post-sync-parity-helper.yml'
HELPER_SCRIPT='scripts/ci/tumblr-post-sync-parity-helper.sh'
export SUPABASE_PROJECT_ID="$PROJECT_ID"

token="$(printf '%s' "${SUPABASE_ACCESS_TOKEN:-}" | tr -d '[:space:]')"
test -n "$token"
echo "::add-mask::$token"

latest_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq '.sha')"
test "$latest_main" = "$EXPECTED_MAIN_SHA"
test "$(git merge-base HEAD origin/main)" = "$EXPECTED_MAIN_SHA"

python - <<'PY'
from pathlib import Path
path = Path('.github/workflows/supabase-functions-reconcile.yml')
source = path.read_text()
old = '''          test "$(jq '.functions | length' "$PARITY_REFRESH_FILE")" = "5"

          jq -r '.functions[].name' "$PLAN_FILE" | sort -u > /tmp/planned-functions.txt
          test "$(wc -l < /tmp/planned-functions.txt | tr -d ' ')" = "3"
          printf '%s\\n' generate-mockup live-chat notification-dispatcher public-lead-gateway site-visitor | sort > /tmp/approved-parity-refresh.txt
          jq -r '.functions[].name' "$PARITY_REFRESH_FILE" | sort -u > /tmp/planned-parity-refresh.txt
          cmp -s /tmp/approved-parity-refresh.txt /tmp/planned-parity-refresh.txt
'''
new = '''          parity_refresh_count="$(jq '.functions | length' "$PARITY_REFRESH_FILE")"
          test "$parity_refresh_count" -ge 1

          jq -r '.functions[].name' "$PLAN_FILE" | sort -u > /tmp/planned-functions.txt
          test "$(wc -l < /tmp/planned-functions.txt | tr -d ' ')" = "3"
          jq -r '.functions[].name' "$PARITY_REFRESH_FILE" | sort -u > /tmp/planned-parity-refresh.txt
          test "$(wc -l < /tmp/planned-parity-refresh.txt | tr -d ' ')" = "$parity_refresh_count"
'''
if old not in source:
    raise SystemExit('stale parity-refresh allowlist block not found exactly')
source = source.replace(old, new, 1)
old_loop = '''          while IFS=$'\\t' read -r function_name registry source_path; do
            test -n "$function_name"
            test -f "$registry"
            test -f "$source_path"
            ! grep -Fqx "$function_name" /tmp/blocked-functions.txt
          done < <(jq -r '.functions[] | [.name, .registry, .repository_source] | @tsv' "$PARITY_REFRESH_FILE")
'''
new_loop = '''          while IFS=$'\\t' read -r function_name registry source_path; do
            test -n "$function_name"
            case "$registry" in
              supabase/deployment-parity/functions-f1.json|supabase/deployment-parity/functions-f2.json) ;;
              *) echo "::error title=Invalid parity refresh registry::$function_name targets $registry"; exit 1 ;;
            esac
            test "$source_path" = "supabase/functions/$function_name/index.ts"
            test -f "$registry"
            test -f "$source_path"
            grep -Fqx "[functions.$function_name]" supabase/config.toml
            ! grep -Fqx "$function_name" /tmp/blocked-functions.txt
          done < <(jq -r '.functions[] | [.name, .registry, .repository_source] | @tsv' "$PARITY_REFRESH_FILE")
'''
if old_loop not in source:
    raise SystemExit('parity-refresh validation loop not found exactly')
path.write_text(source.replace(old_loop, new_loop, 1))
PY

project_json="$(curl --retry 3 --retry-all-errors -fsS \
  -H "Authorization: Bearer $token" \
  "https://api.supabase.com/v1/projects/$PROJECT_ID")"
test "$(printf '%s' "$project_json" | jq -r '.id // empty')" = "$PROJECT_ID"

curl --retry 3 --retry-all-errors -fsS \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  "https://api.supabase.com/v1/projects/$PROJECT_ID/functions" \
  -o /tmp/functions-after.raw.json
jq -e 'type == "array" and all(.[]; ((.name // .slug) | type == "string") and (.version | type == "number"))' /tmp/functions-after.raw.json >/dev/null
jq -S . /tmp/functions-after.raw.json > /tmp/functions-after.json

SUPABASE_ACCESS_TOKEN="$token" \
SEC_M03_PARITY_REFRESH_PLAN="$PARITY_REFRESH_FILE" \
SEC_M03_LIVE_FUNCTION_DIRECTORY=/tmp/sec-m03-live-functions \
  node scripts/ci/fetch-supabase-edge-sources.mjs

SEC_M03_PARITY_REFRESH_PLAN="$PARITY_REFRESH_FILE" \
SEC_M03_LIVE_FUNCTION_DIRECTORY=/tmp/sec-m03-live-functions \
SEC_M03_SOURCE_EVIDENCE=/tmp/sec-m03-deployed-source-evidence.json \
SOURCE_SHA="$EXPECTED_MAIN_SHA" \
  node scripts/ci/verify-sec-m03-deployed-sources.mjs

SEC_M03_PARITY_REFRESH_PLAN="$PARITY_REFRESH_FILE" \
SEC_M03_LIVE_INVENTORY=/tmp/functions-after.json \
SEC_M03_REGISTRY_EVIDENCE=/tmp/sec-m03-registry-refresh-evidence.json \
SOURCE_SHA="$EXPECTED_MAIN_SHA" \
  node scripts/ci/refresh-sec-m03-live-parity.mjs

npx --yes supabase@2.39.2 gen types typescript \
  --project-id "$PROJECT_ID" \
  --schema public > /tmp/supabase-types.ts
test -s /tmp/supabase-types.ts
! grep -E '(sb_secret_|service_role[^A-Za-z0-9]|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})' /tmp/supabase-types.ts
node scripts/ci/verify-supabase-type-supplement.mjs /tmp/supabase-types.ts
diff -u src/integrations/supabase/types.ts /tmp/supabase-types.ts

SUPABASE_ACCESS_TOKEN="$token" node scripts/ci/run-sec-m03-parity-generation.mjs
SUPABASE_ACCESS_TOKEN="$token" node scripts/verify-supabase-parity.mjs

rm "$HELPER_WORKFLOW" "$HELPER_SCRIPT"
git diff --check

allowed='^(.github/workflows/supabase-functions-reconcile\.yml|supabase/reconciliation/sec-m03-parity-refresh\.json|supabase/deployment-parity/functions-f1\.json|supabase/deployment-parity/functions-f2\.json|supabase/deployment-parity/manifest\.json|supabase/deployment-parity/migration-provenance\.json|.github/workflows/tumblr-post-sync-parity-helper\.yml|scripts/ci/tumblr-post-sync-parity-helper\.sh)$'
unexpected="$(git diff --name-only | grep -Ev "$allowed" || true)"
test -z "$unexpected" || { printf 'Unexpected generated files:\n%s\n' "$unexpected"; exit 1; }

latest_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq '.sha')"
test "$latest_main" = "$EXPECTED_MAIN_SHA"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
test -n "$(git diff --cached --name-only)"
git commit -m 'fix(parity): refresh post-sync Tumblr bundle evidence'
git push origin "HEAD:${GITHUB_REF_NAME}"
