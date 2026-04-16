import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiCredentialSchema } from "@/lib/schemas";
import { sealSecret } from "@/lib/secure-store";
import { logSecurityEvent } from "@/lib/security-events";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const credentials = await prisma.exchangeApiCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        venue: true,
        label: true,
        publicKey: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ ok: true, api_credentials: credentials });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load API credentials.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = apiCredentialSchema.parse(await request.json());
    const sealedSecret = sealSecret(payload.secret_key);
    const sealedPassphrase = payload.passphrase
      ? sealSecret(payload.passphrase)
      : null;

    const credential = await prisma.exchangeApiCredential.create({
      data: {
        userId: user.id,
        venue: payload.venue,
        label: payload.label,
        publicKey: payload.public_key,
        secretCiphertext: sealedSecret.ciphertext,
        secretIv: sealedSecret.iv,
        secretAuthTag: sealedSecret.authTag,
        passphraseCiphertext: sealedPassphrase?.ciphertext,
        passphraseIv: sealedPassphrase?.iv,
        passphraseAuthTag: sealedPassphrase?.authTag,
        permissions: payload.permissions ?? [],
      },
      select: {
        id: true,
        venue: true,
        label: true,
        publicKey: true,
        permissions: true,
        createdAt: true,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "linking.api_credential_added",
      severity: "high",
      metadata: {
        venue: payload.venue,
        credential_id: credential.id,
      },
    });

    return NextResponse.json({ ok: true, api_credential: credential });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store API credential.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

