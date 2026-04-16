import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardIssueTicketSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const tickets = await prisma.cardIssueTicket.findMany({
      where: {
        userId: user.id,
      },
      include: {
        card: {
          select: {
            id: true,
            last4: true,
            network: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      ok: true,
      tickets: tickets.map((item) => ({
        id: item.id,
        card_id: item.cardId,
        issue_type: item.issueType,
        status: item.status,
        subject: item.subject,
        description: item.description,
        resolution_note: item.resolutionNote,
        admin_note: item.adminNote,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        resolved_at: item.resolvedAt,
        card: item.card
          ? {
              id: item.card.id,
              last4: item.card.last4,
              network: item.card.network,
              status: item.card.status,
            }
          : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load card issues.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = cardIssueTicketSchema.parse(await request.json());

    if (payload.card_id) {
      const card = await prisma.debitCard.findFirst({
        where: {
          id: payload.card_id,
          userId: user.id,
        },
        select: { id: true },
      });
      if (!card) {
        return NextResponse.json(
          { ok: false, error: "Referenced card not found." },
          { status: 404 },
        );
      }
    }

    const ticket = await prisma.cardIssueTicket.create({
      data: {
        userId: user.id,
        cardId: payload.card_id ?? null,
        issueType: payload.issue_type,
        subject: payload.subject,
        description: payload.description,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "card.issue_created",
      severity: "medium",
      metadata: {
        issue_id: ticket.id,
        issue_type: payload.issue_type,
        card_id: payload.card_id ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      issue: {
        id: ticket.id,
        status: ticket.status,
        created_at: ticket.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create card issue.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

