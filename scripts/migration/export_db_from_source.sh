#!/usr/bin/env bash
set -euo pipefail

: "${SOURCE_SSH_HOST:?set SOURCE_SSH_HOST}"
: "${SOURCE_SSH_USER:?set SOURCE_SSH_USER}"
: "${SOURCE_DATABASE_URL:?set SOURCE_DATABASE_URL}"
: "${DUMP_OUTPUT_DIR:=./migration-artifacts}"

mkdir -p "$DUMP_OUTPUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${DUMP_OUTPUT_DIR}/latex-${STAMP}.dump"

ssh "${SOURCE_SSH_USER}@${SOURCE_SSH_HOST}" \
  "pg_dump --format=custom --no-owner --no-privileges \"${SOURCE_DATABASE_URL}\"" > "$DUMP_FILE"

echo "Wrote ${DUMP_FILE}"

