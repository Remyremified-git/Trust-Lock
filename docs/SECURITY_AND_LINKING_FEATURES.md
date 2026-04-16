# Security and Linking Feature Matrix

This document aligns the platform with common practices used by leading exchanges/wallets (Binance, Coinbase, Kraken, Bybit, OKX style controls).

## 1) Identity and Access

- Custom signup/login/logout with server-side session cookies.
- Strong password hashing (`PBKDF2-SHA256` high iteration).
- Role model (`USER`, `ADMIN`, `SUPPORT`) for RBAC expansion.
- Session records with revoke support.
- Active session inspection from security dashboard.
- Rate limiting with Upstash Redis support + in-memory fallback.
- Email verification flow with tokenized verification links.
- Password reset request/reset flow with token invalidation and session revocation.
- Anti-phishing code support on user account.

## 2) Account Security Controls

- TOTP MFA enrollment with QR (Google Authenticator/Authy/1Password compatible).
- MFA verification + enable/disable flows.
- One-time backup recovery codes.
- Security event logging (login, MFA, linking, session revokes, whitelist actions).
- Device registration endpoint with active/revoked model.
- Passkey/WebAuthn registration and passkey login routes.

## 3) Vault and Secret Security

- Client-side RSA transport encryption for seed transfer.
- Server-side AES-256-GCM encryption at rest for:
  - admin seed copy
  - MFA secrets
  - linked access tokens
  - exchange API secrets/passphrases
- Admin seed retrieval guarded by admin role/session or admin token fallback.
- Admin access operations audit logged.

## 4) Linking Features

- Linked accounts model + API (wallet/exchange/bank/card).
- Exchange API credential vault model + API.
- Lead profile and account metadata portal.

## 5) Withdrawal and Risk Controls

- User security preference policy controls:
  - risk threshold
  - firewall toggle
  - delayed high-risk withdrawals
  - decoy mode
  - trusted contacts
  - admin seed access preference
- Withdrawal whitelist address add + MFA-based verification.

## 6) What Still Needs To Be Added For Production Grade

- Email verification + password reset + anti-phishing code.
- Redis/edge shared rate limiting (instead of in-memory bucket).
- Enforce production Redis limiter only (disable in-memory fallback in prod).
- Geo-velocity and impossible-travel detection.
- Login anomaly risk scoring + adaptive step-up MFA.
- Transaction signing policy engine with challenge orchestration.
- KMS/HSM-backed key operations (not env-only key storage).
- SIEM integration + alerting (PagerDuty/Slack hooks).
- Compliance controls (travel rule, sanctions, AML review workflows).
- Admin approval workflows for privileged seed access.
- Webhook signing + replay protection.
- SSO and enterprise role groups.
- Full integration tests and penetration testing gate.
