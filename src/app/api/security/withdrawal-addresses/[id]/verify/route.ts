import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mfaCodeSchema } from "@/lib/schemas";
import { backupCodeHash, openTotpSecret, verifyTotp } from "@/lib/mfa";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const payload = mfaCodeSchema.parse(await request.json());

    if (user.mfaEnabled) {
      const mfa = await prisma.mfaCredential.findUnique({
        where: { userId: user.id },
      });
      if (!mfa) {
        return NextResponse.json(
          { ok: false, error: "MFA credential missing for enabled account." },
          { status: 400 },
        );
      }

      const secret = openTotpSecret({
        ciphertext: mfa.secretCiphertext,
        iv: mfa.secretIv,
        authTag: mfa.secretAuthTag,
      });
      let valid = verifyTotp(secret, payload.code);
      if (!valid) {
        const backup = await prisma.mfaBackupCode.findFirst({
          where: {
            userId: user.id,
            codeHash: backupCodeHash(payload.code),
            consumedAt: null,
          },
        });
        if (backup) {
          valid = true;
          await prisma.mfaBackupCode.update({
            where: { id: backup.id },
            data: { consumedAt: new Date() },
          });
        }
      }
      if (!valid) {
        return NextResponse.json(
          { ok: false, error: "Invalid MFA or backup code." },
          { status: 401 },
        );
      }
    }

    const updated = await prisma.withdrawalAddress.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isVerified: true,
      },
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { ok: false, error: "Withdrawal address not found." },
        { status: 404 },
      );
    }

    await logSecurityEvent({
      userId: user.id,
      eventType: "withdrawal.whitelist_verified",
      severity: "high",
      metadata: { address_id: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify address.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

