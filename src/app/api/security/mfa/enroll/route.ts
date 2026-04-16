import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildOtpAuthUri,
  createTotpSecret,
  qrDataUrl,
  sealTotpSecret,
} from "@/lib/mfa";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    if (!user.email) {
      return NextResponse.json(
        { ok: false, error: "User email is required before MFA enrollment." },
        { status: 400 },
      );
    }

    const secret = createTotpSecret();
    const sealed = sealTotpSecret(secret);
    const uri = buildOtpAuthUri(user.email, secret);
    const qr = await qrDataUrl(uri);

    await prisma.mfaCredential.upsert({
      where: { userId: user.id },
      update: {
        method: "TOTP",
        secretCiphertext: sealed.ciphertext,
        secretIv: sealed.iv,
        secretAuthTag: sealed.authTag,
        verifiedAt: null,
      },
      create: {
        userId: user.id,
        method: "TOTP",
        secretCiphertext: sealed.ciphertext,
        secretIv: sealed.iv,
        secretAuthTag: sealed.authTag,
      },
    });

    return NextResponse.json({
      ok: true,
      otpauth_uri: uri,
      qr_data_url: qr,
      hint: "Scan this QR in Google Authenticator, Authy, or 1Password and verify with a code.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create MFA enrollment.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

