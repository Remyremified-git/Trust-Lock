import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AppRole, type User } from "@prisma/client";
import { prisma } from "@/lib/db";

type PasswordParts = {
  iterations: number;
  saltHex: string;
  hashHex: string;
};

function encodePassword(parts: PasswordParts): string {
  return `pbkdf2$${parts.iterations}$${parts.saltHex}$${parts.hashHex}`;
}

function decodePassword(payload: string): PasswordParts {
  const [kind, iterationsRaw, saltHex, hashHex] = payload.split("$");
  if (kind !== "pbkdf2") {
    throw new Error("Unsupported password format");
  }
  const iterations = Number(iterationsRaw);
  if (!iterations || !saltHex || !hashHex) {
    throw new Error("Malformed password hash");
  }
  return { iterations, saltHex, hashHex };
}

function sessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET || "trust-lock-clerk-session-fallback-secret";
}

function bestDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const full = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (input.username?.trim()) return input.username.trim();
  if (input.email) return input.email.split("@")[0] || "User";
  return "User";
}

async function upsertUserFromClerkContext(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerk = await currentUser();
  const email =
    clerk?.emailAddresses?.find((entry) => entry.id === clerk.primaryEmailAddressId)?.emailAddress ??
    clerk?.emailAddresses?.[0]?.emailAddress ??
    null;
  const displayName = bestDisplayName({
    firstName: clerk?.firstName,
    lastName: clerk?.lastName,
    username: clerk?.username,
    email,
  });
  const emailVerifiedAt = clerk?.primaryEmailAddress?.verification?.status === "verified" ? new Date() : null;

  const byClerk = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (byClerk) {
    return prisma.user.update({
      where: { id: byClerk.id },
      data: {
        email: email ?? byClerk.email,
        displayName,
        emailVerifiedAt: emailVerifiedAt ?? byClerk.emailVerifiedAt,
        lastLoginAt: new Date(),
      },
    });
  }

  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: {
          clerkUserId: userId,
          displayName: byEmail.displayName || displayName,
          emailVerifiedAt: emailVerifiedAt ?? byEmail.emailVerifiedAt,
          lastLoginAt: new Date(),
        },
      });
    }
  }

  return prisma.user.create({
    data: {
      clerkUserId: userId,
      email,
      emailVerifiedAt,
      displayName,
      role: AppRole.USER,
      lastLoginAt: new Date(),
    },
  });
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const iterations = 210_000;
  const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return encodePassword({
    iterations,
    saltHex: salt.toString("hex"),
    hashHex: derived.toString("hex"),
  });
}

export function verifyPassword(password: string, payload: string): boolean {
  const decoded = decodePassword(payload);
  const actual = pbkdf2Sync(
    password,
    Buffer.from(decoded.saltHex, "hex"),
    decoded.iterations,
    32,
    "sha256",
  );
  const expected = Buffer.from(decoded.hashHex, "hex");
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

// Compatibility no-op: Clerk manages sessions and cookies.
export async function createUserSession(_userId: string) {
  return;
}

// Compatibility no-op: Clerk manages logout.
export async function clearUserSession() {
  return;
}

export async function getCurrentSession() {
  const user = await getCurrentSessionUser();
  if (!user) {
    return null;
  }
  return {
    id: `clerk:${user.id}`,
    userId: user.id,
  };
}

export async function getCurrentSessionUser() {
  const base = await upsertUserFromClerkContext();
  if (!base) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: base.id },
    include: {
      leadProfile: true,
      securityPrefs: true,
      devices: {
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function requireRole(role: AppRole) {
  const user = await getCurrentSessionUser();
  if (!user || user.role !== role) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentSessionUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export function sessionFingerprint(input: {
  userAgent?: string | null;
  ipAddress?: string | null;
}): string {
  return createHmac("sha256", sessionSecret())
    .update(`${input.userAgent ?? ""}::${input.ipAddress ?? ""}`)
    .digest("hex");
}
