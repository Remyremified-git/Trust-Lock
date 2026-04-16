import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { logSecurityEvent } from "@/lib/security-events";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Verification token is missing." },
        { status: 400 },
      );
    }
    const tokenHash = hashToken(token);
    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "Verification token is invalid or expired." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    await logSecurityEvent({
      userId: record.userId,
      eventType: "security.email_verified",
      severity: "low",
    });

    const redirect = `${url.origin}/auth?verified=1`;
    return NextResponse.redirect(redirect);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

