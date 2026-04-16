import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { backupCodeHash, openTotpSecret, verifyTotp } from "@/lib/mfa";
import { mfaCodeSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = mfaCodeSchema.parse(await request.json());

    const mfa = await prisma.mfaCredential.findUnique({
      where: { userId: user.id },
    });
    if (!mfa) {
      return NextResponse.json({ ok: false, error: "MFA is not enabled." }, { status: 400 });
    }

    let valid = false;
    const secret = openTotpSecret({
      ciphertext: mfa.secretCiphertext,
      iv: mfa.secretIv,
      authTag: mfa.secretAuthTag,
    });
    valid = verifyTotp(secret, payload.code);
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
      return NextResponse.json({ ok: false, error: "Invalid MFA or backup code." }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: false, mfaMethod: null },
      }),
      prisma.mfaCredential.deleteMany({
        where: { userId: user.id },
      }),
      prisma.mfaBackupCode.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    await logSecurityEvent({
      userId: user.id,
      eventType: "security.mfa_disabled",
      severity: "high",
    });

    return NextResponse.json({ ok: true, message: "MFA disabled." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disable MFA.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

