import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revokeSessionSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = revokeSessionSchema.parse(await request.json());

    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.session_id,
        userId: user.id,
      },
    });
    if (!session) {
      return NextResponse.json({ ok: false, error: "Session not found." }, { status: 404 });
    }

    await prisma.authSession.update({
      where: { id: payload.session_id },
      data: { revokedAt: new Date() },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "security.session_revoked_by_user",
      severity: "medium",
      metadata: { revoked_session_id: payload.session_id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke session.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

