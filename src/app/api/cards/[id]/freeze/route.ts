import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardFreezeSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const payload = cardFreezeSchema.parse(await request.json());

    const existing = await prisma.debitCard.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Card not found." }, { status: 404 });
    }

    const status = payload.freeze ? "FROZEN" : "ACTIVE";
    const card = await prisma.debitCard.update({
      where: { id: existing.id },
      data: {
        status,
        freezeReason: payload.freeze ? payload.reason ?? "User initiated freeze" : null,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: payload.freeze ? "card.frozen" : "card.unfrozen",
      severity: "high",
      metadata: {
        card_id: card.id,
        reason: payload.reason ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      status: card.status,
      freeze_reason: card.freezeReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update freeze state.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

