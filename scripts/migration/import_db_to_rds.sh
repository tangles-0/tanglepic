#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL}"
: "${DUMP_FILE:?set DUMP_FILE}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "${TARGET_DATABASE_URL}" \
  "$DUMP_FILE"

echo "Restore complete"

