import { NextResponse } from "next/server";
import { CardIssueStatus } from "@prisma/client";
import { assertAdminToken } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

function parseStatus(value: string | null): CardIssueStatus | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (
    normalized === "OPEN" ||
    normalized === "IN_REVIEW" ||
    normalized === "RESOLVED" ||
    normalized === "REJECTED"
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

    const issues = await prisma.cardIssueTicket.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
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
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      issues: issues.map((item) => ({
        id: item.id,
        user_id: item.userId,
        user_email: item.user.email,
        user_display_name: item.user.displayName,
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
        card: item.card,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load issues.";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

