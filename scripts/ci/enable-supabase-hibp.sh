#!/usr/bin/env bash
set -euo pipefail

project_id="${SUPABASE_PROJECT_ID:-pvzjiozismyxqrzmtfbi}"
token="$(printf '%s' "${SUPABASE_ACCESS_TOKEN:-}" | tr -d '[:space:]')"
test -n "$token"
echo "::add-mask::$token"
endpoint="https://api.supabase.com/v1/projects/$project_id/config/auth"

current="$(curl --fail --silent --show-error -H "Authorization: Bearer $token" -H 'Content-Type: application/json' "$endpoint")"
before="$(printf '%s' "$current" | jq -r '.password_hibp_enabled // false')"
changed=false

if [ "$before" != "true" ]; then
  updated="$(curl --fail --silent --show-error -X PATCH -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data '{"password_hibp_enabled":true}' "$endpoint")"
  test "$(printf '%s' "$updated" | jq -r '.password_hibp_enabled // false')" = "true"
  changed=true
fi

after="$(curl --fail --silent --show-error -H "Authorization: Bearer $token" -H 'Content-Type: application/json' "$endpoint" | jq -r '.password_hibp_enabled // false')"
test "$after" = "true"
printf 'before=%s\nchanged=%s\nafter=%s\n' "$before" "$changed" "$after"
