import { NextResponse } from "next/server";
import { getCurrentSession, requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const active = await getCurrentSession();

    const sessions = await prisma.authSession.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        lastSeenAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      current_session_id: active?.id ?? null,
      sessions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sessions.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

