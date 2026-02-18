# Source Host Migration Runbook

This runbook migrates DB and image files from another Linux machine on your network into AWS dev/prod with no data loss.

## Inputs

- Source host reachable over SSH:
  - `SOURCE_SSH_HOST`
  - `SOURCE_SSH_USER`
  - `SOURCE_APP_DIR` (contains `data/uploads`)
  - `SOURCE_PG_URL` or postgres container details
- Target:
  - `TARGET_DB_URL` (RDS endpoint creds)
  - `TARGET_S3_BUCKET`
  - `AWS_REGION`

## Rehearsal (Dev)

1. Run full DB export from source host.
2. Restore into dev RDS.
3. Sync uploads from source host into dev S3.
4. Verify row counts and sample image retrieval routes.

Use scripts in `scripts/migration/`.

## Production Cutover

1. Announce freeze window and disable writes/uploads.
2. Execute final delta DB export/import.
3. Execute final delta upload sync.
4. Verify:
   - table counts
   - random image checks (original/sm/lg/x640)
5. Shift traffic (DNS/ALB).
6. Keep rollback artifacts:
   - DB dump file
   - upload sync manifest/checksum

## Rollback

- Keep prior app endpoint available until validation passes.
- Re-point DNS and restore DB snapshot if major verification fails.

