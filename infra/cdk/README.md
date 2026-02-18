# Latex CDK Infrastructure

This CDK app defines a per-environment stack set:

- `latex-<env>-network`
- `latex-<env>-data`
- `latex-<env>-app`
- `latex-<env>-observability`

## Usage

```bash
cd infra/cdk
pnpm install
cd ../..
AWS_PROFILE=latex-admin pnpm infra:cdk:bootstrap:dev
pnpm --dir infra/cdk exec cdk deploy --all -c env=dev -c certificateArn=arn:aws:acm:ap-southeast-2:ACCOUNT:certificate/ID
```

For production:

```bash
pnpm deploy:prod
```

## Required Secret Initialization

After first deploy, set `NEXTAUTH_URL` and ensure `NEXTAUTH_SECRET` exists in:

- `latex-dev/app/runtime`
- `latex-prod/app/runtime`

The ECS task reads DB credentials from the RDS generated secret and image storage from S3.

