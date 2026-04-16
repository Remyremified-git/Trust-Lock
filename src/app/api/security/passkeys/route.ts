import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const passkeys = await prisma.webauthnCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        credentialId: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
        deviceType: true,
        backedUp: true,
      },
    });
    return NextResponse.json({ ok: true, passkeys });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load passkeys.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

