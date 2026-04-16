import {
  constants,
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  randomBytes,
} from "crypto";
import { getServerEnv } from "@/lib/env";

type EncryptedAtRest = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function getSeedPublicKeyPem(): string {
  return getServerEnv().ADMIN_SEED_PUBLIC_KEY_PEM.replace(/\\n/g, "\n");
}

export function decryptClientSeedTransport(base64Ciphertext: string): string {
  const { ADMIN_SEED_PRIVATE_KEY_PEM } = getServerEnv();
  const plaintext = privateDecrypt(
    {
      key: ADMIN_SEED_PRIVATE_KEY_PEM.replace(/\\n/g, "\n"),
      oaepHash: "sha256",
      padding: constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(base64Ciphertext, "base64"),
  );
  return plaintext.toString("utf8").trim();
}

export function encryptSeedAtRest(seed: string): EncryptedAtRest {
  const { ADMIN_VAULT_AT_REST_KEY } = getServerEnv();
  const key = Buffer.from(ADMIN_VAULT_AT_REST_KEY, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(seed, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSeedAtRest(input: EncryptedAtRest): string {
  const { ADMIN_VAULT_AT_REST_KEY } = getServerEnv();
  const key = Buffer.from(ADMIN_VAULT_AT_REST_KEY, "hex");
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
