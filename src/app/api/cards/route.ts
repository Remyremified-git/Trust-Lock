import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { cardExpiry, centsToUsd, generateCardPan } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { issueCardSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

function serializeCard(card: {
  id: string;
  cardholderName: string;
  maskedPan: string;
  last4: string;
  network: string;
  status: string;
  currency: string;
  isVirtual: boolean;
  availableBalanceCents: number;
  dailySpendLimitCents: number;
  monthlySpendLimitCents: number;
  spentTodayCents: number;
  spentMonthCents: number;
  freezeReason: string | null;
  expiresMonth: number;
  expiresYear: number;
  createdAt: Date;
}) {
  return {
    id: card.id,
    cardholder_name: card.cardholderName,
    masked_pan: card.maskedPan,
    last4: card.last4,
    network: card.network,
    status: card.status,
    currency: card.currency,
    is_virtual: card.isVirtual,
    available_balance_usd: centsToUsd(card.availableBalanceCents),
    daily_spend_limit_usd: centsToUsd(card.dailySpendLimitCents),
    monthly_spend_limit_usd: centsToUsd(card.monthlySpendLimitCents),
    spent_today_usd: centsToUsd(card.spentTodayCents),
    spent_month_usd: centsToUsd(card.spentMonthCents),
    freeze_reason: card.freezeReason,
    expires_month: card.expiresMonth,
    expires_year: card.expiresYear,
    created_at: card.createdAt,
  };
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const cards = await prisma.debitCard.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      cards: cards.map(serializeCard),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cards.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = issueCardSchema.parse(await request.json());
    const pan = generateCardPan(payload.network);
    const expiry = cardExpiry();

    const card = await prisma.debitCard.create({
      data: {
        userId: user.id,
        cardholderName: payload.cardholder_name,
        maskedPan: pan.maskedPan,
        last4: pan.last4,
        network: payload.network,
        status: "ACTIVE",
        isVirtual: payload.is_virtual,
        expiresMonth: expiry.month,
        expiresYear: expiry.year,
        lastLimitResetAt: new Date(),
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "card.issued",
      severity: "medium",
      metadata: {
        card_id: card.id,
        network: card.network,
        is_virtual: card.isVirtual,
      },
    });

    return NextResponse.json({
      ok: true,
      card: serializeCard(card),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue card.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

