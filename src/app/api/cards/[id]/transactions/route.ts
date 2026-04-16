import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { centsToUsd } from "@/lib/cards";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;

    const card = await prisma.debitCard.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: { id: true },
    });
    if (!card) {
      return NextResponse.json({ ok: false, error: "Card not found." }, { status: 404 });
    }

    const transactions = await prisma.debitCardTransaction.findMany({
      where: {
        cardId: card.id,
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      ok: true,
      transactions: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        status: item.status,
        amount_usd: centsToUsd(item.amountCents),
        merchant_name: item.merchantName,
        description: item.description,
        reference: item.reference,
        decline_reason: item.declineReason,
        created_at: item.createdAt,
        settled_at: item.settledAt,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load card transactions.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

