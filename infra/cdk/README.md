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
# Option A (recommended): pass via CDK context
pnpm --dir infra/cdk exec cdk deploy --all -c env=dev -c certificateArn=arn:aws:acm:ap-southeast-2:ACCOUNT:certificate/ID

# Option B: pass via env var (works well with pnpm scripts)
export CERT_ARN=arn:aws:acm:ap-southeast-2:ACCOUNT:certificate/ID
pnpm infra:cdk:deploy:dev
```

For production:

```bash
export CERT_ARN=arn:aws:acm:ap-southeast-2:ACCOUNT:certificate/ID
pnpm infra:cdk:deploy:prod
```

`deploy:dev` and `deploy:prod` target app/runtime stacks only (`latex-<env>-app`, `latex-<env>-observability`) and skip dependency updates via `--exclusively`.

For first deploys or infrastructure changes, use full stack deploy:

```bash
pnpm infra:cdk:deploy:all:dev
pnpm infra:cdk:deploy:all:prod
```

## Required Secret Initialization

After first deploy, set `NEXTAUTH_URL` and ensure `NEXTAUTH_SECRET` exists in:

- `latex-dev/app/runtime`
- `latex-prod/app/runtime`

The ECS task reads DB credentials from the RDS generated secret and image storage from S3.

