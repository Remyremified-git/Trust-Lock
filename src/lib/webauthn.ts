import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/hash";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export function getRpName(): string {
  return process.env.WEBAUTHN_RP_NAME ?? "Hybrid Vault";
}

export function getRpID(): string {
  const explicit = process.env.WEBAUTHN_RP_ID;
  if (explicit) {
    return explicit;
  }
  const parsed = new URL(appBaseUrl());
  return parsed.hostname;
}

export function getExpectedOrigins(): string[] {
  const envOrigins = process.env.WEBAUTHN_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return [appBaseUrl()];
}

export async function storeChallenge(input: {
  userId: string;
  challengeType: "registration" | "authentication";
  challenge: string;
}) {
  const challengeHash = sha256Hex(input.challenge);
  await prisma.webauthnChallenge.create({
    data: {
      userId: input.userId,
      challenge: input.challenge,
      challengeType: input.challengeType,
      challengeHash,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

export async function consumeChallenge(input: {
  userId: string;
  challengeType: "registration" | "authentication";
  challenge: string;
}): Promise<boolean> {
  const challengeHash = sha256Hex(input.challenge);
  const challenge = await prisma.webauthnChallenge.findFirst({
    where: {
      userId: input.userId,
      challengeType: input.challengeType,
      challengeHash,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!challenge) {
    return false;
  }
  await prisma.webauthnChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  return true;
}

export async function findActiveChallenge(input: {
  userId: string;
  challengeType: "registration" | "authentication";
}) {
  return prisma.webauthnChallenge.findFirst({
    where: {
      userId: input.userId,
      challengeType: input.challengeType,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
