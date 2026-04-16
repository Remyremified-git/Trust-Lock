export function randomUserId(): string {
  return crypto.randomUUID();
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export async function encryptWithServerPublicKey(
  publicKeyPem: string,
  plaintext: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKeyPem),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  );

  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    encoded,
  );

  let result = "";
  const bytes = new Uint8Array(encrypted);
  for (const byte of bytes) {
    result += String.fromCharCode(byte);
  }
  return btoa(result);
}

export async function sha256HexBrowser(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

