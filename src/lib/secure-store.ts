import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getServerEnv } from "@/lib/env";

type SealedValue = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function getDataKey(): Buffer {
  const env = getServerEnv();
  const keyHex = env.AUTH_DATA_AT_REST_KEY ?? env.ADMIN_VAULT_AT_REST_KEY;
  return Buffer.from(keyHex, "hex");
}

export function sealSecret(plaintext: string): SealedValue {
  const key = getDataKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function openSecret(input: SealedValue): string {
  const key = getDataKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

