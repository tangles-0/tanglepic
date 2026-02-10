#!/bin/sh
set -e

attempt=1
max_attempts=15
until pnpm db:push-cmd; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "db:push-cmd failed after $max_attempts attempts" >&2
    exit 1
  fi
  echo "db:push-cmd failed, retrying in 3s... ($attempt/$max_attempts)" >&2
  attempt=$((attempt + 1))
  sleep 3
done

exec node server.js

