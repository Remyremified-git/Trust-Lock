import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardBlockSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const payload = cardBlockSchema.parse(await request.json());

    const existing = await prisma.debitCard.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Card not found." }, { status: 404 });
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: "Closed cards cannot be blocked." },
        { status: 400 },
      );
    }

    const card = await prisma.debitCard.update({
      where: { id: existing.id },
      data: {
        status: "BLOCKED",
        freezeReason: payload.reason ?? "User emergency block",
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "card.blocked",
      severity: "high",
      metadata: {
        card_id: card.id,
        previous_status: existing.status,
        reason: payload.reason ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      status: card.status,
      freeze_reason: card.freezeReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to block card.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

