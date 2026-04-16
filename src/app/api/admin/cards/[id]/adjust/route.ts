import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { assertAdminToken } from "@/lib/admin-auth";
import { centsToUsd, usdToCents } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { adminCardAdjustSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await assertAdminToken();
    const { id } = await context.params;
    const payload = adminCardAdjustSchema.parse(await request.json());
    const amountCents = usdToCents(Math.abs(payload.amount_usd));
    const increment = payload.amount_usd >= 0 ? amountCents : -amountCents;

    const card = await prisma.debitCard.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        availableBalanceCents: true,
      },
    });
    if (!card) {
      return NextResponse.json({ ok: false, error: "Card not found." }, { status: 404 });
    }

    if (card.availableBalanceCents + increment < 0) {
      return NextResponse.json(
        { ok: false, error: "Adjustment would make card balance negative." },
        { status: 400 },
      );
    }

    const reference = `ADJUST-${randomUUID()}`;
    const updated = await prisma.$transaction(async (tx) => {
      const nextCard = await tx.debitCard.update({
        where: { id: card.id },
        data: {
          availableBalanceCents: {
            increment,
          },
        },
      });

      await tx.debitCardTransaction.create({
        data: {
          cardId: card.id,
          userId: card.userId,
          type: "ADJUSTMENT",
          status: "SETTLED",
          amountCents,
          reference,
          description: payload.note,
          metadata: {
            direction: payload.amount_usd >= 0 ? "credit" : "debit",
            actor: "admin",
          },
          settledAt: new Date(),
        },
      });

      return nextCard;
    });

    await logSecurityEvent({
      userId: card.userId,
      eventType: "card.admin_adjustment",
      severity: "high",
      metadata: {
        card_id: id,
        amount_usd: payload.amount_usd,
        note: payload.note,
        reference,
      },
    });

    return NextResponse.json({
      ok: true,
      reference,
      new_balance_usd: centsToUsd(updated.availableBalanceCents),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to adjust card.";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

