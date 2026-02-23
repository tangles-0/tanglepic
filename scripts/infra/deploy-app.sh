#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"
IMAGE_TAG="${2:-${IMAGE_TAG:-}}"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"
AWS_PROFILE="${AWS_PROFILE:-}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 [dev|prod] [image-tag]" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG="$(git rev-parse --short HEAD)"
fi

resolve_cert_arn() {
  local cert=""
  if [[ "$ENVIRONMENT" == "dev" ]]; then
    cert="${CERT_ARN_DEV:-}"
  else
    cert="${CERT_ARN_PROD:-}"
  fi

  cert="${CERT_ARN:-${CERTIFICATE_ARN:-${ACM_CERTIFICATE_ARN:-${cert}}}}"
  printf "%s" "$cert"
}

CERTIFICATE_ARN="$(resolve_cert_arn)"
if [[ -z "$CERTIFICATE_ARN" ]]; then
  echo "Missing certificate ARN. Set CERT_ARN (or CERT_ARN_DEV/CERT_ARN_PROD)." >&2
  exit 1
fi

PROFILE_ARGS=()
if [[ -n "$AWS_PROFILE" ]]; then
  PROFILE_ARGS=(--profile "$AWS_PROFILE")
fi

ACCOUNT_ID="$(aws sts get-caller-identity "${PROFILE_ARGS[@]}" --query Account --output text 2>/dev/null || true)"
if [[ -z "$ACCOUNT_ID" || "$ACCOUNT_ID" == "None" ]]; then
  echo "Unable to resolve AWS account. Set valid AWS credentials (and optional AWS_PROFILE) first." >&2
  exit 1
fi

if [[ ! -d "$REPO_ROOT/infra/cdk/node_modules" ]]; then
  echo "Installing CDK dependencies..."
  pnpm --dir infra/cdk install
fi

echo "Bootstrapping CDK for env=${ENVIRONMENT}..."
"$REPO_ROOT/scripts/infra/bootstrap-cdk.sh" "$ENVIRONMENT"

echo "Deploying base stacks (network + data)..."
pnpm --dir infra/cdk exec cdk deploy \
  "latex-${ENVIRONMENT}-network" \
  "latex-${ENVIRONMENT}-data" \
  --require-approval never \
  --exclusively \
  -c env="$ENVIRONMENT" \
  -c imageTag="$IMAGE_TAG" \
  -c certificateArn="$CERTIFICATE_ARN"

echo "Building/pushing image tag=${IMAGE_TAG}..."
"$REPO_ROOT/scripts/infra/build-and-push-image.sh" "$ENVIRONMENT" "$IMAGE_TAG"

APP_STACK="latex-${ENVIRONMENT}-app"
if aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --stack-name "$APP_STACK" >/dev/null 2>&1; then
  FIRST_DEPLOY="false"
else
  FIRST_DEPLOY="true"
fi

if [[ "$FIRST_DEPLOY" == "true" ]]; then
  echo "First app deploy detected. Creating ECS service at desiredCount=0 to avoid circuit-breaker loops."
  pnpm --dir infra/cdk exec cdk deploy \
    "$APP_STACK" \
    --require-approval never \
    --exclusively \
    -c env="$ENVIRONMENT" \
    -c imageTag="$IMAGE_TAG" \
    -c certificateArn="$CERTIFICATE_ARN" \
    -c desiredCount=0

fi

echo "Deploying app + observability stacks..."
pnpm --dir infra/cdk exec cdk deploy \
  "latex-${ENVIRONMENT}-app" \
  "latex-${ENVIRONMENT}-observability" \
  --require-approval never \
  --exclusively \
  -c env="$ENVIRONMENT" \
  -c imageTag="$IMAGE_TAG" \
  -c certificateArn="$CERTIFICATE_ARN"

echo "Done. env=${ENVIRONMENT} imageTag=${IMAGE_TAG}"

