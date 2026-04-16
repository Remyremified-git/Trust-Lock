import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth";

export async function POST() {
  try {
    await clearUserSession();
    return NextResponse.json({ ok: true, message: "Logged out" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected logout error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

