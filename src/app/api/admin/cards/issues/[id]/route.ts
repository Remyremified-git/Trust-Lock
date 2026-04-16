import { NextResponse } from "next/server";
import { assertAdminToken } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { adminCardIssueUpdateSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await assertAdminToken();
    const { id } = await context.params;
    const payload = adminCardIssueUpdateSchema.parse(await request.json());

    const existing = await prisma.cardIssueTicket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Issue ticket not found." }, { status: 404 });
    }

    const updated = await prisma.cardIssueTicket.update({
      where: { id },
      data: {
        status: payload.status,
        resolutionNote: payload.resolution_note ?? null,
        adminNote: payload.admin_note ?? null,
        resolvedAt:
          payload.status === "RESOLVED" || payload.status === "REJECTED"
            ? new Date()
            : null,
      },
    });

    await logSecurityEvent({
      userId: existing.userId,
      eventType: "card.issue_admin_update",
      severity: "medium",
      metadata: {
        issue_id: id,
        status: payload.status,
      },
    });

    return NextResponse.json({
      ok: true,
      issue: {
        id: updated.id,
        status: updated.status,
        resolution_note: updated.resolutionNote,
        admin_note: updated.adminNote,
        resolved_at: updated.resolvedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update issue.";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

