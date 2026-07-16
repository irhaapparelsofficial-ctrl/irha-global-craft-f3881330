#!/usr/bin/env bash
set -euo pipefail

attempts="${1:-}"
delay_seconds="${2:-}"
shift 2 || true

if [[ -z "$attempts" || -z "$delay_seconds" || "${1:-}" != "--" ]]; then
  echo "usage: bash scripts/ci/retry.sh <attempts> <initial-delay-seconds> -- <command> [args...]" >&2
  exit 64
fi
shift

if (( attempts < 1 )); then
  echo "attempts must be at least 1" >&2
  exit 64
fi

attempt=1
while true; do
  echo "[retry] attempt $attempt/$attempts: $*" >&2
  if "$@"; then
    exit 0
  fi

  status=$?
  if (( attempt >= attempts )); then
    echo "[retry] command failed after $attempt attempts (exit $status)" >&2
    exit "$status"
  fi

  sleep_for=$(( delay_seconds * attempt ))
  echo "[retry] transient failure (exit $status); waiting ${sleep_for}s before retry" >&2
  sleep "$sleep_for"
  attempt=$(( attempt + 1 ))
done
