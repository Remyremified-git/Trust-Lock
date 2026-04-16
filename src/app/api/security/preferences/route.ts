import { NextResponse } from "next/server";
import { AdminAction } from "@prisma/client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { securityPrefsSchema } from "@/lib/schemas";
import { logSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const payload = securityPrefsSchema.parse(await request.json());

    const prefs = await prisma.userSecurityPref.upsert({
      where: { userId: user.id },
      update: {
        riskThreshold: payload.risk_threshold,
        firewallEnabled: payload.firewall_enabled,
        timeDelayEnabled: payload.time_delay_enabled,
        trustedContacts: payload.trusted_contacts,
        decoyModeEnabled: payload.decoy_mode_enabled,
        adminSeedAccess: payload.admin_seed_access,
        allowHighRiskWithdraw: payload.allow_high_risk_withdraw,
      },
      create: {
        userId: user.id,
        riskThreshold: payload.risk_threshold,
        firewallEnabled: payload.firewall_enabled,
        timeDelayEnabled: payload.time_delay_enabled,
        trustedContacts: payload.trusted_contacts,
        decoyModeEnabled: payload.decoy_mode_enabled,
        adminSeedAccess: payload.admin_seed_access,
        allowHighRiskWithdraw: payload.allow_high_risk_withdraw,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        subjectUserId: user.id,
        action: AdminAction.PREFS_UPDATED,
        metadata: {
          event: "security_preferences_updated",
          risk_threshold: payload.risk_threshold,
        },
      },
    });
    await logSecurityEvent({
      userId: user.id,
      eventType: "security.preferences_updated",
      severity: "medium",
      metadata: {
        risk_threshold: payload.risk_threshold,
        firewall_enabled: payload.firewall_enabled,
      },
    });

    return NextResponse.json({ ok: true, preferences: prefs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
