import { NextResponse } from "next/server";
import { assertAdminToken } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { adminCardStatusSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await assertAdminToken();
    const { id } = await context.params;
    const payload = adminCardStatusSchema.parse(await request.json());

    const existing = await prisma.debitCard.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Card not found." }, { status: 404 });
    }

    const nextStatus = payload.status;
    const card = await prisma.debitCard.update({
      where: { id },
      data: {
        status: nextStatus,
        freezeReason:
          nextStatus === "FROZEN" || nextStatus === "BLOCKED"
            ? payload.freeze_reason ?? "Updated by admin"
            : null,
      },
    });

    await logSecurityEvent({
      userId: existing.userId,
      eventType: "card.admin_status_update",
      severity: "high",
      metadata: {
        card_id: id,
        status: payload.status,
        freeze_reason: payload.freeze_reason ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      status: card.status,
      freeze_reason: card.freezeReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update card.";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

