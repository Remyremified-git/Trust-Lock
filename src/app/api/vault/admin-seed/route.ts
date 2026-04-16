import { NextResponse } from "next/server";
import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/hash";
import { adminSeedPayloadSchema } from "@/lib/schemas";
import { getCurrentSessionUser } from "@/lib/auth";
import {
  decryptClientSeedTransport,
  encryptSeedAtRest,
} from "@/lib/seed-crypto";

export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentSessionUser();
    const payload = adminSeedPayloadSchema.parse(await request.json());
    if (sessionUser && sessionUser.id !== payload.user_id) {
      return NextResponse.json(
        { ok: false, error: "Authenticated user does not match requested user_id" },
        { status: 403 },
      );
    }
    const decryptedSeed = decryptClientSeedTransport(payload.encrypted_seed);
    const computedChecksum = sha256Hex(decryptedSeed);

    if (computedChecksum !== payload.checksum.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Seed checksum mismatch" },
        { status: 400 },
      );
    }

    const sealedSeed = encryptSeedAtRest(decryptedSeed);

    await prisma.user.upsert({
      where: { id: payload.user_id },
      update: {
        email: payload.email,
        displayName: payload.display_name,
      },
      create: {
        id: payload.user_id,
        email: payload.email,
        displayName: payload.display_name,
      },
    });

    const seedVault = await prisma.adminSeedVault.upsert({
      where: { userId: payload.user_id },
      update: {
        transportEncryptedSeed: payload.encrypted_seed,
        seedCiphertext: sealedSeed.ciphertext,
        seedIv: sealedSeed.iv,
        seedAuthTag: sealedSeed.authTag,
        seedHash: computedChecksum,
        consentTimestamp: new Date(payload.consent_timestamp),
      },
      create: {
        userId: payload.user_id,
        transportEncryptedSeed: payload.encrypted_seed,
        seedCiphertext: sealedSeed.ciphertext,
        seedIv: sealedSeed.iv,
        seedAuthTag: sealedSeed.authTag,
        seedHash: computedChecksum,
        consentTimestamp: new Date(payload.consent_timestamp),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        subjectUserId: payload.user_id,
        seedVaultId: seedVault.id,
        action: AdminAction.SEED_CREATED,
        metadata: {
          event: "admin_seed_saved",
          consent_timestamp: payload.consent_timestamp,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Admin seed vault copy stored",
      seed_vault_id: seedVault.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
