#!/bin/sh
set -e

attempt=1
max_attempts=15

if [ "${RUN_DB_MIGRATIONS_ON_STARTUP:-false}" = "true" ]; then
  until pnpm db:push-cmd; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "db:push-cmd failed after $max_attempts attempts" >&2
      exit 1
    fi
    echo "db:push-cmd failed, retrying in 3s... ($attempt/$max_attempts)" >&2
    attempt=$((attempt + 1))
    sleep 3
  done
else
  echo "Skipping DB migration on startup (RUN_DB_MIGRATIONS_ON_STARTUP!=true)"
fi

exec node server.js

