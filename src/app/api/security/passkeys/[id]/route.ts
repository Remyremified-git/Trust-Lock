import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;

    const credential = await prisma.webauthnCredential.findFirst({
      where: { id, userId: user.id },
    });
    if (!credential) {
      return NextResponse.json(
        { ok: false, error: "Passkey credential not found." },
        { status: 404 },
      );
    }

    await prisma.webauthnCredential.delete({
      where: { id: credential.id },
    });
    await logSecurityEvent({
      userId: user.id,
      eventType: "security.passkey_deleted",
      severity: "medium",
      metadata: { credential_id: credential.credentialId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove passkey.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

