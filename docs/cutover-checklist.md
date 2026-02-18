# Production Cutover Checklist

## Preconditions

- `prod` CDK stacks are deployed.
- CI/CD deploy role and workflow are healthy.
- Migration rehearsal succeeded in dev.

## Freeze

- Disable uploads and writes in app admin.
- Pause background jobs if any are added later.
- Announce maintenance window.

## Execute Migration

- Run DB dump from source host.
- Restore to prod RDS.
- Sync uploads to prod S3.
- Run post-import migration command (`pnpm db:migrate:ci`).

## Validate

- API health and login works.
- User/image/albums/share row counts match source.
- Sample image routes return correct bytes.
- App logs and CloudWatch alarms are normal.

## Traffic Shift

- Point DNS to prod ALB.
- Watch 5xx and latency metrics.

## Rollback

- Re-point DNS to prior endpoint.
- Restore prior DB snapshot if needed.
- Restore source upload pointers if a critical mismatch is found.

