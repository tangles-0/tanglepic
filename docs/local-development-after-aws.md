# Local Development After AWS Rollout

You can keep fast local development while deploying to AWS.

## Default Local Mode

- `docker compose up -d`
- local Postgres + local disk storage under `data/uploads`
- `RUN_DB_MIGRATIONS_ON_STARTUP=true`

## Cloud-Integrated Local Mode

- App runs locally, but points to dev AWS services:
  - set `STORAGE_BACKEND=s3`
  - set `S3_BUCKET`, `S3_REGION`
  - set `PG*` or `DATABASE_URL` for dev RDS
  - set `RATE_LIMIT_BACKEND=dynamodb` and `RATE_LIMIT_TABLE`
- keep `RUN_DB_MIGRATIONS_ON_STARTUP=false`

## Safety Guardrails

- Never point local mode at prod resources.
- Use separate dev credentials/profile for local cloud-integrated runs.
- Keep local `.env.local` uncommitted.

