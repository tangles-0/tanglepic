#!/usr/bin/env bash
set -euo pipefail

APP_BASE_URL="${1:-${APP_BASE_URL:-}}"
BOOTSTRAP_TOKEN="${2:-${ADMIN_BOOTSTRAP_TOKEN:-}}"
SESSION_TOKEN="${3:-${NEXTAUTH_SESSION_TOKEN:-}}"
COOKIE_NAME="${NEXTAUTH_COOKIE_NAME:-__Secure-next-auth.session-token}"
CURL_INSECURE="${CURL_INSECURE:-false}"

if [[ -z "$APP_BASE_URL" ]]; then
  echo "Usage: $0 <app-base-url> [bootstrap-token] [nextauth-session-token]" >&2
  echo "Example: $0 https://pics.example.com \"\$ADMIN_BOOTSTRAP_TOKEN\" \"\$NEXTAUTH_SESSION_TOKEN\"" >&2
  exit 1
fi

if [[ -z "$BOOTSTRAP_TOKEN" ]]; then
  echo "Missing bootstrap token. Pass arg #2 or set ADMIN_BOOTSTRAP_TOKEN." >&2
  exit 1
fi

if [[ -z "$SESSION_TOKEN" ]]; then
  echo "Missing session token. Pass arg #3 or set NEXTAUTH_SESSION_TOKEN." >&2
  echo "Tip: copy your NextAuth session cookie value from browser devtools for a logged-in user." >&2
  exit 1
fi

APP_BASE_URL="${APP_BASE_URL%/}"
PROMOTE_URL="${APP_BASE_URL}/promote-admin?token=${BOOTSTRAP_TOKEN}"
COOKIE_HEADER="${COOKIE_NAME}=${SESSION_TOKEN}"
INSECURE_ARGS=()
if [[ "$CURL_INSECURE" == "true" ]]; then
  INSECURE_ARGS=(-k)
  echo "Warning: CURL_INSECURE=true (TLS certificate verification disabled)" >&2
fi

echo "Calling promote-admin on ${APP_BASE_URL}..."
RESPONSE="$(curl -sS -X POST "$PROMOTE_URL" \
  "${INSECURE_ARGS[@]}" \
  -H "Origin: ${APP_BASE_URL}" \
  -H "Cookie: ${COOKIE_HEADER}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

echo "HTTP ${HTTP_CODE}"
echo "$BODY"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Admin promotion succeeded."
  exit 0
fi

if [[ "$HTTP_CODE" == "404" ]]; then
  echo "Got 404. Common causes:" >&2
  echo "- ADMIN_BOOTSTRAP_TOKEN is missing or mismatched in app runtime env" >&2
  echo "- An admin already exists (endpoint intentionally behaves as not found)" >&2
fi

exit 1

