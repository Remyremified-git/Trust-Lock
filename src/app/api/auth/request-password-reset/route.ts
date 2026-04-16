import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { passwordResetRequestSchema } from "@/lib/schemas";
import { issuePasswordResetToken } from "@/lib/account-security";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = await checkRateLimit({
      key: `password-reset-request:${ip}`,
      max: 8,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Try again shortly." },
        { status: 429 },
      );
    }

    const payload = passwordResetRequestSchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (user && user.email) {
      await issuePasswordResetToken(user.id, user.email);
    }

    return NextResponse.json({
      ok: true,
      message:
        "If this account exists, a password reset link has been sent to the email.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to issue password reset token.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

