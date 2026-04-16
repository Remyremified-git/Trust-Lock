import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createUserSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { passkeyAuthVerifySchema } from "@/lib/schemas";
import {
  consumeChallenge,
  findActiveChallenge,
  getExpectedOrigins,
  getRpID,
} from "@/lib/webauthn";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const payload = passkeyAuthVerifySchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Passkey account not found." },
        { status: 404 },
      );
    }

    const challenge = await findActiveChallenge({
      userId: user.id,
      challengeType: "authentication",
    });
    if (!challenge) {
      return NextResponse.json(
        { ok: false, error: "Authentication challenge not found or expired." },
        { status: 400 },
      );
    }

    const responseAny = payload.response as {
      id?: string;
    };
    if (!responseAny.id) {
      return NextResponse.json(
        { ok: false, error: "Credential id is missing in passkey response." },
        { status: 400 },
      );
    }

    const dbCredential = await prisma.webauthnCredential.findFirst({
      where: {
        userId: user.id,
        credentialId: responseAny.id,
      },
    });
    if (!dbCredential) {
      return NextResponse.json(
        { ok: false, error: "Registered passkey credential not found." },
        { status: 404 },
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: payload.response as never,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
      requireUserVerification: false,
      credential: {
        id: dbCredential.credentialId,
        publicKey: Buffer.from(dbCredential.publicKey, "base64url"),
        counter: dbCredential.counter,
        transports: Array.isArray(dbCredential.transports)
          ? (dbCredential.transports as never)
          : [],
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json(
        { ok: false, error: "Passkey verification failed." },
        { status: 401 },
      );
    }

    await prisma.webauthnCredential.update({
      where: { id: dbCredential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    await consumeChallenge({
      userId: user.id,
      challengeType: "authentication",
      challenge: challenge.challenge,
    });

    await createUserSession(user.id);
    await logSecurityEvent({
      userId: user.id,
      eventType: "auth.passkey_login_success",
      severity: "low",
      metadata: { credential_id: dbCredential.credentialId },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify passkey login.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
