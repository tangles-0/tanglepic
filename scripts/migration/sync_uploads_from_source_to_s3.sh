#!/usr/bin/env bash
set -euo pipefail

: "${SOURCE_SSH_HOST:?set SOURCE_SSH_HOST}"
: "${SOURCE_SSH_USER:?set SOURCE_SSH_USER}"
: "${SOURCE_UPLOADS_DIR:?set SOURCE_UPLOADS_DIR}"
: "${TARGET_S3_BUCKET:?set TARGET_S3_BUCKET}"
: "${AWS_REGION:?set AWS_REGION}"
: "${LOCAL_STAGING_DIR:=./migration-artifacts/uploads}"

mkdir -p "$LOCAL_STAGING_DIR"

rsync -avz --delete \
  "${SOURCE_SSH_USER}@${SOURCE_SSH_HOST}:${SOURCE_UPLOADS_DIR}/" \
  "${LOCAL_STAGING_DIR}/"

aws s3 sync "${LOCAL_STAGING_DIR}/" "s3://${TARGET_S3_BUCKET}/uploads/" \
  --region "${AWS_REGION}" \
  --delete

echo "Upload sync complete"

