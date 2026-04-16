import { prisma } from "@/lib/db";
import { hashToken, generateOpaqueToken, tokenExpiry } from "@/lib/tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/mailer";
import { logSecurityEvent } from "@/lib/security-events";

export async function issueEmailVerificationToken(userId: string, email: string) {
  const token = generateOpaqueToken(32);
  const tokenHash = hashToken(token);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: tokenExpiry(60),
    },
  });

  const result = await sendVerificationEmail({ email, token });
  await logSecurityEvent({
    userId,
    eventType: "security.email_verification_issued",
    severity: "low",
    metadata: { delivered: result.delivered },
  });
  return result;
}

export async function issuePasswordResetToken(userId: string, email: string) {
  const token = generateOpaqueToken(32);
  const tokenHash = hashToken(token);
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: tokenExpiry(20),
    },
  });
  const result = await sendPasswordResetEmail({ email, token });
  await logSecurityEvent({
    userId,
    eventType: "security.password_reset_requested",
    severity: "medium",
    metadata: { delivered: result.delivered },
  });
  return result;
}

