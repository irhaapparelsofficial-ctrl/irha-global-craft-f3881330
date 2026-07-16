#!/usr/bin/env bash
set -euo pipefail

project_id="${SUPABASE_PROJECT_ID:-pvzjiozismyxqrzmtfbi}"
token="$(printf '%s' "${SUPABASE_ACCESS_TOKEN:-}" | tr -d '[:space:]')"
test -n "$token"
echo "::add-mask::$token"
endpoint="https://api.supabase.com/v1/projects/$project_id/config/auth"

api_call() {
  method="$1"
  payload="${2:-}"
  body_file="$(mktemp)"
  if [ -n "$payload" ]; then
    status="$(curl --silent --show-error --output "$body_file" --write-out '%{http_code}' \
      -X "$method" \
      -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' \
      --data "$payload" \
      "$endpoint")"
  else
    status="$(curl --silent --show-error --output "$body_file" --write-out '%{http_code}' \
      -X "$method" \
      -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' \
      "$endpoint")"
  fi

  if [[ ! "$status" =~ ^2 ]]; then
    safe_message="$(jq -r '.message // .error // .msg // "Management API request failed"' "$body_file" 2>/dev/null | head -c 500 || true)"
    rm -f "$body_file"
    if [ "$status" = "402" ] && [[ "$safe_message" == *"Pro Plans and up"* ]]; then
      jq -cn --arg message "$safe_message" '{_plan_limited:true,message:$message}'
      return 0
    fi
    printf 'Supabase Auth Management API %s failed with HTTP %s: %s\n' "$method" "$status" "$safe_message" >&2
    return 1
  fi

  cat "$body_file"
  rm -f "$body_file"
}

current="$(api_call GET)"
before="$(printf '%s' "$current" | jq -r '.password_hibp_enabled // false')"
changed=false
plan_limited=false

if [ "$before" != "true" ]; then
  updated="$(api_call PATCH '{"password_hibp_enabled":true}')"
  plan_limited="$(printf '%s' "$updated" | jq -r '._plan_limited // false')"
  if [ "$plan_limited" = "true" ]; then
    message="$(printf '%s' "$updated" | jq -r '.message // "Feature requires a paid plan"')"
    printf 'Supabase leaked-password protection is unavailable on the current plan: %s\n' "$message" >&2
    printf 'before=%s\nchanged=false\nafter=false\nplan_limited=true\n' "$before"
    exit 0
  fi

  returned="$(printf '%s' "$updated" | jq -r '.password_hibp_enabled // false')"
  if [ "$returned" != "true" ]; then
    echo "Supabase Auth Management API accepted the PATCH but did not return password_hibp_enabled=true" >&2
    exit 1
  fi
  changed=true
fi

after="$(api_call GET | jq -r '.password_hibp_enabled // false')"
if [ "$after" != "true" ]; then
  echo "Supabase leaked-password protection remains disabled after verification GET" >&2
  exit 1
fi

printf 'before=%s\nchanged=%s\nafter=%s\nplan_limited=false\n' "$before" "$changed" "$after"
