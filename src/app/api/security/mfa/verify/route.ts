import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  backupCodeHash,
  createBackupCodes,
  openTotpSecret,
  verifyTotp,
} from "@/lib/mfa";
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
      return NextResponse.json(
        { ok: false, error: "Start MFA enrollment first." },
        { status: 400 },
      );
    }

    const secret = openTotpSecret({
      ciphertext: mfa.secretCiphertext,
      iv: mfa.secretIv,
      authTag: mfa.secretAuthTag,
    });

    const valid = verifyTotp(secret, payload.code);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid authenticator code." },
        { status: 401 },
      );
    }

    const backupCodes = createBackupCodes(10);
    await prisma.$transaction([
      prisma.mfaCredential.update({
        where: { userId: user.id },
        data: {
          verifiedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          mfaMethod: "TOTP",
        },
      }),
      prisma.mfaBackupCode.deleteMany({
        where: { userId: user.id },
      }),
      prisma.mfaBackupCode.createMany({
        data: backupCodes.map((code) => ({
          userId: user.id,
          codeHash: backupCodeHash(code),
        })),
      }),
    ]);

    await logSecurityEvent({
      userId: user.id,
      eventType: "security.mfa_enabled",
      severity: "high",
    });

    return NextResponse.json({
      ok: true,
      backup_codes: backupCodes,
      warning:
        "Store backup codes offline. Each code is one-time and cannot be shown again.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify MFA.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

