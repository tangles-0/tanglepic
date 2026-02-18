#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"
AWS_PROFILE="${AWS_PROFILE:-}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 [dev|prod]" >&2
  exit 1
fi

PROFILE_ARGS=()
if [[ -n "$AWS_PROFILE" ]]; then
  PROFILE_ARGS=(--profile "$AWS_PROFILE")
fi

CLUSTER="latex-${ENVIRONMENT}-cluster"
VPC_NAME="latex-${ENVIRONMENT}-vpc"
APP_SG_NAME="latex-${ENVIRONMENT}-app-sg"
TASK_FAMILY_PREFIX="latex-${ENVIRONMENT}-task"

echo "Resolving latest task definition for ${TASK_FAMILY_PREFIX}..."
TASK_DEF=$(aws ecs list-task-definitions \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --family-prefix "$TASK_FAMILY_PREFIX" \
  --sort DESC \
  --max-items 1 \
  --query 'taskDefinitionArns[0]' \
  --output text)

if [[ -z "$TASK_DEF" || "$TASK_DEF" == "None" ]]; then
  echo "Unable to resolve task definition for ${TASK_FAMILY_PREFIX}" >&2
  exit 1
fi

echo "Resolving VPC/subnets/security group for ${ENVIRONMENT}..."
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --filters "Name=tag:Name,Values=${VPC_NAME}" \
  --query 'Vpcs[0].VpcId' \
  --output text)

if [[ -z "$VPC_ID" || "$VPC_ID" == "None" ]]; then
  echo "Unable to resolve VPC named ${VPC_NAME}" >&2
  exit 1
fi

SUBNETS=$(aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:aws-cdk:subnet-name,Values=private-egress" \
  --query 'Subnets[].SubnetId' \
  --output text | sed 's/[[:space:]]\+/,/g')

if [[ -z "$SUBNETS" ]]; then
  echo "Unable to resolve private-egress subnets in ${VPC_ID}" >&2
  exit 1
fi

SG_ID=$(aws ec2 describe-security-groups \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --filters "Name=group-name,Values=${APP_SG_NAME}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  echo "Unable to resolve security group ${APP_SG_NAME}" >&2
  exit 1
fi

echo "Starting one-off migration task in ${CLUSTER}..."
TASK_ARN=$(aws ecs run-task \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --cluster "$CLUSTER" \
  --launch-type FARGATE \
  --task-definition "$TASK_DEF" \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"LatexContainer","command":["pnpm","db:push"]}]}' \
  --query 'tasks[0].taskArn' \
  --output text)

if [[ -z "$TASK_ARN" || "$TASK_ARN" == "None" ]]; then
  echo "Failed to start one-off migration task." >&2
  exit 1
fi

echo "Waiting for task to stop: ${TASK_ARN}"
aws ecs wait tasks-stopped \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN"

EXIT_CODE=$(aws ecs describe-tasks \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[?name==`LatexContainer`].exitCode | [0]' \
  --output text)

STOPPED_REASON=$(aws ecs describe-tasks \
  --region "$AWS_REGION" \
  "${PROFILE_ARGS[@]}" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].stoppedReason' \
  --output text)

echo "Task stopped. exitCode=${EXIT_CODE} reason='${STOPPED_REASON}'"

if [[ "$EXIT_CODE" != "0" ]]; then
  echo "db:push failed in ECS task ${TASK_ARN}" >&2
  exit 1
fi

echo "db:push completed successfully for ${ENVIRONMENT}."

