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

if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG="$(git rev-parse --short HEAD)"
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

REPOSITORY="latex-${ENVIRONMENT}-app"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${REPOSITORY}:${IMAGE_TAG}"

echo "Checking ECR repository: ${REPOSITORY}"
if ! aws ecr describe-repositories \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --repository-names "$REPOSITORY" >/dev/null 2>&1; then
  echo "ECR repository ${REPOSITORY} was not found in ${AWS_REGION}." >&2
  echo "Run full infra deploy first: pnpm infra:cdk:deploy:all:${ENVIRONMENT}" >&2
  exit 1
fi

echo "Logging into ECR registry: ${REGISTRY}"
aws ecr get-login-password --region "$AWS_REGION" "${PROFILE_ARGS[@]}" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "Building Docker image: ${REPOSITORY}:${IMAGE_TAG}"
docker build -f Dockerfile -t "${REPOSITORY}:${IMAGE_TAG}" .

echo "Tagging image: ${IMAGE_URI}"
docker tag "${REPOSITORY}:${IMAGE_TAG}" "$IMAGE_URI"

echo "Pushing image: ${IMAGE_URI}"
docker push "$IMAGE_URI"

echo "Pushed image tag '${IMAGE_TAG}' to ${IMAGE_URI}"
echo "Deploy with: pnpm --dir infra/cdk exec cdk deploy latex-${ENVIRONMENT}-app --exclusively -c env=${ENVIRONMENT} -c imageTag=${IMAGE_TAG}"

