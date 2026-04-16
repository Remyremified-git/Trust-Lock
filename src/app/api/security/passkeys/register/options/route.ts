import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRpID, getRpName, storeChallenge } from "@/lib/webauthn";

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    if (!user.email) {
      return NextResponse.json(
        { ok: false, error: "User email is required to create a passkey." },
        { status: 400 },
      );
    }

    const credentials = await prisma.webauthnCredential.findMany({
      where: { userId: user.id },
      select: { credentialId: true },
    });

    const options = await generateRegistrationOptions({
      rpID: getRpID(),
      rpName: getRpName(),
      userName: user.email,
      userDisplayName: user.displayName ?? user.email,
      attestationType: "none",
      timeout: 60_000,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        type: "public-key",
      })),
    });

    await storeChallenge({
      userId: user.id,
      challengeType: "registration",
      challenge: options.challenge,
    });

    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate passkey registration options.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

