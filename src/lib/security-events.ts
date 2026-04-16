import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logSecurityEvent(input: {
  userId: string;
  eventType: string;
  severity?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}) {
  await prisma.securityEvent.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      severity: input.severity ?? "medium",
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
