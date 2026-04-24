import { NextResponse } from "next/server";
import { AppRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authSignupSchema } from "@/lib/schemas";
import { createUserSession, hashPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-events";
import { issueEmailVerificationToken } from "@/lib/account-security";
import { hasDatabaseConfig } from "@/lib/db-config";

export async function POST(request: Request) {
  try {
    if (!hasDatabaseConfig()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server configuration missing database connection. Set DATABASE_URL (or AIVEN_DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL).",
        },
        { status: 500 },
      );
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = await checkRateLimit({
      key: `signup:${ip}`,
      max: 12,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many signup attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const payload = authSignupSchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();

    const exists = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "Account already exists" },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        displayName: payload.display_name,
        antiPhishingCode: payload.anti_phishing_code?.trim(),
        passwordHash: hashPassword(payload.password),
        role: AppRole.USER,
      },
    });

    await createUserSession(user.id);
    const verificationResult = await issueEmailVerificationToken(user.id, email);
    await logSecurityEvent({
      userId: user.id,
      eventType: "auth.signup_success",
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
      },
      verification_mail_delivered: verificationResult.delivered,
      verification_mail_preview: verificationResult.preview,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected signup error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
