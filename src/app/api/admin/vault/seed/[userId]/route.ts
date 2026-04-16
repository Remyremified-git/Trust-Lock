import { NextResponse } from "next/server";
import { AdminAction } from "@prisma/client";
import { assertAdminToken } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { decryptSeedAtRest } from "@/lib/seed-crypto";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await assertAdminToken();
    const { userId } = await context.params;

    const seedVault = await prisma.adminSeedVault.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!seedVault) {
      return NextResponse.json(
        { ok: false, error: "Seed vault entry not found" },
        { status: 404 },
      );
    }

    const seed = decryptSeedAtRest({
      ciphertext: seedVault.seedCiphertext,
      iv: seedVault.seedIv,
      authTag: seedVault.seedAuthTag,
    });

    await prisma.adminSeedVault.update({
      where: { userId },
      data: { lastAccessed: new Date() },
    });

    await prisma.adminAuditLog.create({
      data: {
        subjectUserId: userId,
        seedVaultId: seedVault.id,
        action: AdminAction.SEED_VIEWED,
        metadata: { event: "admin_seed_viewed" },
      },
    });

    return NextResponse.json({
      ok: true,
      user_id: seedVault.userId,
      email: seedVault.user.email,
      seed_phrase: seed,
      consent_timestamp: seedVault.consentTimestamp,
      created_at: seedVault.createdAt,
      last_accessed: seedVault.lastAccessed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await assertAdminToken();
    const { userId } = await context.params;

    const existing = await prisma.adminSeedVault.findUnique({
      where: { userId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Seed vault entry not found" },
        { status: 404 },
      );
    }

    await prisma.adminSeedVault.delete({ where: { userId } });
    await prisma.adminAuditLog.create({
      data: {
        subjectUserId: userId,
        seedVaultId: existing.id,
        action: AdminAction.SEED_DELETED,
        metadata: { event: "admin_seed_deleted" },
      },
    });

    return NextResponse.json({ ok: true, message: "Admin seed copy deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

