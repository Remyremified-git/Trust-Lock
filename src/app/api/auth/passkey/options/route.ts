import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { passkeyAuthStartSchema } from "@/lib/schemas";
import { getRpID, storeChallenge } from "@/lib/webauthn";

export async function POST(request: Request) {
  try {
    const payload = passkeyAuthStartSchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Passkey account not found." },
        { status: 404 },
      );
    }

    const credentials = await prisma.webauthnCredential.findMany({
      where: { userId: user.id },
      select: { credentialId: true },
    });
    if (credentials.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No passkey registered for this account." },
        { status: 404 },
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpID(),
      timeout: 60_000,
      userVerification: "preferred",
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        type: "public-key",
      })),
    });

    await storeChallenge({
      userId: user.id,
      challengeType: "authentication",
      challenge: options.challenge,
    });

    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate passkey authentication options.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

