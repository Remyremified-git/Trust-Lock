# Hybrid Vault Platform Starter

This project is a Next.js + Prisma starter for a **hybrid custodial key platform** where:

- Seed phrase is generated/imported client-side.
- User confirms explicit consent.
- Seed is encrypted client-side with server public key.
- Backend stores an encrypted admin recovery copy in a dedicated vault.
- Admin retrieval is token-gated and audit-logged.
- App uses first-party auth (signup/login/session), not Clerk.
- Exchange-aligned security/linking matrix: `docs/SECURITY_AND_LINKING_FEATURES.md`

## Important Workspace Path

All new code is in:

`C:\Users\DELL\Desktop\Trust-lock`

If your IDE doesn't show files, open this folder as the project root.

## Aiven + Vercel Setup

Use this runbook for production DB + deploy setup:

`docs/AIVEN_VERCEL_SETUP.md`

## Included in this environment

- `POST /api/vault/admin-seed` for consented seed transmission.
- `POST /api/vault/backup` for encrypted backup metadata.
- `GET|DELETE /api/admin/vault/seed/:userId` for admin-only recovery access.
- `POST /api/security/preferences` for user security controls.
- `POST /api/devices/register` for device tracking.
- `POST /api/auth/signup` / `POST /api/auth/login` / `POST /api/auth/logout`
- `GET /api/auth/me` for authenticated user context
- `POST /api/auth/resend-verification`
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`
- `POST /api/auth/passkey/options`
- `POST /api/auth/passkey/verify`
- `POST /api/portal/lead-profile` for lead/user portal details
- `POST /api/portal/anti-phishing-code`
- `GET /api/system/db-status` (admin-token protected DB connectivity check)
- `GET|POST /api/cards` (issue/list user debit cards)
- `POST /api/cards/:id/top-up`
- `POST /api/cards/:id/spend`
- `POST /api/cards/:id/freeze`
- `GET /api/cards/:id/transactions`
- `GET|POST /api/cards/issues`
- `GET /api/admin/cards` (admin debit card desk)
- `PATCH /api/admin/cards/:id/status`
- `POST /api/admin/cards/:id/adjust`
- `GET /api/admin/cards/issues`
- `PATCH /api/admin/cards/issues/:id`
- `GET /api/security/passkeys`
- `POST /api/security/passkeys/register/options`
- `POST /api/security/passkeys/register/verify`
- `DELETE /api/security/passkeys/:id`
- Prisma models for:
  - `users`
  - `vault_backups`
  - `admin_seed_vault`
  - `user_security_prefs`
  - `devices`
  - `admin_users`
  - `admin_audit_logs`

## Routes

- `/` Home
- `/auth` Native auth page
- `/portal` User lead portal
- `/portal` now includes user-facing debit card control panel (issue/fund/spend/freeze/issues)
- `/onboarding` User wallet creation + admin seed consent
- `/security` Security Control Dashboard starter
- `/admin` Admin control panel (seed vault + card operations + issue desk)

## Local setup

1. Install dependencies:
```bash
npm install
```

2. Copy env template:
```bash
cp .env.example .env
```

3. Fill real values in `.env`:
- `DATABASE_URL`
- `ADMIN_API_TOKEN`
- `AUTH_SESSION_SECRET`
- `AUTH_SESSION_TTL_DAYS`
- `AUTH_REQUIRE_VERIFIED_EMAIL`
- `AUTH_DATA_AT_REST_KEY` (recommended, 64 hex chars; if missing system falls back to `ADMIN_VAULT_AT_REST_KEY`)
- `ADMIN_VAULT_AT_REST_KEY` (64 hex chars)
- `ADMIN_SEED_PUBLIC_KEY_PEM`
- `ADMIN_SEED_PRIVATE_KEY_PEM`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (optional shared rate limiting)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (optional real email)
- `WEBAUTHN_RP_NAME`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGINS`

4. Generate Prisma client + push schema:
```bash
npm run prisma:generate
npm run db:push
```

5. Run app:
```bash
npm run dev
```

## Generate RSA key pair (example)

```bash
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

Paste both PEM blocks into env variables.

## Vercel deployment

1. Create a Vercel project from this folder.
2. Set Root Directory to repository root (`Trust-lock`).
3. Add environment variables from `.env`.
4. Ensure build command remains:
```bash
npm run build
```
5. Deploy.

## Security notes

- This architecture is custodial for recovery because admin seed copies exist.
- Seed access endpoints must always be protected by:
  - RBAC
  - MFA
  - strict audit logging
  - legal/compliance policy
- Never store plaintext seeds at rest.
- Never skip explicit user consent.
