# Security Review Checklist

## IAM and Identity

- [ ] Root MFA enabled; root access keys absent.
- [ ] `latex-admin` MFA enabled.
- [ ] Separate OIDC deploy roles for dev/prod.
- [ ] ECS task role is least-privilege for S3, Secrets Manager, DynamoDB.

## Network and Perimeter

- [ ] ALB public, ECS and RDS private subnets only.
- [ ] SG rules: ALB -> ECS, ECS -> RDS only.
- [ ] RDS is not publicly accessible.
- [ ] Optional WAF web ACL attached to ALB.

## Data Protection

- [ ] S3 block public access enabled.
- [ ] S3 and RDS encryption at rest enabled.
- [ ] Secrets in Secrets Manager, not plain env files in repo.
- [ ] RDS backups and PITR verified.

## App Security

- [ ] `NEXTAUTH_SECRET` rotated and high entropy.
- [ ] Session and auth cookies validated under HTTPS.
- [ ] Public share routes are intentionally cacheable; auth routes are not.
- [ ] Upload limits and content validation enforced.

## Observability and Response

- [ ] CloudWatch alarms configured (CPU, unhealthy targets, errors).
- [ ] Access logs retained per policy.
- [ ] Rollback runbook tested.

