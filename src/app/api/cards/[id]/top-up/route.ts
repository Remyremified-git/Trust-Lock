import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { centsToUsd, usdToCents } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { cardTopUpSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const payload = cardTopUpSchema.parse(await request.json());
    const amountCents = usdToCents(payload.amount_usd);

    const card = await prisma.debitCard.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
    if (!card) {
      return NextResponse.json({ ok: false, error: "Card not found." }, { status: 404 });
    }
    if (card.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: `Card is not active (${card.status}).` },
        { status: 400 },
      );
    }

    const reference = `TOPUP-${randomUUID()}`;
    const updated = await prisma.$transaction(async (tx) => {
      const nextCard = await tx.debitCard.update({
        where: { id: card.id },
        data: {
          availableBalanceCents: {
            increment: amountCents,
          },
        },
      });
      await tx.debitCardTransaction.create({
        data: {
          cardId: card.id,
          userId: user.id,
          type: "TOP_UP",
          status: "SETTLED",
          amountCents,
          reference,
          description: `Card top-up from ${payload.source_asset ?? "crypto balance"}`,
          metadata: {
            source_asset: payload.source_asset ?? null,
          },
          settledAt: new Date(),
        },
      });
      return nextCard;
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "card.topup",
      severity: "medium",
      metadata: {
        card_id: card.id,
        amount_usd: payload.amount_usd,
        reference,
      },
    });

    return NextResponse.json({
      ok: true,
      reference,
      new_balance_usd: centsToUsd(updated.availableBalanceCents),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to top up card.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

