#!/usr/bin/env bash
set -euo pipefail

# Smoke-compare old Node API vs new Spring Boot API.
#
# Example:
#   OLD_API_BASE="http://localhost:8080/api" \
#   NEW_API_BASE="http://localhost:8081/api" \
#   # or behind nginx: NEW_API_BASE="http://localhost/pm/api"
#   TEST_EMAIL="you@example.com" \
#   TEST_PASSWORD="your-password" \
#   ./scripts/smoke-compare.sh

OLD_API_BASE="${OLD_API_BASE:-http://localhost:8080/api}"
NEW_API_BASE="${NEW_API_BASE:-http://localhost:80/pm/api}"
TEST_EMAIL="${TEST_EMAIL:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"

if [[ -z "${TEST_EMAIL}" || -z "${TEST_PASSWORD}" ]]; then
  echo "TEST_EMAIL and TEST_PASSWORD must be set"
  exit 1
fi

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

login_and_get_token() {
  local base="$1"
  local out="$2"

  local res_file="$tmpdir/${out}.json"
  local http_code
  http_code="$(
    curl -sS -o "$res_file" -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -X POST "${base}/auth/login" \
      -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}"
  )"

  echo "[$base] /auth/login HTTP $http_code"
  if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
    echo "Login failed: $(cat "$res_file")"
    exit 1
  fi

  # token + user.id
  python3 - <<PY
import json,sys
data=json.load(open("$res_file"))
print(data.get("token",""))
print((data.get("user") or {}).get("id"))
PY
}

call_json() {
  local base="$1"
  local path="$2"
  local token="${3:-}"
  local out="$4"

  local url="${base}${path}"
  local res_file="$tmpdir/${out}.json"
  local http_code
  if [[ -n "$token" ]]; then
    http_code="$(
      curl -sS -o "$res_file" -w "%{http_code}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -X GET "$url"
    )"
  else
    http_code="$(
      curl -sS -o "$res_file" -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -X GET "$url"
    )"
  fi

  echo "[$url] HTTP $http_code"
  python3 - <<PY
import json
data=json.load(open("$res_file")) if open("$res_file").read().strip() else {}
print(json.dumps(data, ensure_ascii=False)[:1000])
PY
}

echo "== Old Node API =="
read -r OLD_TOKEN OLD_USER_ID < <(login_and_get_token "$OLD_API_BASE" "old")
echo "== New Spring API =="
read -r NEW_TOKEN NEW_USER_ID < <(login_and_get_token "$NEW_API_BASE" "new")

echo "== healthz =="
curl -sS -o /dev/null -w "OLD healthz HTTP %{http_code}\n" "${OLD_API_BASE}/healthz"
curl -sS -o /dev/null -w "NEW healthz HTTP %{http_code}\n" "${NEW_API_BASE}/healthz"

echo "== auth/me =="
call_json "$OLD_API_BASE" "/auth/me" "$OLD_TOKEN" "old_me"
call_json "$NEW_API_BASE" "/auth/me" "$NEW_TOKEN" "new_me"

echo "== projects (first page) =="
# We only need a light shape check; structure differs during migration (e.g., enrichment fields).
call_json "$OLD_API_BASE" "/projects" "$OLD_TOKEN" "old_projects"
call_json "$NEW_API_BASE" "/projects" "$NEW_TOKEN" "new_projects"

echo "Smoke-compare finished (see printed JSON snippets above)."

