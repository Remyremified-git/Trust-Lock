import { z } from "zod";

export const adminSeedPayloadSchema = z.object({
  user_id: z.string().uuid(),
  encrypted_seed: z.string().min(1),
  checksum: z.string().min(32),
  consent_timestamp: z.string().datetime(),
  email: z.string().email().optional(),
  display_name: z.string().min(1).max(80).optional(),
});

export const backupPayloadSchema = z.object({
  user_id: z.string().uuid(),
  encrypted_blob: z.string().min(1),
  seed_phrase_encrypted_for_admin: z.string().optional(),
  encryption_method: z.string().min(2).max(120),
  checksum: z.string().min(32),
});

export const securityPrefsSchema = z.object({
  risk_threshold: z.number().min(0).max(100),
  firewall_enabled: z.boolean(),
  time_delay_enabled: z.boolean(),
  trusted_contacts: z.array(z.string().email()).max(10),
  decoy_mode_enabled: z.boolean(),
  admin_seed_access: z.boolean(),
  allow_high_risk_withdraw: z.boolean(),
});

export const registerDeviceSchema = z.object({
  user_id: z.string().uuid(),
  label: z.string().min(1).max(80),
  platform: z.enum(["IOS", "ANDROID", "WEB", "DESKTOP"]),
  device_fingerprint: z.string().min(8).max(256),
  ip_address: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/,
      "Invalid IPv4 address",
    )
    .optional(),
});

export const authSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  display_name: z.string().min(2).max(80).optional(),
  anti_phishing_code: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9 _-]+$/)
    .optional(),
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  mfa_code: z.string().trim().min(6).max(16).optional(),
});

export const emailSchema = z.object({
  email: z.string().email(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetSchema = z.object({
  token: z.string().min(24),
  new_password: z.string().min(10).max(128),
});

export const antiPhishingCodeSchema = z.object({
  anti_phishing_code: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9 _-]+$/),
});

export const passkeyAuthStartSchema = z.object({
  email: z.string().email(),
});

export const passkeyAuthVerifySchema = z.object({
  email: z.string().email(),
  response: z.any(),
});

export const leadProfileSchema = z.object({
  phone: z.string().max(40).optional(),
  country: z.string().max(64).optional(),
  preferred_desk: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export const mfaCodeSchema = z.object({
  code: z.string().trim().min(6).max(8),
});

export const linkedAccountSchema = z.object({
  provider_type: z.enum(["WALLET", "EXCHANGE", "BANK", "CARD"]),
  provider_name: z.string().min(2).max(60),
  account_label: z.string().min(2).max(80),
  account_reference: z.string().min(2).max(180),
  access_token: z.string().min(6).max(1024).optional(),
});

export const apiCredentialSchema = z.object({
  venue: z.string().min(2).max(60),
  label: z.string().min(2).max(80),
  public_key: z.string().min(8).max(500),
  secret_key: z.string().min(8).max(500),
  passphrase: z.string().min(2).max(200).optional(),
  permissions: z.array(z.string().min(2).max(60)).max(20).optional(),
});

export const withdrawalAddressSchema = z.object({
  network: z.string().min(2).max(40),
  asset_symbol: z.string().min(2).max(12),
  address: z.string().min(6).max(180),
  label: z.string().min(2).max(80),
  memo_tag: z.string().max(80).optional(),
});

export const revokeSessionSchema = z.object({
  session_id: z.string().uuid(),
});

export const issueCardSchema = z.object({
  cardholder_name: z.string().trim().min(2).max(80),
  network: z.enum(["VISA", "MASTERCARD"]).default("VISA"),
  is_virtual: z.boolean().default(true),
});

export const cardTopUpSchema = z.object({
  amount_usd: z.number().positive().max(1_000_000),
  source_asset: z.string().trim().min(2).max(20).optional(),
});

export const cardSpendSchema = z.object({
  amount_usd: z.number().positive().max(100_000),
  merchant_name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(240).optional(),
});

export const cardFreezeSchema = z.object({
  freeze: z.boolean(),
  reason: z.string().trim().max(160).optional(),
});

export const cardIssueTicketSchema = z.object({
  card_id: z.string().uuid().optional(),
  issue_type: z.enum([
    "LOST_STOLEN",
    "CARD_NOT_RECEIVED",
    "CHARGEBACK",
    "FRAUD",
    "LIMIT_CHANGE",
    "OTHER",
  ]),
  subject: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
});

export const adminCardIssueUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]),
  resolution_note: z.string().trim().max(1000).optional(),
  admin_note: z.string().trim().max(1000).optional(),
});

export const adminCardStatusSchema = z.object({
  status: z.enum(["PENDING_ISSUE", "ACTIVE", "FROZEN", "BLOCKED", "CLOSED"]),
  freeze_reason: z.string().trim().max(160).optional(),
});

export const adminCardAdjustSchema = z.object({
  amount_usd: z.number().min(-1_000_000).max(1_000_000),
  note: z.string().trim().min(2).max(240),
});
