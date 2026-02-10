example .env.production:

```
NEXTAUTH_URL="https://my.domain.com"
NEXTAUTH_SECRET="some-thing-secure"
DATABASE_URL=postgresql://tanglepic:tanglepic@db:5432/tanglepic
STORAGE_BACKEND=local
```

example .env.local (dev):

```
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me"
DATABASE_URL=postgresql://tanglepic:tanglepic@localhost:5432/tanglepic
STORAGE_BACKEND=local
```

Storage backends:

- Local (default)
  - `STORAGE_BACKEND=local`
  - Files stored under `data/uploads/...`
- S3
  - `STORAGE_BACKEND=s3`
  - `S3_BUCKET=your-bucket`
  - `S3_REGION=us-east-1`
  - Optional: `S3_ENDPOINT=https://s3.your-provider.com` for S3-compatible storage

DB setup:

```
pnpm db:push
```
