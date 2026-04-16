import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { AppRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-events";

const SESSION_COOKIE_NAME = "hv_session";
const DEFAULT_SESSION_DAYS = 14;

function sessionSecret(): string {
  const value = process.env.AUTH_SESSION_SECRET;
  if (!value || value.length < 24) {
    throw new Error("AUTH_SESSION_SECRET must be configured (min 24 chars)");
  }
  return value;
}

function hashSessionToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

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

function sessionTtlDays(): number {
  const raw = process.env.AUTH_SESSION_TTL_DAYS;
  if (!raw) {
    return DEFAULT_SESSION_DAYS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 90) {
    return DEFAULT_SESSION_DAYS;
  }
  return parsed;
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const headerStore = await headers();
  const expiresAt = new Date(Date.now() + sessionTtlDays() * 24 * 60 * 60 * 1000);

  const session = await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      ipAddress: headerStore.get("x-forwarded-for") ?? undefined,
      userAgent: headerStore.get("user-agent") ?? undefined,
      expiresAt,
      lastSeenAt: new Date(),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  await logSecurityEvent({
    userId,
    eventType: "auth.session_created",
    severity: "low",
    metadata: {
      session_id: session.id,
      expires_at: expiresAt.toISOString(),
    },
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const update = await prisma.authSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    if (update.count > 0) {
      const userSession = await prisma.authSession.findFirst({
        where: { tokenHash },
        select: { userId: true },
      });
      if (userSession) {
        await logSecurityEvent({
          userId: userSession.userId,
          eventType: "auth.session_revoked",
          severity: "low",
          metadata: { reason: "logout" },
        });
      }
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      user: true,
    },
  });
  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
  await prisma.authSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });
  return session;
}

export async function getCurrentSessionUser() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const enriched = await prisma.user.findUnique({
    where: { id: session.userId },
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
  return enriched;
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
