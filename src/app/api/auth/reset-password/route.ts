import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { passwordResetSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const payload = passwordResetSchema.parse(await request.json());
    const tokenHash = hashToken(payload.token);
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    if (!tokenRecord) {
      return NextResponse.json(
        { ok: false, error: "Reset token is invalid or expired." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash: hashPassword(payload.new_password),
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.authSession.updateMany({
        where: {
          userId: tokenRecord.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    await logSecurityEvent({
      userId: tokenRecord.userId,
      eventType: "security.password_reset_completed",
      severity: "high",
    });

    return NextResponse.json({
      ok: true,
      message: "Password reset completed. Please sign in again.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

