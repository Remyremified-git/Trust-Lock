import { NextResponse } from "next/server";
import { AdminAction } from "@prisma/client";
import { getCurrentSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { backupPayloadSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentSessionUser();
    const payload = backupPayloadSchema.parse(await request.json());
    if (sessionUser && sessionUser.id !== payload.user_id) {
      return NextResponse.json(
        { ok: false, error: "Authenticated user does not match requested user_id" },
        { status: 403 },
      );
    }

    await prisma.user.upsert({
      where: { id: payload.user_id },
      update: {},
      create: { id: payload.user_id },
    });

    const backup = await prisma.vaultBackup.create({
      data: {
        userId: payload.user_id,
        encryptedBlob: payload.encrypted_blob,
        seedPhraseEncryptedForAdmin: payload.seed_phrase_encrypted_for_admin,
        encryptionMethod: payload.encryption_method,
        checksum: payload.checksum.toLowerCase(),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        subjectUserId: payload.user_id,
        action: AdminAction.BACKUP_CREATED,
        metadata: {
          backup_id: backup.id,
          encryption_method: payload.encryption_method,
        },
      },
    });

    return NextResponse.json({ ok: true, backup_id: backup.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
