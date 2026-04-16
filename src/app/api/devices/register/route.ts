import { NextResponse } from "next/server";
import { AdminAction, DevicePlatform } from "@prisma/client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { registerDeviceSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = registerDeviceSchema.parse(await request.json());

    const existing = await prisma.device.findFirst({
      where: {
        userId: user.id,
        deviceFingerprint: payload.device_fingerprint,
      },
    });

    const device = existing
      ? await prisma.device.update({
          where: { id: existing.id },
          data: {
            label: payload.label,
            platform: payload.platform as DevicePlatform,
            ipAddress: payload.ip_address,
            status: "ACTIVE",
            lastSeenAt: new Date(),
          },
        })
      : await prisma.device.create({
          data: {
            userId: user.id,
            label: payload.label,
            platform: payload.platform as DevicePlatform,
            deviceFingerprint: payload.device_fingerprint,
            ipAddress: payload.ip_address,
            lastSeenAt: new Date(),
          },
        });

    await prisma.adminAuditLog.create({
      data: {
        subjectUserId: user.id,
        action: AdminAction.DEVICE_REGISTERED,
        metadata: {
          event: "device_registered",
          device_id: device.id,
          label: payload.label,
          platform: payload.platform,
        },
      },
    });
    await logSecurityEvent({
      userId: user.id,
      eventType: "security.device_registered",
      severity: "medium",
      metadata: {
        device_id: device.id,
        platform: payload.platform,
      },
    });

    return NextResponse.json({ ok: true, device_id: device.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
