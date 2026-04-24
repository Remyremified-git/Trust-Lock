# Aiven + Vercel Database Setup (Trust Lock)

This project is already configured for PostgreSQL via Prisma.  
To connect production auth, wallet linking, and dashboard data, point environment variables to your Aiven PostgreSQL service.

## 1. Create PostgreSQL service in Aiven

1. In Aiven Console, create a **PostgreSQL** service.
2. Open the service and copy the **connection URI**.
3. Ensure SSL/TLS is enabled (Aiven URIs typically require `sslmode=require`).

Example format:

```bash
postgresql://avnadmin:<PASSWORD>@<HOST>:<PORT>/defaultdb?sslmode=require
```

## 2. Configure local environment

In your local `.env`:

```bash
DATABASE_URL="postgresql://avnadmin:<PASSWORD>@<HOST>:<PORT>/defaultdb?sslmode=require"
APP_BASE_URL="http://localhost:3000"
```

Notes:

- App also supports fallback env names: `AIVEN_DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`.
- `DATABASE_URL` is still the recommended primary variable.

## 3. Initialize schema on Aiven

Run from project root:

```bash
npm install
npm run prisma:generate
npm run db:push
```

This creates/updates all required tables for:

- auth/session
- linked wallet accounts
- user security data
- debit card + transactions
- support/issues

## 4. Configure Vercel environment variables

In Vercel Project -> **Settings -> Environment Variables**, add:

- `DATABASE_URL` (Aiven URI with `sslmode=require`)
- `APP_BASE_URL` (your Vercel URL or custom domain)
- `AUTH_SESSION_SECRET`
- `ADMIN_VAULT_AT_REST_KEY`
- `AUTH_DATA_AT_REST_KEY`
- `ADMIN_API_TOKEN`
- `ADMIN_SEED_PUBLIC_KEY_PEM`
- `ADMIN_SEED_PRIVATE_KEY_PEM`
- `AUTH_SESSION_TTL_DAYS`
- `AUTH_REQUIRE_VERIFIED_EMAIL`
- `SMTP_*` and `MAIL_FROM` (if email flows enabled)
- `WEBAUTHN_RP_*` (if passkeys enabled)

## 5. Deploy to Vercel

1. Push code to GitHub (`Trust-Lock`).
2. In Vercel, import/select the same repo.
3. Set root directory to repository root (this project).
4. Deploy.

Build command:

```bash
npm run build
```

## 6. Post-deploy verification

1. Open site and trigger wallet modal auth signup/signin.
2. Confirm signup succeeds (no DB config error).
3. Confirm selected wallet appears as a dashboard wallet tab.
4. Confirm adding another wallet creates a new tab and persists after refresh.

## 7. Common error fixes

### "Server configuration missing database connection"

- Ensure `DATABASE_URL` exists in Vercel env vars.
- Redeploy after saving env vars.

### Prisma connection/auth error

- Verify Aiven credentials, host, port, and database name.
- Confirm URI includes `sslmode=require`.
- Check Aiven service is running and accessible.

