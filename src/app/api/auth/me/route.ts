import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const [linkedCount, apiCredentialCount, whitelistCount, passkeyCount, recentEvents] =
      await Promise.all([
        prisma.linkedAccount.count({ where: { userId: user.id } }),
        prisma.exchangeApiCredential.count({ where: { userId: user.id } }),
        prisma.withdrawalAddress.count({ where: { userId: user.id } }),
        prisma.webauthnCredential.count({ where: { userId: user.id } }),
        prisma.securityEvent.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            eventType: true,
            severity: true,
            createdAt: true,
          },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        email_verified_at: user.emailVerifiedAt,
        display_name: user.displayName,
        role: user.role,
        mfa_enabled: user.mfaEnabled,
        anti_phishing_code: user.antiPhishingCode ?? null,
        created_at: user.createdAt,
        last_login_at: user.lastLoginAt,
        lead_profile: user.leadProfile,
        security_prefs: user.securityPrefs,
        active_devices: user.devices,
        linked_account_count: linkedCount,
        api_credential_count: apiCredentialCount,
        withdrawal_address_count: whitelistCount,
        passkey_count: passkeyCount,
        recent_security_events: recentEvents,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected profile error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
