import { randomBytes } from "crypto";
import { sha256Hex } from "@/lib/hash";

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return sha256Hex(token);
}

export function tokenExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

