import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { antiPhishingCodeSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = antiPhishingCodeSchema.parse(await request.json());
    const code = payload.anti_phishing_code.trim();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        antiPhishingCode: code,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "security.anti_phishing_code_updated",
      severity: "medium",
    });

    return NextResponse.json({
      ok: true,
      anti_phishing_code: code,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update anti-phishing code.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

