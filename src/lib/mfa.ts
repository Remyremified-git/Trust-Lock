import { randomBytes } from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { openSecret, sealSecret, sha256 } from "@/lib/secure-store";

const APP_ISSUER = "HybridVault";

export function createTotpSecret() {
  return speakeasy.generateSecret({
    length: 32,
    name: `${APP_ISSUER}:user`,
    issuer: APP_ISSUER,
  }).base32;
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return speakeasy.otpauthURL({
    secret,
    encoding: "base32",
    label: email,
    issuer: APP_ISSUER,
  });
}

export async function qrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function verifyTotp(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    token: code.trim(),
    encoding: "base32",
    window: 1,
    step: 30,
  });
}

export function sealTotpSecret(secret: string) {
  return sealSecret(secret);
}

export function openTotpSecret(input: {
  ciphertext: string;
  iv: string;
  authTag: string;
}): string {
  return openSecret(input);
}

export function createBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(5).toString("hex").toUpperCase(),
  );
}

export function backupCodeHash(code: string): string {
  return sha256(code.toUpperCase().trim());
}
