#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL}"
: "${APP_BASE_URL:?set APP_BASE_URL}"

echo "Validating core row counts..."
psql "${TARGET_DATABASE_URL}" -c "select 'users' as table, count(*) from users;"
psql "${TARGET_DATABASE_URL}" -c "select 'images' as table, count(*) from images;"
psql "${TARGET_DATABASE_URL}" -c "select 'albums' as table, count(*) from albums;"
psql "${TARGET_DATABASE_URL}" -c "select 'shares' as table, count(*) from shares;"

echo "Checking app health..."
curl -fsSL "${APP_BASE_URL}/" >/dev/null

echo "Validation complete"

