import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leadProfileSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = leadProfileSchema.parse(await request.json());

    const profile = await prisma.leadProfile.upsert({
      where: { userId: user.id },
      update: {
        phone: payload.phone,
        country: payload.country,
        preferredDesk: payload.preferred_desk,
        notes: payload.notes,
      },
      create: {
        userId: user.id,
        phone: payload.phone,
        country: payload.country,
        preferredDesk: payload.preferred_desk,
        notes: payload.notes,
      },
    });

    return NextResponse.json({ ok: true, lead_profile: profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected profile save error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

