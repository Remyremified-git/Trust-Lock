import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withdrawalAddressSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const addresses = await prisma.withdrawalAddress.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, withdrawal_addresses: addresses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load withdrawal addresses.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = withdrawalAddressSchema.parse(await request.json());

    const address = await prisma.withdrawalAddress.create({
      data: {
        userId: user.id,
        network: payload.network.toUpperCase(),
        assetSymbol: payload.asset_symbol.toUpperCase(),
        address: payload.address,
        label: payload.label,
        memoTag: payload.memo_tag,
        isVerified: false,
      },
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "withdrawal.whitelist_add_requested",
      severity: "high",
      metadata: { address_id: address.id, asset: payload.asset_symbol },
    });

    return NextResponse.json({
      ok: true,
      withdrawal_address: address,
      next_step: "verify_address",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add withdrawal address.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

