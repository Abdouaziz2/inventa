# Security Policy

## Secrets

Never commit production secrets to this repository. Keep these values only in Vercel Environment Variables and local ignored `.env` files:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

If a secret is exposed, rotate it immediately in Supabase or Vercel, redeploy the app, and invalidate any affected sessions.

`SUPABASE_STORAGE_BUCKET` is not secret, but its bucket policy must be reviewed before production use.

## Production Checklist

- Set all required variables from `PRODUCTION_ENV.md`.
- Keep `ALLOW_DEFAULT_ADMIN_SEED=false` in production.
- Use Supabase Transaction Pooler for `DATABASE_URL`.
- Store uploaded logos and jewelry photos in Supabase Storage, not Vercel temporary disk.
- Restrict `CORS_ORIGIN` to the deployed app domain.
- Use a unique `JWT_SECRET` of at least 32 characters.

## Reporting

Report security issues privately to the project owner. Do not open a public issue containing secrets, database URLs, screenshots of keys, or exploit details.
