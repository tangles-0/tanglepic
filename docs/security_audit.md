# Security audit (application + AWS deployment)

Date: 2026-02-18

## Scope reviewed

- Authentication/session handling, API authorization boundaries, and share-link access semantics.
- Image and album sharing paths (including caching behavior and revocation semantics).
- Admin/bootstrap flows.
- AWS CDK infrastructure and CI/CD IAM posture.

## High-risk findings

### 1) Overly broad CI/CD deploy permissions in OIDC role

`infra/cdk/lib/cicd-stack.ts` grants wildcard `*` actions for multiple services and `resources: ["*"]` to GitHub OIDC deploy roles.

**Risk:** If GitHub workflow context is compromised (repo write/token compromise/misconfigured workflow), attacker receives effectively account-wide infra mutation capabilities.

**Recommendation:**

- Replace broad wildcard policy with least-privilege, environment-scoped permissions.
- Split permissions into separate deploy steps/roles (e.g., CloudFormation execution role + artifact push role).
- Add `aws:RequestedRegion`, resource-tag conditions, and explicit deny guardrails for sensitive IAM/KMS operations.

## Medium-risk findings

### 2) Public share cache TTL previously too long for revocation/privacy expectations

Share image routes had a 1-year immutable cache. That can cause shared URLs to remain effectively accessible from browser/CDN cache after share disable/delete operations.

**Fix applied in this patch:**

- Reduced cache policy for public share image responses to short-lived cache:
  - `public, max-age=60, s-maxage=60, stale-while-revalidate=30`

This limits post-revocation exposure window while preserving basic caching performance.

### 3) Bootstrap admin promotion endpoint uses GET and has side effects

`/promote-admin` promotes the current authenticated user when no admin exists and is callable with `GET`.

**Risk:** State-changing GET endpoint increases accidental trigger/csrf-style risk and complicates hardening.

**Recommendation:**

- Switch to `POST` only.
- Enforce same-origin checks and require a one-time bootstrap token or explicit environment-gated setup mode.
- Disable endpoint automatically after first successful promotion.

### 4) In-memory upload rate-limit state is per-task and non-distributed

`src/app/api/images/route.ts` uses a process-local `Map` rate limiter for upload throughput.

**Risk:** In multi-task ECS deployment, limits can be bypassed by request distribution across tasks; restarts reset counters.

**Recommendation:**

- Move upload throttling to DynamoDB-backed limiter (consistent with login limiter strategy).
- Add IP + user composite keys and instrumentation/alerts for abuse spikes.

## Low-risk / hardening opportunities

### 5) Security headers baseline can be stronger

Global HTTP hardening headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors) are not centrally configured in `next.config.ts`.

**Recommendation:**

- Add strict response headers at ALB/app layer; include HSTS in production domains.

### 6) Container build image could be hardened further

The runtime image is non-root (good), but additional hardening is possible:

- pin base image digest,
- include image vulnerability scanning in CI,
- minimize runtime dependencies copied into final image.

## Positive controls observed

- Per-user checks are consistently applied in core private image/album APIs.
- Private image route sets `Cache-Control: private, no-store` and `Vary` protections.
- S3 bucket blocks public access and enforces SSL.
- RDS encryption, backups, isolated subnets, and production deletion protection are enabled.

## Follow-up checklist

1. Refactor CI/CD IAM permissions to least privilege.
2. Convert `/promote-admin` to a one-time secure bootstrap flow.
3. Replace upload in-memory rate limiting with distributed limiter.
4. Introduce global production security headers and validate with integration tests.