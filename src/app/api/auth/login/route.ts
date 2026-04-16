import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authLoginSchema } from "@/lib/schemas";
import { createUserSession, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { openTotpSecret, verifyTotp, backupCodeHash } from "@/lib/mfa";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = await checkRateLimit({
      key: `login:${ip}`,
      max: 20,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many login attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const payload = authLoginSchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const validPassword = verifyPassword(payload.password, user.passwordHash);
    if (!validPassword) {
      await logSecurityEvent({
        userId: user.id,
        eventType: "auth.login_failed_password",
        severity: "medium",
        metadata: { email },
      });
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (
      process.env.AUTH_REQUIRE_VERIFIED_EMAIL === "true" &&
      !user.emailVerifiedAt
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email verification is required before login. Check your inbox for the verification link.",
        },
        { status: 403 },
      );
    }

    if (user.mfaEnabled) {
      const code = payload.mfa_code?.trim();
      if (!code) {
        return NextResponse.json(
          { ok: false, error: "MFA code required", requires_mfa: true },
          { status: 401 },
        );
      }

      const mfa = await prisma.mfaCredential.findUnique({
        where: { userId: user.id },
      });
      if (!mfa || !mfa.verifiedAt) {
        return NextResponse.json(
          { ok: false, error: "MFA not configured properly for this user" },
          { status: 403 },
        );
      }

      const secret = openTotpSecret({
        ciphertext: mfa.secretCiphertext,
        iv: mfa.secretIv,
        authTag: mfa.secretAuthTag,
      });
      let mfaValid = verifyTotp(secret, code);

      if (!mfaValid) {
        const hash = backupCodeHash(code);
        const backup = await prisma.mfaBackupCode.findFirst({
          where: {
            userId: user.id,
            codeHash: hash,
            consumedAt: null,
          },
        });
        if (backup) {
          await prisma.mfaBackupCode.update({
            where: { id: backup.id },
            data: { consumedAt: new Date() },
          });
          mfaValid = true;
        }
      }

      if (!mfaValid) {
        await logSecurityEvent({
          userId: user.id,
          eventType: "auth.login_failed_mfa",
          severity: "high",
          metadata: { email },
        });
        return NextResponse.json(
          { ok: false, error: "Invalid MFA code", requires_mfa: true },
          { status: 401 },
        );
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createUserSession(user.id);
    await logSecurityEvent({
      userId: user.id,
      eventType: "auth.login_success",
      severity: "low",
      metadata: { email },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        role: user.role,
        email_verified: Boolean(user.emailVerifiedAt),
        anti_phishing_code: user.antiPhishingCode ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected login error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
