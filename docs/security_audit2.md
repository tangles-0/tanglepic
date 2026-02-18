# 2026 AWS Readiness Security Audit

Scope reviewed:

- Application auth/session flow, API access-control checks, and share/image access paths.
- Cache behavior for authenticated and shared image responses.
- AWS CDK infrastructure and CI/CD IAM role defaults.

## Findings and Changes Applied

### 1) Public share cache invalidation window was too long (**fixed**)

**Risk:** Public share image routes used `Cache-Control: public, max-age=31536000, immutable`. If a share was revoked or an image deleted, edge/browser caches could continue serving content for up to a year.

**Fix:** Reduced public share cache lifetime to a short TTL (`max-age=60`, `s-maxage=60`, `stale-while-revalidate=30`) so removals/privacy changes propagate quickly while still allowing lightweight caching.

### 2) Admin bootstrap endpoint was overly permissive (**fixed**)

**Risk:** `/promote-admin` was a `GET` endpoint that promoted the caller to admin when no admin existed. This made first-admin bootstrap vulnerable to accidental discovery and CSRF-style triggering from a logged-in browser.

**Fixes:**

- Endpoint changed from `GET` to `POST`.
- Bootstrap now requires explicit opt-in via `ALLOW_ADMIN_BOOTSTRAP=true`.
- Bootstrap requires a shared secret token (`ADMIN_BOOTSTRAP_TOKEN`) in the request body.
- Comparison uses constant-time matching (`timingSafeEqual`) to avoid token oracle leaks.
- Endpoint returns 404 when disabled or incorrect, minimizing discovery.

### 3) Login rate-limit key could be spoofed behind proxies (**fixed**)

**Risk:** Login rate limiting trusted the first IP in `X-Forwarded-For`, which may be client-controlled depending on proxy behavior.

**Fix:** Use the most recently appended forwarded hop for the rate-limit key, aligning with reverse-proxy/ALB append semantics.

### 4) Missing baseline HTTP hardening headers (**fixed**)

**Risk:** No global browser hardening headers were configured.

**Fix:** Added standard security headers globally (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) and explicit `no-store` default caching for API routes.

### 5) ECS/ALB production hardening gaps (**fixed**)

**Risk:** Default runtime/network settings left room for stronger defense-in-depth.

**Fixes:**

- ECS container now uses `readonlyRootFilesystem`.
- ALB now enables `dropInvalidHeaderFields`.
- ALB deletion protection is enabled for production.

### 6) CI/CD OIDC role policy too broad on IAM role resources (**partially fixed**)

**Risk:** Deployment role had wide IAM permissions on all resources.

**Fix:** Split IAM-related permissions into a dedicated statement and restricted IAM role resources to `arn:aws:iam::<account>:role/latex-*`.

## Access-control review summary

- Private API routes consistently require authenticated user context and enforce per-user ownership checks before read/write operations.
- Admin routes consistently check both authentication and `admin` group membership.
- Public endpoints remaining unauthenticated are intentional (`/api/health`, public patch-note read endpoints, signup flow when enabled).
- Share retrieval paths enforce share existence and image/share associations before returning data.

## Remaining recommendations (not code-changed in this patch)

1. Add AWS WAF in front of ALB (managed rule groups + rate-based rule).
2. Add ALB access logging with retention policy and alerting on anomalous patterns.
3. Add stricter CI/CD least-privilege scoping per stack/resource where practical.
4. Consider optional share revocation versioning (e.g., URL version nonce) for near-immediate CDN invalidation semantics in fronted CDN setups.
