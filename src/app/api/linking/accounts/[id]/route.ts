import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateLinkedWalletSchema = z.object({
  account_label: z.string().trim().min(2).max(80),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const payload = updateLinkedWalletSchema.parse(await request.json());

    const existing = await prisma.linkedAccount.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        providerType: true,
        providerName: true,
        accountLabel: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Linked wallet not found." }, { status: 404 });
    }

    const linked = await prisma.linkedAccount.update({
      where: { id: existing.id },
      data: {
        accountLabel: payload.account_label,
      },
      select: {
        id: true,
        providerType: true,
        providerName: true,
        accountLabel: true,
        accountReference: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "linking.account_label_updated",
      severity: "low",
      metadata: {
        linked_account_id: linked.id,
        provider: linked.providerName,
        previous_label: existing.accountLabel,
        next_label: linked.accountLabel,
      },
    });

    return NextResponse.json({ ok: true, linked_account: linked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update linked wallet.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

