import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { centsToUsd, normalizeCardCounters, usdToCents } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { cardSpendSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const payload = cardSpendSchema.parse(await request.json());
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

    const reference = `SPEND-${randomUUID()}`;
    const counters = normalizeCardCounters(card);
    const dailyAfter = counters.spentTodayCents + amountCents;
    const monthlyAfter = counters.spentMonthCents + amountCents;

    let declineReason: string | null = null;
    if (card.status !== "ACTIVE") {
      declineReason = `Card is ${card.status}`;
    } else if (card.availableBalanceCents < amountCents) {
      declineReason = "Insufficient card balance";
    } else if (dailyAfter > card.dailySpendLimitCents) {
      declineReason = "Daily card spend limit exceeded";
    } else if (monthlyAfter > card.monthlySpendLimitCents) {
      declineReason = "Monthly card spend limit exceeded";
    }

    if (declineReason) {
      await prisma.debitCardTransaction.create({
        data: {
          cardId: card.id,
          userId: user.id,
          type: "SPEND",
          status: "DECLINED",
          amountCents,
          merchantName: payload.merchant_name,
          description: payload.description,
          reference,
          declineReason,
        },
      });
      await logSecurityEvent({
        userId: user.id,
        eventType: "card.spend_declined",
        severity: "medium",
        metadata: {
          card_id: card.id,
          decline_reason: declineReason,
          amount_usd: payload.amount_usd,
          merchant: payload.merchant_name,
          reference,
        },
      });
      return NextResponse.json(
        { ok: false, error: declineReason, reference },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextCard = await tx.debitCard.update({
        where: { id: card.id },
        data: {
          availableBalanceCents: {
            decrement: amountCents,
          },
          spentTodayCents: dailyAfter,
          spentMonthCents: monthlyAfter,
          lastLimitResetAt: counters.lastLimitResetAt,
        },
      });

      await tx.debitCardTransaction.create({
        data: {
          cardId: card.id,
          userId: user.id,
          type: "SPEND",
          status: "SETTLED",
          amountCents,
          merchantName: payload.merchant_name,
          description: payload.description,
          reference,
          settledAt: new Date(),
        },
      });
      return nextCard;
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "card.spend_settled",
      severity: "medium",
      metadata: {
        card_id: card.id,
        amount_usd: payload.amount_usd,
        merchant: payload.merchant_name,
        reference,
      },
    });

    return NextResponse.json({
      ok: true,
      reference,
      amount_usd: payload.amount_usd,
      new_balance_usd: centsToUsd(updated.availableBalanceCents),
      spent_today_usd: centsToUsd(updated.spentTodayCents),
      spent_month_usd: centsToUsd(updated.spentMonthCents),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process spend.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

