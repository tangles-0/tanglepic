#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"
REGION="${AWS_REGION:-ap-southeast-2}"

PROFILE_ARGS=()
if [ -n "${AWS_PROFILE:-}" ]; then
  PROFILE_ARGS=(--profile "${AWS_PROFILE}")
fi

ACCOUNT_ID="$(aws sts get-caller-identity "${PROFILE_ARGS[@]}" --query Account --output text 2>/dev/null || true)"
if [ -z "${ACCOUNT_ID}" ] || [ "${ACCOUNT_ID}" = "None" ]; then
  echo "Unable to resolve AWS account. Set valid AWS credentials (and optional AWS_PROFILE) first." >&2
  exit 1
fi

echo "Bootstrapping env=${ENVIRONMENT} account=${ACCOUNT_ID} region=${REGION}"
pnpm --dir infra/cdk exec cdk bootstrap "aws://${ACCOUNT_ID}/${REGION}" -c env="${ENVIRONMENT}" "${PROFILE_ARGS[@]}"

