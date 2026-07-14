#!/usr/bin/env bash
set -euo pipefail

EXPECTED_RELEASE_SHA="2074554cd76dc3024bb6a68634363008e5366965"
ZONE_NAME="irhaapparels.com"
WWW_NAME="www.irhaapparels.com"
PAGES_TARGET="irha-apparels.pages.dev"
PAGES_URL="https://irha-apparels.pages.dev"

token="$(printf '%s' "${CLOUDFLARE_API_TOKEN:-}" | tr -d '[:space:]')"
account_id="$(printf '%s' "${CLOUDFLARE_ACCOUNT_ID:-}" | tr -d '[:space:]')"
project_name="$(printf '%s' "${CLOUDFLARE_PROJECT_NAME:-}" | tr -d '[:space:]')"
test -n "$token"
[[ "$account_id" =~ ^[0-9a-fA-F]{32}$ ]]
test -n "$project_name"
echo "::add-mask::$token"
echo "::add-mask::$account_id"

verify_json="$(curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' https://api.cloudflare.com/client/v4/user/tokens/verify)"
test "$(printf '%s' "$verify_json" | jq -r '.success // false')" = true

project_url="https://api.cloudflare.com/client/v4/accounts/$account_id/pages/projects/$project_name"
project_json="$(curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' "$project_url")"
test "$(printf '%s' "$project_json" | jq -r '.success // false')" = true
test "$(printf '%s' "$project_json" | jq -r '.result.name // empty')" = "$project_name"
test "$(printf '%s' "$project_json" | jq -r '.result.production_branch // empty')" = main
printf '%s' "$project_json" | jq -e --arg default "$PAGES_TARGET" --arg apex "$ZONE_NAME" --arg www "$WWW_NAME" \
  'all((.result.domains // [])[]; . == $default or . == $apex or . == $www)' >/dev/null

bust="${EXPECTED_RELEASE_SHA::12}-$(date +%s)"
curl -fsS --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' "$PAGES_URL/build.json?preflight=$bust" -o /tmp/pages-build.json
curl -fsS --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' "$PAGES_URL/cloudflare-deployment.json?preflight=$bust" -o /tmp/pages-deployment.json
jq -e --arg sha "$EXPECTED_RELEASE_SHA" --arg repo "$GITHUB_REPOSITORY" --arg supabase pvzjiozismyxqrzmtfbi \
  '.source_commit == $sha and .source_identity_state == "verified" and .repository == $repo and .supabase_project_id == $supabase' \
  /tmp/pages-build.json >/dev/null
jq -e --arg sha "$EXPECTED_RELEASE_SHA" --arg repo "$GITHUB_REPOSITORY" \
  '.source_sha == $sha and .repository == $repo and .branch == "main"' \
  /tmp/pages-deployment.json >/dev/null

zones_json="$(curl -fsS -G -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  --data-urlencode "name=$ZONE_NAME" --data-urlencode "account.id=$account_id" \
  --data-urlencode 'status=active' --data-urlencode 'per_page=10' https://api.cloudflare.com/client/v4/zones)"
test "$(printf '%s' "$zones_json" | jq -r '.success // false')" = true
test "$(printf '%s' "$zones_json" | jq -r '.result | length')" = 1
zone_id="$(printf '%s' "$zones_json" | jq -r '.result[0].id')"
echo "::add-mask::$zone_id"

records_json="$(curl -fsS -G -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  --data-urlencode 'per_page=100' "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records")"
test "$(printf '%s' "$records_json" | jq -r '.success // false')" = true
printf '%s' "$records_json" | jq --arg apex "$ZONE_NAME" --arg www "$WWW_NAME" \
  '[.result[] | select((.name == $apex or .name == $www) and .type == "CNAME") | {id,type,name,content,proxied,ttl,comment}] | sort_by(.name)' \
  > /tmp/original-web-cnames.json
jq -e --arg old cname.lovable.app --arg pages "$PAGES_TARGET" \
  'length == 2 and all(.[]; (.content == $old or .content == $pages) and .proxied == true)' \
  /tmp/original-web-cnames.json >/dev/null

jq -n \
  --arg expected_release_sha "$EXPECTED_RELEASE_SHA" \
  --arg account_id "$account_id" \
  --arg project_name "$project_name" \
  --arg zone_id "$zone_id" \
  --argjson initial_domains "$(printf '%s' "$project_json" | jq -c '.result.domains // []')" \
  --slurpfile records /tmp/original-web-cnames.json \
  '{expected_release_sha:$expected_release_sha,account_id:$account_id,project_name:$project_name,zone_id:$zone_id,initial_domains:$initial_domains,original_web_cnames:$records[0],created_at:(now|todateiso8601)}' \
  > /tmp/cloudflare-domain-cutover-backup-private.json

echo 'Cloudflare preflight and rollback checkpoint complete; no mutation performed.'
