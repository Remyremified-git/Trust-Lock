import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getExpectedOrigins, getRpID, findActiveChallenge, consumeChallenge } from "@/lib/webauthn";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as { response: unknown };

    const challenge = await findActiveChallenge({
      userId: user.id,
      challengeType: "registration",
    });
    if (!challenge) {
      return NextResponse.json(
        { ok: false, error: "Registration challenge not found or expired." },
        { status: 400 },
      );
    }

    const verification = await verifyRegistrationResponse({
      response: body.response as never,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { ok: false, error: "Passkey registration verification failed." },
        { status: 400 },
      );
    }

    const credential = verification.registrationInfo.credential;
    const credentialId = credential.id;
    const publicKey = Buffer.from(credential.publicKey).toString("base64url");

    await prisma.webauthnCredential.upsert({
      where: { credentialId },
      update: {
        publicKey,
        counter: credential.counter,
        transports: credential.transports ?? [],
        backedUp: verification.registrationInfo.credentialBackedUp,
        deviceType: verification.registrationInfo.credentialDeviceType,
      },
      create: {
        userId: user.id,
        credentialId,
        publicKey,
        counter: credential.counter,
        transports: credential.transports ?? [],
        backedUp: verification.registrationInfo.credentialBackedUp,
        deviceType: verification.registrationInfo.credentialDeviceType,
      },
    });

    await consumeChallenge({
      userId: user.id,
      challengeType: "registration",
      challenge: challenge.challenge,
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "security.passkey_registered",
      severity: "medium",
      metadata: { credential_id: credentialId },
    });

    return NextResponse.json({ ok: true, credential_id: credentialId });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to verify passkey registration.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

