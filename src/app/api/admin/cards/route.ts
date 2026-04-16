import { NextResponse } from "next/server";
import { CardStatus } from "@prisma/client";
import { assertAdminToken } from "@/lib/admin-auth";
import { centsToUsd } from "@/lib/cards";
import { prisma } from "@/lib/db";

function parseStatus(value: string | null): CardStatus | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (
    normalized === "PENDING_ISSUE" ||
    normalized === "ACTIVE" ||
    normalized === "FROZEN" ||
    normalized === "BLOCKED" ||
    normalized === "CLOSED"
  ) {
    return normalized;
  }
  return undefined;
}

export async function GET(request: Request) {
  try {
    await assertAdminToken();
    const { searchParams } = new URL(request.url);
    const status = parseStatus(searchParams.get("status"));
    const userId = searchParams.get("user_id") ?? undefined;
    const query = searchParams.get("query")?.trim();

    const cards = await prisma.debitCard.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(userId ? { userId } : {}),
        ...(query
          ? {
              OR: [
                { cardholderName: { contains: query, mode: "insensitive" } },
                { maskedPan: { contains: query } },
                { user: { email: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      cards: cards.map((card) => ({
        id: card.id,
        user_id: card.userId,
        user_email: card.user.email,
        user_display_name: card.user.displayName,
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
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cards.";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

