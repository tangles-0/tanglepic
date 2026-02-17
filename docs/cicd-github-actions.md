# GitHub Actions CD/CD

Two workflows are provided:

- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`

## Required GitHub Secrets

- `AWS_DEPLOY_ROLE_ARN_DEV`
- `AWS_DEPLOY_ROLE_ARN_PROD`

These should point to IAM roles trusted by GitHub OIDC.

## Pipeline Stages

1. Lint and build app.
2. Build and push Docker image to ECR.
3. Deploy CDK stacks with image tag context.
4. Run one-off migration task on ECS.

## Notes

- Prod deploy triggers on version tags (`v*`) or manual dispatch.
- Dev deploy triggers on push to `main`.

