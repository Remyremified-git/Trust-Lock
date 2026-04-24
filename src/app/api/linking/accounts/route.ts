import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { linkedAccountSchema } from "@/lib/schemas";
import { sealSecret } from "@/lib/secure-store";
import { logSecurityEvent } from "@/lib/security-events";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const accounts = await prisma.linkedAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
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
    return NextResponse.json({ ok: true, linked_accounts: accounts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load linked accounts.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = linkedAccountSchema.parse(await request.json());

    const sealedToken = payload.access_token ? sealSecret(payload.access_token) : null;

    const account = await prisma.linkedAccount.create({
      data: {
        userId: user.id,
        providerType: payload.provider_type,
        providerName: payload.provider_name,
        accountLabel: payload.account_label,
        accountReference: payload.account_reference,
        encryptedAccessToken: sealedToken?.ciphertext,
        accessTokenIv: sealedToken?.iv,
        accessTokenAuthTag: sealedToken?.authTag,
        status: "PENDING",
      },
      select: {
        id: true,
        providerType: true,
        providerName: true,
        accountLabel: true,
        accountReference: true,
        status: true,
        createdAt: true,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "linking.account_added",
      severity: "medium",
      metadata: {
        provider: payload.provider_name,
        provider_type: payload.provider_type,
        linked_account_id: account.id,
      },
    });

    return NextResponse.json({ ok: true, linked_account: account });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create linked account.";
    const status = message.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
